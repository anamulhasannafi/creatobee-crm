import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { businessSettings, uploadedFiles } from "@/db/schema";
import { generateLocalQrCode, LocalQrOptions } from "@/lib/qr-engine";
import { logDiagnosticEvent } from "@/lib/crypto-auth";
import { ensureDatabaseSeeded } from "@/lib/seed-and-init";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  await ensureDatabaseSeeded();

  try {
    const body = await req.json();
    const action = body.action || "generate";

    const [currentSettings] = await db.select().from(businessSettings).limit(1);

    if (action === "upload_qr_image") {
      const dataUri = (body.dataUri || "").trim();
      const fileName = (body.fileName || "custom-qr-upload.png").replace(/[^a-zA-Z0-9._-]/g, "_");
      const qrLabel = (body.qrLabel || currentSettings?.qrLabel || "Scan to Pay / Verify").trim();
      const qrPlacement = body.qrPlacement || currentSettings?.qrPlacement || "BOTTOM_RIGHT";

      if (!dataUri.startsWith("data:image/")) {
        await logDiagnosticEvent({
          level: "WARN",
          category: "QR_PDF",
          diagnosticCode: "QR_UPLOAD_INVALID_MIME",
          message: `Rejected QR upload '${fileName}': Invalid image MIME type.`,
        });
        return NextResponse.json(
          {
            success: false,
            error: "Uploaded QR must be a valid PNG, JPEG, or SVG image Data URI.",
          },
          { status: 400 }
        );
      }

      const [fileRec] = await db
        .insert(uploadedFiles)
        .values({
          fileName,
          safeStorageName: `qr_${Date.now()}_${fileName}`,
          category: "QR_CODE",
          mimeType: dataUri.substring(5, dataUri.indexOf(";")) || "image/png",
          sizeBytes: dataUri.length,
          storagePath: `./storage/uploads/qr_${Date.now()}_${fileName}`,
          dataUri,
          isPublic: true,
          uploadedBy: "Administrator",
        })
        .returning();

      if (currentSettings) {
        await db
          .update(businessSettings)
          .set({
            qrMode: "UPLOADED_IMAGE",
            qrDataUri: dataUri,
            qrLabel,
            qrPlacement,
            qrEnabledOnInvoices: body.qrEnabledOnInvoices ?? true,
            updatedAt: new Date(),
          })
          .where(eq(businessSettings.id, currentSettings.id));
      }

      await logDiagnosticEvent({
        level: "INFO",
        category: "QR_PDF",
        diagnosticCode: "QR_IMAGE_UPLOADED",
        message: `Custom QR image '${fileName}' validated and saved for invoice embedding.`,
      });

      return NextResponse.json({
        success: true,
        qrMode: "UPLOADED_IMAGE",
        dataUri,
        qrLabel,
        qrPlacement,
        fileRecord: fileRec,
      });
    }

    if (action === "remove_qr") {
      if (currentSettings) {
        await db
          .update(businessSettings)
          .set({
            qrEnabledOnInvoices: false,
            updatedAt: new Date(),
          })
          .where(eq(businessSettings.id, currentSettings.id));
      }
      return NextResponse.json({
        success: true,
        qrEnabledOnInvoices: false,
        message: "QR code disabled on future invoices.",
      });
    }

    // Default action: generate local QR via Node.js `qrcode` library
    const options: LocalQrOptions = {
      contentType: body.contentType || "INVOICE_VERIFICATION",
      rawInput: body.rawInput || "https://creatobee.com/verify",
      invoiceNumber: body.invoiceNumber || "CB-INV-2026-001",
      amountFormatted: body.amountFormatted || "1,000.00",
      currency: body.currency || "USD",
      darkColor: body.darkColor || "#0A0D14",
      lightColor: body.lightColor || "#FFFFFF",
    };

    const result = await generateLocalQrCode(options);

    if (!result.success) {
      await logDiagnosticEvent({
        level: "WARN",
        category: "QR_PDF",
        diagnosticCode: "QR_GENERATION_VALIDATION_ERR",
        message: `Local QR generation blocked invalid content: ${result.error}`,
      });
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      );
    }

    if (body.saveToSettings && currentSettings) {
      await db
        .update(businessSettings)
        .set({
          qrMode: "LOCAL_GENERATED",
          qrContentType: options.contentType,
          qrContent: options.rawInput,
          qrDataUri: result.dataUri,
          qrLabel: body.qrLabel || currentSettings.qrLabel,
          qrPlacement: body.qrPlacement || currentSettings.qrPlacement,
          qrEnabledOnInvoices: body.qrEnabledOnInvoices ?? true,
          updatedAt: new Date(),
        })
        .where(eq(businessSettings.id, currentSettings.id));

      await logDiagnosticEvent({
        level: "INFO",
        category: "QR_PDF",
        diagnosticCode: "QR_LOCAL_SAVED",
        message: `Local QR Code (${options.contentType}) generated and persisted to Settings Control Center.`,
      });
    }

    return NextResponse.json({
      success: true,
      qrMode: "LOCAL_GENERATED",
      formattedPayload: result.formattedPayload,
      dataUri: result.dataUri,
      svgString: result.svgString,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "QR generation failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
