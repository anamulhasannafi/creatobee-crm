import QRCode from "qrcode";

export interface LocalQrOptions {
  contentType: "URL" | "TEXT" | "PAYMENT_INFO" | "WHATSAPP" | "INVOICE_VERIFICATION";
  rawInput: string;
  invoiceNumber?: string;
  amountFormatted?: string;
  currency?: string;
  darkColor?: string;
  lightColor?: string;
}

export interface LocalQrResult {
  success: boolean;
  formattedPayload: string;
  dataUri: string;
  svgString: string;
  error?: string;
}

export function formatQrPayload(options: LocalQrOptions): {
  valid: boolean;
  payload: string;
  validationMessage?: string;
} {
  const cleaned = (options.rawInput || "").trim();
  if (!cleaned) {
    return {
      valid: false,
      payload: "",
      validationMessage: "QR payload cannot be empty. Provide a valid URL, WhatsApp number, or payment text.",
    };
  }

  switch (options.contentType) {
    case "WHATSAPP": {
      const digits = cleaned.replace(/[^\d+]/g, "");
      if (digits.length < 7) {
        return {
          valid: false,
          payload: cleaned,
          validationMessage: "WhatsApp QR requires a valid phone number (minimum 7 digits) or wa.me URL.",
        };
      }
      const msg = options.invoiceNumber
        ? encodeURIComponent(`Hello Creato Bee, I am inquiring regarding Invoice ${options.invoiceNumber}`)
        : encodeURIComponent("Hello Creato Bee Billing Desk");
      const url = cleaned.startsWith("http")
        ? cleaned
        : `https://wa.me/${digits.replace(/^\+/, "")}?text=${msg}`;
      return { valid: true, payload: url };
    }
    case "INVOICE_VERIFICATION": {
      const base = cleaned.startsWith("http") ? cleaned : `https://creatobee.com/verify`;
      const inv = options.invoiceNumber || "CB-INV-SAMPLE";
      const amt = options.amountFormatted || "0.00";
      const cur = options.currency || "USD";
      const payload = `${base}${base.includes("?") ? "&" : "?"}invoice=${encodeURIComponent(inv)}&amount=${encodeURIComponent(amt)}&currency=${encodeURIComponent(cur)}&note=VERIFIED_LEDGER_REQUIRED`;
      return { valid: true, payload };
    }
    case "PAYMENT_INFO": {
      const invTag = options.invoiceNumber ? ` | Invoice: ${options.invoiceNumber}` : "";
      const amtTag = options.amountFormatted ? ` | Due: ${options.currency || "USD"} ${options.amountFormatted}` : "";
      return {
        valid: true,
        payload: `CREATOBEE-PAY: ${cleaned}${invTag}${amtTag} (Payment confirmed only upon verified ledger entry)`,
      };
    }
    case "URL": {
      if (!/^https?:\/\//i.test(cleaned)) {
        return {
          valid: false,
          payload: cleaned,
          validationMessage: "URL QR requires http:// or https:// protocol prefix.",
        };
      }
      return { valid: true, payload: cleaned };
    }
    case "TEXT":
    default:
      return { valid: true, payload: cleaned };
  }
}

export async function generateLocalQrCode(options: LocalQrOptions): Promise<LocalQrResult> {
  const formatted = formatQrPayload(options);
  if (!formatted.valid) {
    return {
      success: false,
      formattedPayload: formatted.payload,
      dataUri: "",
      svgString: "",
      error: formatted.validationMessage || "Invalid QR payload content.",
    };
  }

  try {
    const dark = options.darkColor || "#0A0D14";
    const light = options.lightColor || "#FFFFFF";

    const dataUri = await QRCode.toDataURL(formatted.payload, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 280,
      color: { dark, light },
    });

    const svgString = await QRCode.toString(formatted.payload, {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 2,
      width: 240,
      color: { dark, light },
    });

    return {
      success: true,
      formattedPayload: formatted.payload,
      dataUri,
      svgString,
    };
  } catch (err: unknown) {
    return {
      success: false,
      formattedPayload: formatted.payload,
      dataUri: "",
      svgString: "",
      error: err instanceof Error ? err.message : "Local QR engine failed to encode data.",
    };
  }
}
