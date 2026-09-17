import { jsPDF } from "jspdf";
import { formatMinorCurrency } from "./accounting";

export interface PdfInvoiceData {
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  adjustmentsMinor: number;
  totalMinor: number;
  paidMinor: number;
  outstandingMinor: number;
  exchangeRateSnapshot: number;
  qrDataUriSnapshot?: string | null;
  qrContentSnapshot?: string | null;
  qrLabelSnapshot?: string | null;
  qrPlacementSnapshot?: string | null;
  notes?: string | null;
  items: Array<{
    description: string;
    quantity: number;
    unitPriceMinor: number;
    totalMinor: number;
  }>;
}

export interface PdfClientData {
  name: string;
  company: string;
  email: string;
  phone: string;
  address?: string | null;
  taxNumber?: string | null;
}

export interface PdfBusinessSettings {
  businessName: string;
  tagline: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  taxId: string;
  qrEnabledOnInvoices: boolean;
  qrDataUri?: string | null;
  qrLabel?: string | null;
  qrPlacement?: string | null;
  invoiceFooterNote?: string | null;
}

export function downloadInvoicePdf(
  invoice: PdfInvoiceData,
  client: PdfClientData,
  settings: PdfBusinessSettings
): { success: boolean; fileName: string; qrEmbedded: boolean; error?: string } {
  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const cur = invoice.currency || "USD";
    const qrUri = invoice.qrDataUriSnapshot || settings.qrDataUri || "";
    const qrEnabled = settings.qrEnabledOnInvoices !== false && Boolean(qrUri);
    const placement = invoice.qrPlacementSnapshot || settings.qrPlacement || "BOTTOM_RIGHT";

    // Header Accent Bar
    doc.setFillColor(11, 15, 23);
    doc.rect(0, 0, 210, 42, "F");

    doc.setFillColor(245, 158, 11);
    doc.rect(0, 42, 210, 2, "F");

    // Agency Identity
    doc.setTextColor(249, 250, 251);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(settings.businessName || "Creato Bee Digital Agency", 14, 16);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(209, 213, 219);
    doc.text(settings.tagline || "Enterprise Performance Marketing & Creative ERP", 14, 22);
    doc.text(`${settings.address}`, 14, 28);
    doc.text(`${settings.email}  |  ${settings.phone}  |  Tax/BIN: ${settings.taxId}`, 14, 34);

    // Invoice Title & Status Badge (Right or Left depending on TOP_RIGHT QR)
    doc.setTextColor(245, 158, 11);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    if (qrEnabled && placement === "TOP_RIGHT") {
      doc.text(`INVOICE #${invoice.invoiceNumber}`, 125, 15, { align: "left" });
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(`Status: ${invoice.status}`, 125, 21);
      doc.text(`Issued: ${invoice.issueDate} | Due: ${invoice.dueDate}`, 125, 27);
    } else {
      doc.text(`INVOICE`, 196, 15, { align: "right" });
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text(invoice.invoiceNumber, 196, 21, { align: "right" });
      doc.setFontSize(8.5);
      doc.text(`STATUS: ${invoice.status}`, 196, 27, { align: "right" });
      doc.text(`Issued: ${invoice.issueDate}  •  Due: ${invoice.dueDate}`, 196, 33, { align: "right" });
    }

    let qrEmbedded = false;
    if (qrEnabled && qrUri.startsWith("data:image/png")) {
      try {
        if (placement === "TOP_RIGHT") {
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(172, 6, 28, 28, 2, 2, "F");
          doc.addImage(qrUri, "PNG", 173, 7, 26, 26);
          qrEmbedded = true;
        }
      } catch {
        qrEmbedded = false;
      }
    }

    // Bill To Section
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("BILLED TO CLIENT", 14, 54);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`${client.company} (${client.name})`, 14, 60);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Email: ${client.email}   |   Phone: ${client.phone}`, 14, 65);
    if (client.address) {
      doc.text(`Address: ${client.address}`, 14, 70);
    }
    if (client.taxNumber) {
      doc.text(`Client Tax / BIN: ${client.taxNumber}`, 14, 75);
    }

    // Currency & Exchange Rate Snapshot Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(130, 50, 66, 26, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text("ACCOUNTING & CURRENCY SNAPSHOT", 134, 56);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Transaction Currency: ${cur}`, 134, 62);
    doc.text(`Locked Exchange Rate: 1 USD = ${invoice.exchangeRateSnapshot.toFixed(2)} BDT`, 134, 67);
    doc.text(`Balance Due: ${formatMinorCurrency(invoice.outstandingMinor, cur)}`, 134, 72);

    // Table Header
    let y = 86;
    doc.setFillColor(15, 23, 42);
    doc.rect(14, y, 182, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("DESCRIPTION / DELIVERABLE", 18, y + 5.5);
    doc.text("QTY", 132, y + 5.5, { align: "right" });
    doc.text("UNIT PRICE", 162, y + 5.5, { align: "right" });
    doc.text("LINE TOTAL", 192, y + 5.5, { align: "right" });

    y += 8;
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "normal");

    const items = invoice.items && invoice.items.length > 0
      ? invoice.items
      : [
          {
            description: "Agency Services & Campaign Execution",
            quantity: 1,
            unitPriceMinor: invoice.subtotalMinor,
            totalMinor: invoice.subtotalMinor,
          },
        ];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (i % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y, 182, 9, "F");
      }
      doc.setFontSize(8.5);
      doc.text(item.description.slice(0, 68), 18, y + 6);
      doc.text(String(item.quantity), 132, y + 6, { align: "right" });
      doc.text(formatMinorCurrency(item.unitPriceMinor, cur), 162, y + 6, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.text(formatMinorCurrency(item.totalMinor, cur), 192, y + 6, { align: "right" });
      doc.setFont("helvetica", "normal");
      y += 9;
    }

    doc.setDrawColor(203, 213, 225);
    doc.line(14, y + 1, 196, y + 1);
    y += 8;

    // Totals Breakdown Box
    const summaryX = 124;
    doc.setFontSize(9);
    doc.text("Subtotal:", summaryX, y);
    doc.text(formatMinorCurrency(invoice.subtotalMinor, cur), 192, y, { align: "right" });
    y += 6;

    if (invoice.discountMinor > 0) {
      doc.text("Discount:", summaryX, y);
      doc.text(`-${formatMinorCurrency(invoice.discountMinor, cur)}`, 192, y, { align: "right" });
      y += 6;
    }

    if (invoice.taxMinor > 0) {
      doc.text("Tax / VAT:", summaryX, y);
      doc.text(formatMinorCurrency(invoice.taxMinor, cur), 192, y, { align: "right" });
      y += 6;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text("Invoice Total:", summaryX, y);
    doc.text(formatMinorCurrency(invoice.totalMinor, cur), 192, y, { align: "right" });
    y += 7;

    doc.setTextColor(5, 150, 105);
    doc.text("Verified Payments Applied:", summaryX, y);
    doc.text(formatMinorCurrency(invoice.paidMinor, cur), 192, y, { align: "right" });
    y += 7;

    doc.setFillColor(254, 243, 199);
    doc.rect(summaryX - 4, y - 4.5, 76, 8, "F");
    doc.setTextColor(180, 83, 9);
    doc.setFontSize(10.5);
    doc.text("OUTSTANDING BALANCE:", summaryX, y + 1);
    doc.text(formatMinorCurrency(invoice.outstandingMinor, cur), 192, y + 1, { align: "right" });

    // Embed QR Code at Bottom Left or Bottom Right
    const qrY = Math.max(y + 18, 175);
    if (qrEnabled && qrUri.startsWith("data:image/png") && placement !== "TOP_RIGHT") {
      try {
        const qrX = placement === "BOTTOM_LEFT" ? 14 : 158;
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(qrX, qrY, 38, 44, 2, 2, "S");
        doc.addImage(qrUri, "PNG", qrX + 3, qrY + 2, 32, 32);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(30, 41, 59);
        const label = (invoice.qrLabelSnapshot || settings.qrLabel || "Scan to Verify Invoice").slice(0, 32);
        doc.text(label, qrX + 19, qrY + 38, { align: "center" });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(5.8);
        doc.setTextColor(100, 116, 139);
        doc.text("Local Node.js QR Verified", qrX + 19, qrY + 41.5, { align: "center" });
        qrEmbedded = true;
      } catch {
        qrEmbedded = false;
      }
    }

    // Authorized Signatory & Important Compliance Disclaimers
    const noteX = placement === "BOTTOM_LEFT" && qrEnabled ? 58 : 14;
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("Authorized Executive Signatory — Creato Bee Treasury", noteX, qrY + 10);
    doc.setDrawColor(148, 163, 184);
    doc.line(noteX, qrY + 12, noteX + 75, qrY + 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const footerNote =
      invoice.notes ||
      settings.invoiceFooterNote ||
      "IMPORTANT: A QR code containing a payment link does not itself confirm payment. Payment confirmation comes solely from a verified ledger entry.";
    const splitNotes = doc.splitTextToSize(footerNote, 125);
    doc.text(splitNotes, noteX, qrY + 19);

    const fileName = `${invoice.invoiceNumber}_${client.company.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
    doc.save(fileName);

    return {
      success: true,
      fileName,
      qrEmbedded,
    };
  } catch (err: unknown) {
    return {
      success: false,
      fileName: "",
      qrEmbedded: false,
      error: err instanceof Error ? err.message : "Failed to render PDF document.",
    };
  }
}
