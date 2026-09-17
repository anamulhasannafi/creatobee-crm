"use client";

import React, { useState } from "react";
import {
  FileText,
  Download,
  QrCode,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Upload,
  Printer,
  ShieldCheck,
  DollarSign,
} from "lucide-react";
import { formatMinorCurrency } from "@/lib/accounting";
import {
  downloadInvoicePdf,
  PdfBusinessSettings,
  PdfClientData,
  PdfInvoiceData,
} from "@/lib/pdf-invoice";

interface InvoiceStudioProps {
  invoices: Array<PdfInvoiceData & { id: number; clientId: number; orderId?: number | null }>;
  clients: Array<PdfClientData & { id: number; code: string; preferredCurrency: string }>;
  settings: PdfBusinessSettings & {
    logoDataUri?: string | null;
    signatureDataUri?: string | null;
    qrMode?: string;
    qrContentType?: string;
    qrContent?: string;
    usdToBdtRate: number;
  };
  displayCurrency: "USD" | "BDT";
  onInvoiceCreated: () => Promise<void>;
  onPaymentRecorded: (invoiceId: number, amountMajor: number, currency: string, method: string) => Promise<void>;
  onQrUpdated: () => Promise<void>;
}

export function InvoiceStudioPanel({
  invoices,
  clients,
  settings,
  displayCurrency,
  onInvoiceCreated,
  onPaymentRecorded,
  onQrUpdated,
}: InvoiceStudioProps) {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number>(
    invoices[0]?.id || 0
  );
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Create Invoice Form State
  const [newClientId, setNewClientId] = useState<number>(clients[0]?.id || 1);
  const [newCurrency, setNewCurrency] = useState<"USD" | "BDT">("USD");
  const [newDiscountMajor, setNewDiscountMajor] = useState<string>("0");
  const [newTaxMajor, setNewTaxMajor] = useState<string>("0");
  const [newDueDate, setNewDueDate] = useState<string>(
    new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
  );
  const [newNotes, setNewNotes] = useState<string>(
    settings?.invoiceFooterNote ||
      "Payment confirmation requires verified ledger entry. QR code links are for convenience."
  );
  const [lineItems, setLineItems] = useState<
    Array<{ description: string; quantity: number; unitPriceMajor: number }>
  >([
    {
      description: "Full-Funnel Performance Marketing & Attribution Engineering",
      quantity: 1,
      unitPriceMajor: 2500,
    },
  ]);
  const [isCreating, setIsCreating] = useState(false);

  // Quick Payment Modal on Selected Invoice
  const [quickPayAmount, setQuickPayAmount] = useState<string>("");
  const [quickPayMethod, setQuickPayMethod] = useState<string>("Stripe Corporate");
  const [isPaying, setIsPaying] = useState(false);

  // Local QR Generator / Customizer state
  const [qrContentType, setQrContentType] = useState<string>(
    settings?.qrContentType || "INVOICE_VERIFICATION"
  );
  const [qrRawInput, setQrRawInput] = useState<string>(
    settings?.qrContent || "https://creatobee.com/verify"
  );
  const [qrLabel, setQrLabel] = useState<string>(
    settings?.qrLabel || "Scan to Verify Invoice & Payment"
  );
  const [qrPlacement, setQrPlacement] = useState<string>(
    settings?.qrPlacement || "BOTTOM_RIGHT"
  );
  const [qrEnabled, setQrEnabled] = useState<boolean>(
    settings?.qrEnabledOnInvoices !== false
  );
  const [qrPreviewUri, setQrPreviewUri] = useState<string>(
    settings?.qrDataUri || ""
  );
  const [qrFeedback, setQrFeedback] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);
  const [pdfFeedback, setPdfFeedback] = useState<string | null>(null);

  const selectedInvoice =
    invoices.find((inv) => inv.id === selectedInvoiceId) || invoices[0];
  const selectedClient =
    clients.find((c) => c.id === selectedInvoice?.clientId) ||
    clients[0] || {
      name: "Client Contact",
      company: "Enterprise Client",
      email: "billing@client.com",
      phone: "+1 000-000-0000",
    };

  const handleAddLineItem = () => {
    setLineItems([
      ...lineItems,
      { description: "Additional Creative Deliverable", quantity: 1, unitPriceMajor: 750 },
    ]);
  };

  const handleRemoveLineItem = (idx: number) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, i) => i !== idx));
  };

  const handleCreateInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const res = await fetch("/api/erp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_invoice",
          clientId: newClientId,
          currency: newCurrency,
          discountMajor: parseFloat(newDiscountMajor || "0"),
          taxMajor: parseFloat(newTaxMajor || "0"),
          dueDate: newDueDate,
          notes: newNotes,
          items: lineItems,
        }),
      });
      const data = await res.json();
      if (data.success && data.invoice) {
        await onInvoiceCreated();
        setSelectedInvoiceId(data.invoice.id);
        setShowCreateForm(false);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleGenerateLocalQr = async () => {
    setQrFeedback(null);
    const res = await fetch("/api/qr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "generate",
        contentType: qrContentType,
        rawInput: qrRawInput,
        invoiceNumber: selectedInvoice?.invoiceNumber || "CB-INV-2026-001",
        amountFormatted: selectedInvoice
          ? (selectedInvoice.outstandingMinor / 100).toFixed(2)
          : "1000.00",
        currency: selectedInvoice?.currency || "USD",
        qrLabel,
        qrPlacement,
        qrEnabledOnInvoices: qrEnabled,
        saveToSettings: true,
      }),
    });
    const data = await res.json();
    if (data.success) {
      setQrPreviewUri(data.dataUri);
      setQrFeedback({
        type: "ok",
        text: `Local Node.js QR generated & saved (${data.formattedPayload.slice(0, 48)}...)`,
      });
      await onQrUpdated();
    } else {
      setQrFeedback({
        type: "err",
        text: data.error || "Invalid QR payload.",
      });
    }
  };

  const handleUploadQrFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUri = String(reader.result || "");
      const res = await fetch("/api/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upload_qr_image",
          fileName: file.name,
          dataUri,
          qrLabel,
          qrPlacement,
          qrEnabledOnInvoices: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setQrPreviewUri(data.dataUri);
        setQrEnabled(true);
        setQrFeedback({
          type: "ok",
          text: `Uploaded custom QR image '${file.name}' and bound to invoices.`,
        });
        await onQrUpdated();
      } else {
        setQrFeedback({
          type: "err",
          text: data.error || "Failed to validate uploaded QR image.",
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadPdf = () => {
    if (!selectedInvoice) return;
    const result = downloadInvoicePdf(
      {
        ...selectedInvoice,
        qrDataUriSnapshot:
          qrPreviewUri || selectedInvoice.qrDataUriSnapshot || settings.qrDataUri,
        qrLabelSnapshot: qrLabel,
        qrPlacementSnapshot: qrPlacement,
      },
      selectedClient,
      {
        ...settings,
        qrEnabledOnInvoices: qrEnabled,
        qrDataUri: qrPreviewUri || settings.qrDataUri,
        qrLabel,
        qrPlacement,
      }
    );
    if (result.success) {
      setPdfFeedback(
        `Downloaded ${result.fileName} (${
          result.qrEmbedded ? "Embedded Local PNG QR Verified" : "No QR Enabled"
        })`
      );
      setTimeout(() => setPdfFeedback(null), 6000);
    }
  };

  const handleQuickPartialPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || !quickPayAmount) return;
    setIsPaying(true);
    try {
      await onPaymentRecorded(
        selectedInvoice.id,
        parseFloat(quickPayAmount),
        selectedInvoice.currency,
        quickPayMethod
      );
      setQuickPayAmount("");
    } finally {
      setIsPaying(false);
    }
  };

  const activeQrUri =
    qrPreviewUri ||
    selectedInvoice?.qrDataUriSnapshot ||
    settings?.qrDataUri ||
    "";

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-[#111827] p-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-amber-400" />
            Professional Invoice Generator &amp; Local QR PDF Studio
          </h2>
          <p className="text-xs text-slate-400">
            Zero-External-API QR Generation • Decimal-Safe Balance Invariant (Total − Paid = Outstanding) • Embedded A4 PDF Export
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            {showCreateForm ? "Close Invoice Builder" : "New Multi-Currency Invoice"}
          </button>

          {selectedInvoice && (
            <>
              <button
                onClick={handleDownloadPdf}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 transition cursor-pointer"
              >
                <Download className="h-4 w-4" />
                Download PDF (Embedded QR)
              </button>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 transition cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                Print A4
              </button>
            </>
          )}
        </div>
      </div>

      {pdfFeedback && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{pdfFeedback}</span>
        </div>
      )}

      {/* Collapsible New Invoice Builder */}
      {showCreateForm && (
        <form
          onSubmit={handleCreateInvoiceSubmit}
          className="rounded-xl border border-amber-500/40 bg-[#111827] p-6 space-y-5 shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400">
              Create New Invoice (Auto-Generates Local QR Snapshot)
            </h3>
            <span className="text-xs font-mono-num text-slate-400">
              Active Snapshot Rate: 1 USD = {settings.usdToBdtRate.toFixed(2)} BDT
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Select Client CRM
              </label>
              <select
                value={newClientId}
                onChange={(e) => setNewClientId(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company} ({c.preferredCurrency})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Invoice Currency
              </label>
              <select
                value={newCurrency}
                onChange={(e) => setNewCurrency(e.target.value as "USD" | "BDT")}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
              >
                <option value="USD">USD ($ US Dollar)</option>
                <option value="BDT">BDT (৳ Bangladeshi Taka)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Discount ({newCurrency})
              </label>
              <input
                type="number"
                step="0.01"
                value={newDiscountMajor}
                onChange={(e) => setNewDiscountMajor(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono-num text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Deliverables &amp; Line Items
              </label>
              <button
                type="button"
                onClick={handleAddLineItem}
                className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Add Line Item
              </button>
            </div>

            {lineItems.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => {
                    const copy = [...lineItems];
                    copy[idx].description = e.target.value;
                    setLineItems(copy);
                  }}
                  placeholder="Service deliverable description"
                  className="col-span-7 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                  required
                />
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => {
                    const copy = [...lineItems];
                    copy[idx].quantity = Number(e.target.value);
                    setLineItems(copy);
                  }}
                  className="col-span-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono-num text-white"
                  required
                />
                <input
                  type="number"
                  step="0.01"
                  value={item.unitPriceMajor}
                  onChange={(e) => {
                    const copy = [...lineItems];
                    copy[idx].unitPriceMajor = Number(e.target.value);
                    setLineItems(copy);
                  }}
                  className="col-span-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono-num text-white"
                  required
                />
                <button
                  type="button"
                  onClick={() => handleRemoveLineItem(idx)}
                  className="col-span-1 flex justify-center text-slate-400 hover:text-rose-400 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="rounded-lg border border-slate-700 px-4 py-2 text-xs text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="rounded-lg bg-amber-500 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer"
            >
              {isCreating ? "Generating Invoice & Local QR..." : "Generate Verified Invoice"}
            </button>
          </div>
        </form>
      )}

      {/* Split Workspace: Left Controls + Invoice Selector | Right Live A4 Paper Sheet */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 Cols): Invoice Selector, Partial Payment Ledger & Local QR Customizer */}
        <div className="lg:col-span-5 space-y-5">
          {/* Invoice List */}
          <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Select Invoice to Inspect / Export ({invoices.length})
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {invoices.map((inv) => {
                const cl = clients.find((c) => c.id === inv.clientId);
                const active = inv.id === selectedInvoice?.id;
                return (
                  <button
                    key={inv.id}
                    onClick={() => setSelectedInvoiceId(inv.id)}
                    className={`w-full text-left rounded-lg border p-3 transition cursor-pointer ${
                      active
                        ? "border-amber-500 bg-amber-500/10"
                        : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono-num text-xs font-bold text-white">
                        {inv.invoiceNumber}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          inv.status === "PAID"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : inv.status === "PARTIALLY_PAID"
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-rose-500/20 text-rose-300"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
                      <span>{cl?.company || "Enterprise Client"}</span>
                      <span className="font-mono-num font-semibold text-slate-200">
                        {formatMinorCurrency(inv.totalMinor, inv.currency)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] font-mono-num text-slate-400">
                      <span>Paid: {formatMinorCurrency(inv.paidMinor, inv.currency)}</span>
                      <span className="text-amber-400">
                        Due: {formatMinorCurrency(inv.outstandingMinor, inv.currency)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Record Partial or Full Payment against Selected Invoice */}
          {selectedInvoice && selectedInvoice.outstandingMinor > 0 && (
            <form
              onSubmit={handleQuickPartialPayment}
              className="rounded-xl border border-emerald-500/30 bg-[#111827] p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4" />
                  Apply Partial or Full Payment ({selectedInvoice.invoiceNumber})
                </h3>
                <span className="text-[11px] font-mono-num text-slate-400">
                  Due: {formatMinorCurrency(selectedInvoice.outstandingMinor, selectedInvoice.currency)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  type="number"
                  step="0.01"
                  placeholder={`Amount in ${selectedInvoice.currency}`}
                  value={quickPayAmount}
                  onChange={(e) => setQuickPayAmount(e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono-num text-white"
                  required
                />
                <select
                  value={quickPayMethod}
                  onChange={(e) => setQuickPayMethod(e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                >
                  <option>Stripe Corporate</option>
                  <option>Bank Wire (SWIFT/ACH)</option>
                  <option>bKash Merchant</option>
                  <option>Payoneer</option>
                </select>
              </div>
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setQuickPayAmount((selectedInvoice.outstandingMinor / 100).toFixed(2))
                  }
                  className="text-[11px] text-amber-400 hover:underline cursor-pointer"
                >
                  Fill Remaining ({(selectedInvoice.outstandingMinor / 100).toFixed(2)}{" "}
                  {selectedInvoice.currency})
                </button>
                <button
                  type="submit"
                  disabled={isPaying}
                  className="rounded-lg bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 cursor-pointer"
                >
                  {isPaying ? "Recording..." : "Verify & Apply Payment"}
                </button>
              </div>
            </form>
          )}

          {/* Local Node.js QR Code Studio */}
          <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <QrCode className="h-4 w-4" />
                Local QR Code Generator &amp; Upload Control
              </h3>
              <label className="inline-flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={qrEnabled}
                  onChange={(e) => setQrEnabled(e.target.checked)}
                  className="rounded border-slate-600"
                />
                Show on Invoice
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  QR Payload Mode
                </label>
                <select
                  value={qrContentType}
                  onChange={(e) => setQrContentType(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="INVOICE_VERIFICATION">Invoice Verification Link</option>
                  <option value="PAYMENT_INFO">Payment Instructions Text</option>
                  <option value="WHATSAPP">WhatsApp Direct Link</option>
                  <option value="URL">Website / Custom URL</option>
                  <option value="TEXT">Plain Text / Bank SWIFT</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Invoice QR Placement
                </label>
                <select
                  value={qrPlacement}
                  onChange={(e) => setQrPlacement(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="BOTTOM_RIGHT">Bottom Right (Default)</option>
                  <option value="BOTTOM_LEFT">Bottom Left</option>
                  <option value="TOP_RIGHT">Top Right Header</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                QR Destination / Content Input
              </label>
              <input
                type="text"
                value={qrRawInput}
                onChange={(e) => setQrRawInput(e.target.value)}
                placeholder="https://creatobee.com/verify or +8801711894200"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                QR Caption Label
              </label>
              <input
                type="text"
                value={qrLabel}
                onChange={(e) => setQrLabel(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleGenerateLocalQr}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Generate Local QR &amp; Save
              </button>

              <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 cursor-pointer">
                <Upload className="h-3.5 w-3.5 text-amber-400" />
                Upload Custom QR PNG
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml"
                  onChange={handleUploadQrFile}
                  className="hidden"
                />
              </label>
            </div>

            {qrFeedback && (
              <div
                className={`flex items-center gap-2 rounded-lg p-2.5 text-xs ${
                  qrFeedback.type === "ok"
                    ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border border-rose-500/30 bg-rose-500/10 text-rose-300"
                }`}
              >
                {qrFeedback.type === "ok" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                )}
                <span>{qrFeedback.text}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (7 Cols): Live High-Contrast White Paper A4 Invoice Preview */}
        <div className="lg:col-span-7">
          {selectedInvoice ? (
            <div className="rounded-2xl bg-white text-slate-900 shadow-2xl border border-slate-200 overflow-hidden">
              {/* Invoice Paper Header */}
              <div className="bg-[#0B0F17] text-white p-6 border-b-4 border-amber-500 flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1.5 max-w-md">
                  {settings?.logoDataUri ? (
                    <img
                      src={settings.logoDataUri}
                      alt="Creato Bee Logo"
                      className="h-11 w-auto object-contain mb-1"
                    />
                  ) : (
                    <div className="text-xl font-extrabold tracking-tight text-amber-400">
                      {settings.businessName}
                    </div>
                  )}
                  <p className="text-xs text-slate-300">{settings.tagline}</p>
                  <p className="text-[11px] text-slate-400">{settings.address}</p>
                  <p className="text-[11px] text-slate-400">
                    {settings.email} • {settings.phone} • Tax ID: {settings.taxId}
                  </p>
                </div>

                {/* Top Right Invoice Meta or Top-Right QR Placement */}
                <div className="flex items-start gap-4">
                  <div className="text-right">
                    <span className="inline-block rounded bg-amber-500/20 border border-amber-400/40 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                      {selectedInvoice.status}
                    </span>
                    <h3 className="mt-1 font-mono-num text-lg font-extrabold text-white">
                      {selectedInvoice.invoiceNumber}
                    </h3>
                    <p className="text-[11px] text-slate-300">
                      Issued: {selectedInvoice.issueDate}
                    </p>
                    <p className="text-[11px] text-amber-300 font-medium">
                      Due: {selectedInvoice.dueDate}
                    </p>
                  </div>

                  {qrEnabled && activeQrUri && qrPlacement === "TOP_RIGHT" && (
                    <div className="bg-white p-1.5 rounded-lg shadow">
                      <img
                        src={activeQrUri}
                        alt="Invoice Verification QR"
                        className="h-20 w-20 object-contain"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Invoice Paper Body */}
              <div className="p-6 space-y-6">
                {/* Client & Currency Snapshot Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-slate-200 pb-5">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Billed To Client
                    </p>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">
                      {selectedClient.company}
                    </p>
                    <p className="text-xs text-slate-700">Attn: {selectedClient.name}</p>
                    <p className="text-xs text-slate-500">{selectedClient.email}</p>
                    {selectedClient.address && (
                      <p className="text-xs text-slate-500 mt-0.5">{selectedClient.address}</p>
                    )}
                  </div>

                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Original Currency:</span>
                      <span className="font-mono-num font-bold text-slate-900">
                        {selectedInvoice.currency}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Locked Exchange Rate:</span>
                      <span className="font-mono-num text-slate-800">
                        1 USD = {selectedInvoice.exchangeRateSnapshot.toFixed(2)} BDT
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Display Equivalent ({displayCurrency}):</span>
                      <span className="font-mono-num font-semibold text-indigo-700">
                        {displayCurrency === "USD"
                          ? formatMinorCurrency(
                              selectedInvoice.currency === "USD"
                                ? selectedInvoice.totalMinor
                                : Math.round(
                                    selectedInvoice.totalMinor /
                                      selectedInvoice.exchangeRateSnapshot
                                  ),
                              "USD"
                            )
                          : formatMinorCurrency(
                              selectedInvoice.currency === "BDT"
                                ? selectedInvoice.totalMinor
                                : Math.round(
                                    selectedInvoice.totalMinor *
                                      selectedInvoice.exchangeRateSnapshot
                                  ),
                              "BDT"
                            )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Deliverables Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b-2 border-slate-900 text-[11px] font-bold uppercase text-slate-600">
                        <th className="py-2">Deliverable / Description</th>
                        <th className="py-2 text-right">Qty</th>
                        <th className="py-2 text-right">Unit Price</th>
                        <th className="py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      {(selectedInvoice.items && selectedInvoice.items.length > 0
                        ? selectedInvoice.items
                        : [
                            {
                              description: "Enterprise Agency Retainer & Media Services",
                              quantity: 1,
                              unitPriceMinor: selectedInvoice.subtotalMinor,
                              totalMinor: selectedInvoice.subtotalMinor,
                            },
                          ]
                      ).map((item, i) => (
                        <tr key={i}>
                          <td className="py-3 font-medium text-slate-900">
                            {item.description}
                          </td>
                          <td className="py-3 text-right font-mono-num text-slate-700">
                            {item.quantity}
                          </td>
                          <td className="py-3 text-right font-mono-num text-slate-700">
                            {formatMinorCurrency(
                              item.unitPriceMinor,
                              selectedInvoice.currency
                            )}
                          </td>
                          <td className="py-3 text-right font-mono-num font-bold text-slate-900">
                            {formatMinorCurrency(
                              item.totalMinor,
                              selectedInvoice.currency
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals + QR & Signature Footer */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 pt-3 border-t border-slate-200 items-end">
                  {/* Left Side: QR or Signature depending on placement */}
                  <div className="sm:col-span-6 flex flex-wrap items-center gap-4">
                    {qrEnabled && activeQrUri && qrPlacement !== "TOP_RIGHT" && (
                      <div
                        className={`flex flex-col items-center rounded-xl border border-slate-300 bg-slate-50 p-2.5 ${
                          qrPlacement === "BOTTOM_LEFT" ? "order-first" : "order-last"
                        }`}
                      >
                        <img
                          src={activeQrUri}
                          alt="Local Verification QR"
                          className="h-24 w-24 object-contain"
                        />
                        <span className="mt-1 text-[10px] font-bold text-slate-800 text-center max-w-[120px]">
                          {qrLabel}
                        </span>
                        <span className="text-[9px] text-emerald-700 font-medium flex items-center gap-0.5">
                          <ShieldCheck className="h-3 w-3" /> Local QR Engine
                        </span>
                      </div>
                    )}

                    <div className="space-y-1">
                      {settings?.signatureDataUri && (
                        <img
                          src={settings.signatureDataUri}
                          alt="Authorized Signature"
                          className="h-12 w-auto object-contain"
                        />
                      )}
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Authorized Executive Signatory
                      </p>
                      <p className="text-[10px] text-slate-500 max-w-xs leading-relaxed">
                        {selectedInvoice.notes}
                      </p>
                    </div>
                  </div>

                  {/* Right Side: Strict Balance Invariant Box */}
                  <div className="sm:col-span-6 space-y-1.5 rounded-xl bg-slate-900 text-white p-4">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>Subtotal:</span>
                      <span className="font-mono-num">
                        {formatMinorCurrency(
                          selectedInvoice.subtotalMinor,
                          selectedInvoice.currency
                        )}
                      </span>
                    </div>
                    {selectedInvoice.discountMinor > 0 && (
                      <div className="flex justify-between text-xs text-amber-300">
                        <span>Discount:</span>
                        <span className="font-mono-num">
                          −
                          {formatMinorCurrency(
                            selectedInvoice.discountMinor,
                            selectedInvoice.currency
                          )}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-bold border-t border-slate-700 pt-1.5">
                      <span>Invoice Total:</span>
                      <span className="font-mono-num">
                        {formatMinorCurrency(
                          selectedInvoice.totalMinor,
                          selectedInvoice.currency
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-emerald-400">
                      <span>Verified Payments Applied:</span>
                      <span className="font-mono-num">
                        −
                        {formatMinorCurrency(
                          selectedInvoice.paidMinor,
                          selectedInvoice.currency
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-extrabold text-amber-400 border-t border-slate-700 pt-1.5">
                      <span>OUTSTANDING BALANCE:</span>
                      <span className="font-mono-num">
                        {formatMinorCurrency(
                          selectedInvoice.outstandingMinor,
                          selectedInvoice.currency
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-800 bg-[#111827] p-8 text-center text-slate-400">
              No invoice selected. Create or select an invoice to preview.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
