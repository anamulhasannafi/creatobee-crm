"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  ShoppingBag,
  FileText,
  CreditCard,
  TrendingUp,
  PieChart,
  BarChart3,
  Megaphone,
  Calendar,
  QrCode,
  Settings,
  HardDriveDownload,
  Activity,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  Plus,
  Download,
  Upload,
  Lock,
  Play,
  Pause,
  XCircle,
  Sparkles,
  Globe,
  Menu,
  X,
} from "lucide-react";
import { formatMinorCurrency } from "@/lib/accounting";
import { InvoiceStudioPanel } from "./InvoiceStudioPanel";
import { AuthDiagnosticsModal, AuthState } from "./AuthDiagnosticsModal";

type NavModule =
  | "dashboard"
  | "clients"
  | "services"
  | "orders"
  | "invoices"
  | "payments"
  | "revenue_expenses"
  | "profit_loss"
  | "reports"
  | "campaigns"
  | "calendar"
  | "qr_branding"
  | "settings"
  | "uploads_backups"
  | "diagnostics";

export function CreatoBeeErpApp() {
  const [activeModule, setActiveModule] = useState<NavModule>("dashboard");
  const [displayCurrency, setDisplayCurrency] = useState<"USD" | "BDT">("USD");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Backend State
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [erpData, setErpData] = useState<any>(null);
  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // Automated Self-Test State
  const [runningTests, setRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<
    Array<{ suite: string; name: string; passed: boolean; details: string }> | null
  >(null);

  // Forms State across modules
  const [clientForm, setClientForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    country: "United States",
    preferredCurrency: "USD",
    taxNumber: "",
  });

  const [serviceForm, setServiceForm] = useState({
    name: "",
    category: "Performance Marketing",
    priceMajor: "1500",
    currency: "USD",
    billingCycle: "MONTHLY",
  });

  const [orderForm, setOrderForm] = useState({
    clientId: 1,
    title: "",
    currency: "USD",
    amountMajor: "2500",
  });

  const [expenseForm, setExpenseForm] = useState({
    title: "",
    category: "Server & Cloud Infrastructure",
    expenseType: "AGENCY_OPERATING",
    vendor: "",
    currency: "USD",
    amountMajor: "450",
  });

  const [campaignForm, setCampaignForm] = useState({
    clientId: 1,
    name: "",
    platform: "Meta Ads (Facebook/Instagram)",
    currency: "USD",
    clientBudgetMajor: "5000",
    agencyFeeMajor: "1250",
    actualAdSpendMajor: "1800",
    scheduledStartDate: new Date().toISOString().slice(0, 10),
    startTime: "09:00",
    endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    endTime: "23:59",
  });

  const [newRateInput, setNewRateInput] = useState("122.00");
  const [newRateNote, setNewRateNote] = useState(
    "Updated Treasury Interbank Settlement Rate"
  );
  const [restoreConfirmInput, setRestoreConfirmInput] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 5000);
  };

  const fetchAllData = useCallback(async () => {
    try {
      const [erpRes, authRes] = await Promise.all([
        fetch("/api/erp"),
        fetch("/api/auth"),
      ]);
      const erpJson = await erpRes.json();
      const authJson = await authRes.json();
      setErpData(erpJson);
      setAuthState(authJson);
    } catch (err) {
      console.error("Failed to fetch ERP state:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const formatConverted = (usdMinor: number, bdtMinor: number) => {
    return displayCurrency === "USD"
      ? formatMinorCurrency(usdMinor, "USD")
      : formatMinorCurrency(bdtMinor, "BDT");
  };

  const handleRunVerificationSuite = async () => {
    setRunningTests(true);
    try {
      const res = await fetch("/api/erp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run_automated_test_suite" }),
      });
      const data = await res.json();
      if (data.results) {
        setTestResults(data.results);
        setActiveModule("diagnostics");
        showToast(
          `Automated Verification Suite: ${
            data.results.filter((r: { passed: boolean }) => r.passed).length
          }/${data.results.length} Checks Passed!`
        );
        await fetchAllData();
      }
    } finally {
      setRunningTests(false);
    }
  };

  const handleRecordPayment = async (
    invoiceId: number,
    amountMajor: number,
    currency: string,
    method: string
  ) => {
    const res = await fetch("/api/erp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "record_payment",
        invoiceId,
        amountMajor,
        currency,
        method,
      }),
    });
    const data = await res.json();
    if (data.success) {
      showToast(
        `Verified payment recorded (${data.payment.paymentReference}). Balance updated!`
      );
      await fetchAllData();
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/erp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_client", ...clientForm }),
    });
    const data = await res.json();
    if (data.success) {
      setClientForm({
        name: "",
        company: "",
        email: "",
        phone: "",
        country: "United States",
        preferredCurrency: "USD",
        taxNumber: "",
      });
      showToast(`Client '${data.client.company}' added to CRM.`);
      await fetchAllData();
    }
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/erp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_service", ...serviceForm }),
    });
    const data = await res.json();
    if (data.success) {
      setServiceForm({
        name: "",
        category: "Performance Marketing",
        priceMajor: "1500",
        currency: "USD",
        billingCycle: "MONTHLY",
      });
      showToast(`Service '${data.service.name}' added to catalog.`);
      await fetchAllData();
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/erp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_order", ...orderForm }),
    });
    const data = await res.json();
    if (data.success) {
      setOrderForm({
        clientId: erpData?.clients?.[0]?.id || 1,
        title: "",
        currency: "USD",
        amountMajor: "2500",
      });
      showToast(`Order ${data.order.orderNumber} created with idempotency protection.`);
      await fetchAllData();
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/erp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_expense", ...expenseForm }),
    });
    const data = await res.json();
    if (data.success) {
      setExpenseForm({
        title: "",
        category: "Server & Cloud Infrastructure",
        expenseType: "AGENCY_OPERATING",
        vendor: "",
        currency: "USD",
        amountMajor: "450",
      });
      showToast(`Expense ${data.expense.expenseNumber} logged.`);
      await fetchAllData();
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/erp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_campaign", ...campaignForm }),
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Campaign ${data.campaign.campaignCode} scheduled.`);
      await fetchAllData();
    }
  };

  const handleCampaignManualOverride = async (
    campaignId: number,
    manualStatus: "ACTIVE" | "PAUSED" | "CANCELLED"
  ) => {
    await fetch("/api/erp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update_campaign_status",
        campaignId,
        manualStatus,
      }),
    });
    showToast(`Campaign status updated to ${manualStatus}.`);
    await fetchAllData();
  };

  const handleUpdateExchangeRate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/erp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update_exchange_rate",
        rate: parseFloat(newRateInput),
        note: newRateNote,
      }),
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message);
      await fetchAllData();
    }
  };

  const handleCreateBackup = async () => {
    const res = await fetch("/api/erp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_backup",
        label: `Admin Verified Snapshot (${new Date().toLocaleTimeString()})`,
      }),
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Backup ${data.backup.backupCode} created (SHA-256 verified).`);
      await fetchAllData();
    }
  };

  const handleRestoreBackup = async (backupId: number) => {
    const res = await fetch("/api/erp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "restore_backup",
        backupId,
        confirmPhrase: restoreConfirmInput,
      }),
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message);
      setRestoreConfirmInput("");
      await fetchAllData();
    } else {
      showToast(`Restore Guard: ${data.error}`);
    }
  };

  const handleAssetUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    category: "LOGO" | "SIGNATURE" | "QR_CODE" | "RECEIPT"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUri = String(reader.result || "");
      const res = await fetch("/api/erp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upload_file",
          fileName: file.name,
          category,
          mimeType: file.type || "image/png",
          sizeBytes: file.size,
          dataUri,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`${category} file '${file.name}' validated & persisted.`);
        await fetchAllData();
      }
    };
    reader.readAsDataURL(file);
  };

  if (loading || !erpData) {
    return (
      <div className="min-h-screen bg-[#0B0F17] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center animate-pulse">
            <Sparkles className="h-5 w-5 text-amber-400" />
          </div>
          <p className="text-sm font-bold text-white">
            Bootstrapping Creato Bee Advanced Business Management System...
          </p>
          <p className="text-xs text-slate-400">
            Verifying PostgreSQL Drizzle Schema, Local QR Engine &amp; Multi-Currency Ledger
          </p>
        </div>
      </div>
    );
  }

  const summary = erpData.accountingSummary;
  const settings = erpData.settings;

  const sidebarGroups = [
    {
      title: "Overview & CRM",
      items: [
        { id: "dashboard", label: "Executive Dashboard", icon: LayoutDashboard },
        { id: "clients", label: "Client CRM", icon: Users },
        { id: "services", label: "Services Catalog", icon: Briefcase },
      ],
    },
    {
      title: "Commercial & Billing",
      items: [
        { id: "orders", label: "Client Orders", icon: ShoppingBag },
        { id: "invoices", label: "Invoice & QR PDF Studio", icon: FileText },
        { id: "payments", label: "Payments & Ledger", icon: CreditCard },
      ],
    },
    {
      title: "Treasury & Accounting",
      items: [
        { id: "revenue_expenses", label: "Revenue & Expenses", icon: TrendingUp },
        { id: "profit_loss", label: "Profit & Loss + FX", icon: PieChart },
        { id: "reports", label: "Executive Reports", icon: BarChart3 },
      ],
    },
    {
      title: "Growth & Campaigns",
      items: [
        { id: "campaigns", label: "Ad Campaigns", icon: Megaphone },
        { id: "calendar", label: "Campaign Calendar", icon: Calendar },
      ],
    },
    {
      title: "System & Control Center",
      items: [
        { id: "qr_branding", label: "Logo, Signature & QR", icon: QrCode },
        { id: "settings", label: "Settings Control Center", icon: Settings },
        { id: "uploads_backups", label: "Uploads & Backups", icon: HardDriveDownload },
        { id: "diagnostics", label: "Diagnostics & Tests", icon: Activity },
      ],
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F17] text-[#F9FAFB]">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-xl border border-amber-500/50 bg-[#111827] px-4 py-3 text-xs font-semibold text-amber-300 shadow-2xl">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Auth & Login Diagnostics Modal */}
      {showAuthModal && (
        <AuthDiagnosticsModal
          authState={authState}
          onClose={() => setShowAuthModal(false)}
          onAuthRefreshed={fetchAllData}
        />
      )}

      {/* Sticky Top Command Header */}
      <header className="sticky top-0 z-30 border-b border-slate-800/90 bg-[#0B0F17]/95 backdrop-blur-md px-4 lg:px-6 h-16 flex items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden rounded-lg border border-slate-800 p-2 text-slate-300 hover:bg-slate-800"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-amber-500 flex items-center justify-center font-extrabold text-slate-950 text-sm shadow-lg shadow-amber-500/20">
              CB
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-extrabold text-sm tracking-tight text-white">
                  CREATo BEE
                </span>
                <span className="hidden sm:inline-block rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 font-mono-num text-[10px] font-bold text-amber-400">
                  ERP v4.2 UPGRADE
                </span>
              </div>
              <p className="hidden sm:block text-[11px] text-slate-400">
                {settings?.businessName} • {settings?.timezone || "Asia/Dhaka"}
              </p>
            </div>
          </div>
        </div>

        {/* Right Command Controls: USD/BDT Switcher, Active Rate, Self-Test, Admin Session */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Global USD / BDT Currency Switcher */}
          <div className="inline-flex items-center rounded-lg border border-slate-700 bg-[#111827] p-0.5">
            <button
              onClick={() => setDisplayCurrency("USD")}
              className={`rounded-md px-2.5 py-1 text-xs font-mono-num font-bold transition cursor-pointer ${
                displayCurrency === "USD"
                  ? "bg-amber-500 text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              USD ($)
            </button>
            <button
              onClick={() => setDisplayCurrency("BDT")}
              className={`rounded-md px-2.5 py-1 text-xs font-mono-num font-bold transition cursor-pointer ${
                displayCurrency === "BDT"
                  ? "bg-amber-500 text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              BDT (৳)
            </button>
          </div>

          {/* Exchange Rate Pill */}
          <button
            onClick={() => setActiveModule("profit_loss")}
            className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#111827] px-3 py-1.5 text-xs font-mono-num text-slate-300 hover:border-slate-700 cursor-pointer"
            title="Historical transactions retain their locked exchangeRateSnapshot"
          >
            <Globe className="h-3.5 w-3.5 text-amber-400" />
            <span>1 USD = {Number(summary.activeRate).toFixed(2)} BDT</span>
          </button>

          {/* Automated System Verification Suite Runner */}
          <button
            onClick={handleRunVerificationSuite}
            disabled={runningTests}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 transition cursor-pointer"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {runningTests ? "Running Checks..." : "Verify System"}
            </span>
          </button>

          {/* Admin Login & Session Security Button */}
          <button
            onClick={() => setShowAuthModal(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition cursor-pointer"
          >
            <Lock className="h-3.5 w-3.5 text-amber-400" />
            <span>
              {authState?.authenticated && authState.admin
                ? authState.admin.username
                : "Admin Login"}
            </span>
            <span
              className={`h-2 w-2 rounded-full ${
                authState?.authenticated ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
          </button>
        </div>
      </header>

      {/* Main Shell Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Sidebar */}
        <aside
          className={`${
            mobileMenuOpen ? "fixed inset-y-16 left-0 z-40 block" : "hidden"
          } lg:block w-64 shrink-0 border-r border-slate-800/90 bg-[#0B0F17] overflow-y-auto p-4 space-y-5 no-print`}
        >
          {sidebarGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {group.title}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveModule(item.id as NavModule);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold transition cursor-pointer ${
                      active
                        ? "bg-amber-500/15 text-amber-400 border-l-2 border-amber-400"
                        : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </aside>

        {/* Primary Content Canvas */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-7 space-y-6">
          {/* ==============================================================
              MODULE 1: EXECUTIVE DASHBOARD
             ============================================================== */}
          {activeModule === "dashboard" && (
            <div className="space-y-6">
              {/* Top Telemetry Banner */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-gradient-to-r from-[#111827] via-[#151E31] to-[#111827] p-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                      PRODUCTION READY
                    </span>
                    <span className="text-xs font-mono-num text-slate-400">
                      Reporting Basis: {displayCurrency} (Original Transactions Preserved)
                    </span>
                  </div>
                  <h1 className="text-xl font-extrabold text-white">
                    Executive Agency Operations &amp; Multi-Currency Financial Center
                  </h1>
                  <p className="text-xs text-slate-400">
                    Strict Balance Invariants • Segregated Agency Revenue vs Client Ad Spend • Local Node.js QR &amp; PDF Engine
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setActiveModule("invoices")}
                    className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition cursor-pointer"
                  >
                    + Generate Invoice &amp; QR PDF
                  </button>
                  <button
                    onClick={() => setActiveModule("campaigns")}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition cursor-pointer"
                  >
                    Manage Ad Campaigns
                  </button>
                </div>
              </div>

              {/* 4 Primary Segregated Financial KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="rounded-xl border border-slate-800 bg-[#111827] p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">
                      Collected Agency Revenue
                    </span>
                    <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                      VERIFIED LEDGER
                    </span>
                  </div>
                  <div className="text-2xl font-extrabold font-mono-num text-white">
                    {formatConverted(
                      summary.collectedRevenueUsdMinor,
                      summary.collectedRevenueBdtMinor
                    )}
                  </div>
                  <p className="text-[11px] font-mono-num text-slate-400">
                    Total Invoiced:{" "}
                    {formatConverted(
                      summary.invoicedRevenueUsdMinor,
                      summary.invoicedRevenueBdtMinor
                    )}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-[#111827] p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">
                      Outstanding Receivables
                    </span>
                    <span className="rounded bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                      TOTAL − PAID
                    </span>
                  </div>
                  <div className="text-2xl font-extrabold font-mono-num text-amber-400">
                    {formatConverted(
                      summary.outstandingReceivablesUsdMinor,
                      summary.outstandingReceivablesBdtMinor
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Across {erpData.invoices.length} active multi-currency invoices
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-[#111827] p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">
                      Agency Operating Expenses
                    </span>
                    <span className="rounded bg-indigo-500/15 px-2 py-0.5 text-[10px] font-bold text-indigo-300">
                      EXCLUDES AD SPEND
                    </span>
                  </div>
                  <div className="text-2xl font-extrabold font-mono-num text-white">
                    {formatConverted(
                      summary.agencyOperatingExpenseUsdMinor,
                      summary.agencyOperatingExpenseBdtMinor
                    )}
                  </div>
                  <p className="text-[11px] font-mono-num text-slate-400">
                    Client Ad Pass-Through:{" "}
                    {formatConverted(
                      summary.clientAdSpendPassThroughUsdMinor,
                      summary.clientAdSpendPassThroughBdtMinor
                    )}
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-500/30 bg-[#111827] p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-300">
                      Net Agency Profit (True P&amp;L)
                    </span>
                    <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                      NO DOUBLE COUNT
                    </span>
                  </div>
                  <div className="text-2xl font-extrabold font-mono-num text-emerald-400">
                    {formatConverted(
                      summary.netAgencyProfitUsdMinor,
                      summary.netAgencyProfitBdtMinor
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Collected Agency Revenue − Operating Overhead
                  </p>
                </div>
              </div>

              {/* Recent Invoices + Deterministic Campaign Telemetry */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 rounded-xl border border-slate-800 bg-[#111827] p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-white">
                      Multi-Currency Invoices &amp; Balance Invariant Verification
                    </h2>
                    <button
                      onClick={() => setActiveModule("invoices")}
                      className="text-xs text-amber-400 hover:underline cursor-pointer"
                    >
                      Open Invoice &amp; QR Studio →
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-[11px] uppercase text-slate-400">
                          <th className="py-2">Invoice #</th>
                          <th className="py-2">Orig. Total</th>
                          <th className="py-2">Paid</th>
                          <th className="py-2">Outstanding</th>
                          <th className="py-2">FX Lock</th>
                          <th className="py-2 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/70">
                        {erpData.invoices.map(
                          (inv: {
                            id: number;
                            invoiceNumber: string;
                            currency: string;
                            totalMinor: number;
                            paidMinor: number;
                            outstandingMinor: number;
                            exchangeRateSnapshot: number;
                            status: string;
                          }) => (
                            <tr key={inv.id} className="hover:bg-slate-900/50">
                              <td className="py-2.5 font-mono-num font-bold text-white">
                                {inv.invoiceNumber}
                              </td>
                              <td className="py-2.5 font-mono-num text-slate-200">
                                {formatMinorCurrency(inv.totalMinor, inv.currency)}
                              </td>
                              <td className="py-2.5 font-mono-num text-emerald-400">
                                {formatMinorCurrency(inv.paidMinor, inv.currency)}
                              </td>
                              <td className="py-2.5 font-mono-num font-semibold text-amber-400">
                                {formatMinorCurrency(inv.outstandingMinor, inv.currency)}
                              </td>
                              <td className="py-2.5 font-mono-num text-slate-400">
                                {inv.exchangeRateSnapshot.toFixed(2)}
                              </td>
                              <td className="py-2.5 text-right">
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
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Deterministic Campaign Statuses */}
                <div className="lg:col-span-5 rounded-xl border border-slate-800 bg-[#111827] p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-white">
                      Time-Calculated Ad Campaign Lifecycle
                    </h2>
                    <button
                      onClick={() => setActiveModule("campaigns")}
                      className="text-xs text-amber-400 hover:underline cursor-pointer"
                    >
                      All Campaigns →
                    </button>
                  </div>
                  <div className="space-y-3">
                    {erpData.campaigns.map(
                      (c: {
                        id: number;
                        campaignCode: string;
                        name: string;
                        platform: string;
                        badgeLabel: string;
                        statusSource: string;
                        timeRemainingText: string;
                        progressPercent: number;
                      }) => (
                        <div
                          key={c.id}
                          className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-white truncate">
                              {c.name}
                            </span>
                            <span className="shrink-0 rounded bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                              {c.badgeLabel}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span>{c.platform}</span>
                            <span className="font-mono-num">{c.timeRemainingText}</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-amber-500 transition-all"
                              style={{ width: `${c.progressPercent}%` }}
                            />
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==============================================================
              MODULE 2: CLIENT CRM
             ============================================================== */}
          {activeModule === "clients" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-800 bg-[#111827] p-5">
                <h2 className="text-lg font-bold text-white">
                  Client CRM &amp; Multi-Currency Billing Profiles
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Linked directly to Orders, Invoices, Payments, and Ad Campaigns with referential integrity.
                </p>

                <form
                  onSubmit={handleCreateClient}
                  className="mt-4 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3"
                >
                  <input
                    type="text"
                    placeholder="Contact Name"
                    value={clientForm.name}
                    onChange={(e) =>
                      setClientForm({ ...clientForm, name: e.target.value })
                    }
                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Company Name"
                    value={clientForm.company}
                    onChange={(e) =>
                      setClientForm({ ...clientForm, company: e.target.value })
                    }
                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                    required
                  />
                  <input
                    type="email"
                    placeholder="Billing Email"
                    value={clientForm.email}
                    onChange={(e) =>
                      setClientForm({ ...clientForm, email: e.target.value })
                    }
                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Phone / WhatsApp"
                    value={clientForm.phone}
                    onChange={(e) =>
                      setClientForm({ ...clientForm, phone: e.target.value })
                    }
                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                    required
                  />
                  <select
                    value={clientForm.preferredCurrency}
                    onChange={(e) =>
                      setClientForm({
                        ...clientForm,
                        preferredCurrency: e.target.value,
                      })
                    }
                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                  >
                    <option value="USD">Preferred: USD ($)</option>
                    <option value="BDT">Preferred: BDT (৳)</option>
                  </select>
                  <button
                    type="submit"
                    className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer"
                  >
                    + Add Client
                  </button>
                </form>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {erpData.clients.map(
                  (c: {
                    id: number;
                    code: string;
                    name: string;
                    company: string;
                    email: string;
                    phone: string;
                    country: string;
                    preferredCurrency: string;
                    taxNumber: string;
                    status: string;
                  }) => (
                    <div
                      key={c.id}
                      className="rounded-xl border border-slate-800 bg-[#111827] p-5 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono-num text-xs font-bold text-amber-400">
                          {c.code}
                        </span>
                        <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                          {c.status} • {c.preferredCurrency}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white">{c.company}</h3>
                      <p className="text-xs text-slate-300">Primary Contact: {c.name}</p>
                      <p className="text-xs text-slate-400">{c.email}</p>
                      <p className="text-xs text-slate-400">
                        {c.phone} • {c.country}
                      </p>
                      {c.taxNumber && (
                        <p className="text-[11px] font-mono-num text-slate-500">
                          Tax/BIN: {c.taxNumber}
                        </p>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* ==============================================================
              MODULE 3: SERVICES CATALOG
             ============================================================== */}
          {activeModule === "services" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-800 bg-[#111827] p-5">
                <h2 className="text-lg font-bold text-white">Agency Services Catalog</h2>
                <form
                  onSubmit={handleCreateService}
                  className="mt-4 grid grid-cols-1 sm:grid-cols-5 gap-3"
                >
                  <input
                    type="text"
                    placeholder="Service Name"
                    value={serviceForm.name}
                    onChange={(e) =>
                      setServiceForm({ ...serviceForm, name: e.target.value })
                    }
                    className="sm:col-span-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                    required
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Default Price"
                    value={serviceForm.priceMajor}
                    onChange={(e) =>
                      setServiceForm({ ...serviceForm, priceMajor: e.target.value })
                    }
                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono-num text-white"
                    required
                  />
                  <select
                    value={serviceForm.currency}
                    onChange={(e) =>
                      setServiceForm({ ...serviceForm, currency: e.target.value })
                    }
                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="BDT">BDT (৳)</option>
                  </select>
                  <button
                    type="submit"
                    className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer"
                  >
                    + Add Service
                  </button>
                </form>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {erpData.services.map(
                  (s: {
                    id: number;
                    code: string;
                    name: string;
                    category: string;
                    description: string;
                    defaultPriceMinor: number;
                    currency: string;
                    billingCycle: string;
                  }) => (
                    <div
                      key={s.id}
                      className="rounded-xl border border-slate-800 bg-[#111827] p-5 flex items-start justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <span className="font-mono-num text-[11px] text-amber-400 font-bold">
                          {s.code} • {s.category}
                        </span>
                        <h3 className="text-sm font-bold text-white">{s.name}</h3>
                        <p className="text-xs text-slate-400">{s.description}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono-num text-base font-extrabold text-emerald-400">
                          {formatMinorCurrency(s.defaultPriceMinor, s.currency)}
                        </div>
                        <span className="text-[10px] uppercase text-slate-400">
                          {s.billingCycle}
                        </span>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* ==============================================================
              MODULE 4: CLIENT ORDERS
             ============================================================== */}
          {activeModule === "orders" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-800 bg-[#111827] p-5">
                <h2 className="text-lg font-bold text-white">
                  Client Orders &amp; Idempotent Order Processing
                </h2>
                <form
                  onSubmit={handleCreateOrder}
                  className="mt-4 grid grid-cols-1 sm:grid-cols-5 gap-3"
                >
                  <select
                    value={orderForm.clientId}
                    onChange={(e) =>
                      setOrderForm({ ...orderForm, clientId: Number(e.target.value) })
                    }
                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                  >
                    {erpData.clients.map((c: { id: number; company: string }) => (
                      <option key={c.id} value={c.id}>
                        {c.company}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Order Scope / Deliverable Title"
                    value={orderForm.title}
                    onChange={(e) =>
                      setOrderForm({ ...orderForm, title: e.target.value })
                    }
                    className="sm:col-span-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                    required
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Order Total"
                    value={orderForm.amountMajor}
                    onChange={(e) =>
                      setOrderForm({ ...orderForm, amountMajor: e.target.value })
                    }
                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono-num text-white"
                    required
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer"
                  >
                    + Create Order
                  </button>
                </form>
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#111827] p-5 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] uppercase text-slate-400">
                      <th className="py-2.5">Order #</th>
                      <th className="py-2.5">Title</th>
                      <th className="py-2.5">Orig. Total</th>
                      <th className="py-2.5">Locked Rate</th>
                      <th className="py-2.5">Converted ({displayCurrency})</th>
                      <th className="py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {erpData.orders.map(
                      (o: {
                        id: number;
                        orderNumber: string;
                        title: string;
                        currency: string;
                        totalMinor: number;
                        exchangeRateSnapshot: number;
                        convertedUsdMinor: number;
                        convertedBdtMinor: number;
                        status: string;
                      }) => (
                        <tr key={o.id}>
                          <td className="py-3 font-mono-num font-bold text-amber-400">
                            {o.orderNumber}
                          </td>
                          <td className="py-3 font-medium text-white">{o.title}</td>
                          <td className="py-3 font-mono-num text-slate-200">
                            {formatMinorCurrency(o.totalMinor, o.currency)}
                          </td>
                          <td className="py-3 font-mono-num text-slate-400">
                            {o.exchangeRateSnapshot.toFixed(2)}
                          </td>
                          <td className="py-3 font-mono-num font-bold text-emerald-400">
                            {formatConverted(
                              o.convertedUsdMinor,
                              o.convertedBdtMinor
                            )}
                          </td>
                          <td className="py-3">
                            <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                              {o.status}
                            </span>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==============================================================
              MODULE 5: PROFESSIONAL INVOICE GENERATOR & QR STUDIO
             ============================================================== */}
          {(activeModule === "invoices" || activeModule === "qr_branding") && (
            <InvoiceStudioPanel
              invoices={erpData.invoices}
              clients={erpData.clients}
              settings={erpData.settings}
              displayCurrency={displayCurrency}
              onInvoiceCreated={fetchAllData}
              onPaymentRecorded={handleRecordPayment}
              onQrUpdated={fetchAllData}
            />
          )}

          {/* ==============================================================
              MODULE 6: PAYMENTS & LEDGER HISTORY
             ============================================================== */}
          {activeModule === "payments" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-800 bg-[#111827] p-5">
                <h2 className="text-lg font-bold text-white">
                  Verified Payments, Partial Settlements &amp; Refund Ledger
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Every payment transaction atomically updates its parent invoice balance (Total − Paid = Outstanding) and locks its exchange rate snapshot.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#111827] p-5 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] uppercase text-slate-400">
                      <th className="py-2.5">Payment Ref</th>
                      <th className="py-2.5">Method</th>
                      <th className="py-2.5">Original Amount</th>
                      <th className="py-2.5">FX Snapshot</th>
                      <th className="py-2.5">Equivalent ({displayCurrency})</th>
                      <th className="py-2.5">Date</th>
                      <th className="py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {erpData.payments.map(
                      (p: {
                        id: number;
                        paymentReference: string;
                        method: string;
                        originalCurrency: string;
                        amountMinor: number;
                        exchangeRateSnapshot: number;
                        convertedUsdMinor: number;
                        convertedBdtMinor: number;
                        paymentDate: string;
                        status: string;
                      }) => (
                        <tr key={p.id}>
                          <td className="py-3 font-mono-num font-bold text-emerald-400">
                            {p.paymentReference}
                          </td>
                          <td className="py-3 text-white">{p.method}</td>
                          <td className="py-3 font-mono-num font-bold text-white">
                            {formatMinorCurrency(p.amountMinor, p.originalCurrency)}
                          </td>
                          <td className="py-3 font-mono-num text-slate-400">
                            {p.exchangeRateSnapshot.toFixed(2)}
                          </td>
                          <td className="py-3 font-mono-num text-amber-300">
                            {formatConverted(
                              p.convertedUsdMinor,
                              p.convertedBdtMinor
                            )}
                          </td>
                          <td className="py-3 text-slate-400">{p.paymentDate}</td>
                          <td className="py-3">
                            <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==============================================================
              MODULE 7: REVENUE & EXPENSES (STRICTLY SEGREGATED)
             ============================================================== */}
          {activeModule === "revenue_expenses" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-800 bg-[#111827] p-5">
                <h2 className="text-lg font-bold text-white">
                  Agency Expense Ledger &amp; Ad Spend Segregation
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Expenses classified as <code className="text-amber-300">CLIENT_AD_SPEND</code> are tracked as client pass-through budgets and are never double-counted against agency operating profit.
                </p>

                <form
                  onSubmit={handleCreateExpense}
                  className="mt-4 grid grid-cols-1 sm:grid-cols-6 gap-3"
                >
                  <input
                    type="text"
                    placeholder="Expense Title"
                    value={expenseForm.title}
                    onChange={(e) =>
                      setExpenseForm({ ...expenseForm, title: e.target.value })
                    }
                    className="sm:col-span-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                    required
                  />
                  <select
                    value={expenseForm.expenseType}
                    onChange={(e) =>
                      setExpenseForm({
                        ...expenseForm,
                        expenseType: e.target.value,
                      })
                    }
                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                  >
                    <option value="AGENCY_OPERATING">Agency Operating Expense</option>
                    <option value="CLIENT_AD_SPEND">Client Ad Spend Pass-Through</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Vendor (e.g. AWS / Meta)"
                    value={expenseForm.vendor}
                    onChange={(e) =>
                      setExpenseForm({ ...expenseForm, vendor: e.target.value })
                    }
                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                    required
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Amount"
                    value={expenseForm.amountMajor}
                    onChange={(e) =>
                      setExpenseForm({
                        ...expenseForm,
                        amountMajor: e.target.value,
                      })
                    }
                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono-num text-white"
                    required
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer"
                  >
                    + Log Expense
                  </button>
                </form>
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#111827] p-5 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] uppercase text-slate-400">
                      <th className="py-2.5">Expense #</th>
                      <th className="py-2.5">Title &amp; Vendor</th>
                      <th className="py-2.5">Accounting Classification</th>
                      <th className="py-2.5">Original Amount</th>
                      <th className="py-2.5">Converted ({displayCurrency})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {erpData.expenses.map(
                      (ex: {
                        id: number;
                        expenseNumber: string;
                        title: string;
                        vendor: string;
                        expenseType: string;
                        originalCurrency: string;
                        amountMinor: number;
                        convertedUsdMinor: number;
                        convertedBdtMinor: number;
                      }) => (
                        <tr key={ex.id}>
                          <td className="py-3 font-mono-num font-bold text-slate-300">
                            {ex.expenseNumber}
                          </td>
                          <td className="py-3">
                            <div className="font-bold text-white">{ex.title}</div>
                            <div className="text-[11px] text-slate-400">{ex.vendor}</div>
                          </td>
                          <td className="py-3">
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                                ex.expenseType === "CLIENT_AD_SPEND"
                                  ? "bg-indigo-500/20 text-indigo-300"
                                  : "bg-rose-500/20 text-rose-300"
                              }`}
                            >
                              {ex.expenseType}
                            </span>
                          </td>
                          <td className="py-3 font-mono-num text-white">
                            {formatMinorCurrency(
                              ex.amountMinor,
                              ex.originalCurrency
                            )}
                          </td>
                          <td className="py-3 font-mono-num font-bold text-amber-400">
                            {formatConverted(
                              ex.convertedUsdMinor,
                              ex.convertedBdtMinor
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==============================================================
              MODULE 8 & 9: PROFIT & LOSS + MULTI-CURRENCY FX & REPORTS
             ============================================================== */}
          {(activeModule === "profit_loss" || activeModule === "reports") && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Segregated P&L Statement */}
                <div className="lg:col-span-7 rounded-xl border border-slate-800 bg-[#111827] p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <h2 className="text-base font-bold text-white">
                        Audited Profit &amp; Loss Statement ({displayCurrency} Reporting Basis)
                      </h2>
                      <p className="text-xs text-slate-400">
                        Historical transactions converted using their locked transaction-date exchange rates.
                      </p>
                    </div>
                    <span className="rounded bg-amber-500/20 px-2.5 py-1 font-mono-num text-xs font-bold text-amber-300">
                      {displayCurrency} VIEW
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between py-2 border-b border-slate-800/70">
                      <span className="text-slate-300">
                        1. Gross Invoiced Agency Revenue
                      </span>
                      <span className="font-mono-num font-bold text-white">
                        {formatConverted(
                          summary.invoicedRevenueUsdMinor,
                          summary.invoicedRevenueBdtMinor
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-800/70">
                      <span className="text-emerald-300 font-semibold">
                        2. Verified Collected Agency Revenue (Cash Basis)
                      </span>
                      <span className="font-mono-num font-bold text-emerald-400">
                        {formatConverted(
                          summary.collectedRevenueUsdMinor,
                          summary.collectedRevenueBdtMinor
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-800/70">
                      <span className="text-rose-300">
                        3. Less: Agency Operating Expenses (Cloud, Payroll, Office)
                      </span>
                      <span className="font-mono-num font-bold text-rose-400">
                        −
                        {formatConverted(
                          summary.agencyOperatingExpenseUsdMinor,
                          summary.agencyOperatingExpenseBdtMinor
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 text-sm font-extrabold text-emerald-300">
                      <span>NET AGENCY OPERATING PROFIT</span>
                      <span className="font-mono-num">
                        {formatConverted(
                          summary.netAgencyProfitUsdMinor,
                          summary.netAgencyProfitBdtMinor
                        )}
                      </span>
                    </div>

                    <div className="pt-3 border-t border-slate-800 space-y-2">
                      <p className="text-[11px] font-bold uppercase text-slate-400">
                        Segregated Client Ad Budgets (Non-Operating Pass-Through — Not Double-Counted)
                      </p>
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Total Contracted Client Ad Budgets:</span>
                        <span className="font-mono-num text-indigo-300">
                          {formatConverted(
                            summary.totalCampaignClientBudgetUsdMinor,
                            summary.totalCampaignClientBudgetBdtMinor
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Cleared Ad Spend Pass-Through:</span>
                        <span className="font-mono-num text-indigo-300">
                          {formatConverted(
                            summary.clientAdSpendPassThroughUsdMinor,
                            summary.clientAdSpendPassThroughBdtMinor
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Exchange Rate Control Center */}
                <div className="lg:col-span-5 rounded-xl border border-slate-800 bg-[#111827] p-6 space-y-4">
                  <h2 className="text-base font-bold text-white">
                    USD / BDT Exchange Rate Control
                  </h2>
                  <p className="text-xs text-slate-400">
                    Updating the exchange rate applies to new transactions while preserving the historical snapshot rate on existing invoices and payments.
                  </p>

                  <form onSubmit={handleUpdateExchangeRate} className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">
                        New Active Rate (1 USD = ? BDT)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={newRateInput}
                        onChange={(e) => setNewRateInput(e.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono-num text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">
                        Treasury Audit Note
                      </label>
                      <input
                        type="text"
                        value={newRateNote}
                        onChange={(e) => setNewRateNote(e.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer"
                    >
                      Save New Rate (Preserve Historical Snapshots)
                    </button>
                  </form>

                  <div className="space-y-2 pt-3 border-t border-slate-800">
                    <h3 className="text-xs font-bold uppercase text-slate-400">
                      Historical Exchange Rate Log
                    </h3>
                    {erpData.exchangeRates.map(
                      (r: {
                        id: number;
                        rate: number;
                        effectiveDate: string;
                        note: string;
                      }) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between rounded border border-slate-800 bg-slate-900/50 px-3 py-2 text-xs"
                        >
                          <div>
                            <span className="font-mono-num font-bold text-amber-400">
                              1 USD = {r.rate.toFixed(2)} BDT
                            </span>
                            <p className="text-[10px] text-slate-400">{r.note}</p>
                          </div>
                          <span className="font-mono-num text-[11px] text-slate-400">
                            {r.effectiveDate}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==============================================================
              MODULE 10 & 11: AD CAMPAIGNS & CAMPAIGN CALENDAR
             ============================================================== */}
          {(activeModule === "campaigns" || activeModule === "calendar") && (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-800 bg-[#111827] p-5">
                <h2 className="text-lg font-bold text-white">
                  Deterministic Ad Campaign Lifecycle &amp; Schedule Manager
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Campaign status is computed dynamically from Scheduled Start Date, Start Time, End Date, End Time, and Manual Pause/Cancel overrides — requiring zero background cron workers.
                </p>

                <form
                  onSubmit={handleCreateCampaign}
                  className="mt-4 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3"
                >
                  <input
                    type="text"
                    placeholder="Campaign Name"
                    value={campaignForm.name}
                    onChange={(e) =>
                      setCampaignForm({ ...campaignForm, name: e.target.value })
                    }
                    className="sm:col-span-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                    required
                  />
                  <select
                    value={campaignForm.platform}
                    onChange={(e) =>
                      setCampaignForm({
                        ...campaignForm,
                        platform: e.target.value,
                      })
                    }
                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                  >
                    <option>Meta Ads (Facebook/Instagram)</option>
                    <option>Google Ads (Search/YouTube)</option>
                    <option>TikTok Business Ads</option>
                    <option>LinkedIn B2B Ads</option>
                  </select>
                  <input
                    type="date"
                    value={campaignForm.scheduledStartDate}
                    onChange={(e) =>
                      setCampaignForm({
                        ...campaignForm,
                        scheduledStartDate: e.target.value,
                      })
                    }
                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                    required
                  />
                  <input
                    type="date"
                    value={campaignForm.endDate}
                    onChange={(e) =>
                      setCampaignForm({
                        ...campaignForm,
                        endDate: e.target.value,
                      })
                    }
                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                    required
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer"
                  >
                    + Schedule Campaign
                  </button>
                </form>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {erpData.campaigns.map(
                  (c: {
                    id: number;
                    campaignCode: string;
                    name: string;
                    platform: string;
                    scheduledStartDate: string;
                    startTime: string;
                    endDate: string;
                    endTime: string;
                    currency: string;
                    clientBudgetMinor: number;
                    agencyFeeMinor: number;
                    actualAdSpendMinor: number;
                    badgeLabel: string;
                    statusSource: string;
                    timeRemainingText: string;
                    progressPercent: number;
                  }) => (
                    <div
                      key={c.id}
                      className="rounded-xl border border-slate-800 bg-[#111827] p-5 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-mono-num text-[11px] font-bold text-amber-400">
                            {c.campaignCode} • {c.platform}
                          </span>
                          <h3 className="text-sm font-bold text-white mt-0.5">
                            {c.name}
                          </h3>
                        </div>
                        <div className="text-right">
                          <span className="inline-block rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 text-[10px] font-bold text-amber-300">
                            {c.badgeLabel}
                          </span>
                          <p className="text-[10px] font-mono-num text-slate-400 mt-0.5">
                            Source: {c.statusSource}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-900/70 p-3 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block">
                            Client Ad Budget
                          </span>
                          <span className="font-mono-num font-bold text-white">
                            {formatMinorCurrency(c.clientBudgetMinor, c.currency)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">
                            Agency Retainer Fee
                          </span>
                          <span className="font-mono-num font-bold text-emerald-400">
                            {formatMinorCurrency(c.agencyFeeMinor, c.currency)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">
                            Actual Ad Spend
                          </span>
                          <span className="font-mono-num font-bold text-amber-300">
                            {formatMinorCurrency(c.actualAdSpendMinor, c.currency)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono-num">
                        <span>
                          Window: {c.scheduledStartDate} ({c.startTime}) →{" "}
                          {c.endDate} ({c.endTime})
                        </span>
                        <span>{c.timeRemainingText}</span>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                        <button
                          onClick={() =>
                            handleCampaignManualOverride(c.id, "ACTIVE")
                          }
                          className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/25 cursor-pointer"
                        >
                          <Play className="h-3 w-3" /> Auto/Active
                        </button>
                        <button
                          onClick={() =>
                            handleCampaignManualOverride(c.id, "PAUSED")
                          }
                          className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/25 cursor-pointer"
                        >
                          <Pause className="h-3 w-3" /> Pause
                        </button>
                        <button
                          onClick={() =>
                            handleCampaignManualOverride(c.id, "CANCELLED")
                          }
                          className="inline-flex items-center gap-1 rounded bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/25 cursor-pointer"
                        >
                          <XCircle className="h-3 w-3" /> Cancel
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* ==============================================================
              MODULE 13: COMPLETE SETTINGS CONTROL CENTER
             ============================================================== */}
          {activeModule === "settings" && (
            <div className="rounded-xl border border-slate-800 bg-[#111827] p-6 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Complete Settings Control Center (PostgreSQL Persistent)
                </h2>
                <p className="text-xs text-slate-400">
                  Manage business identity, invoice numbering, logo/signature assets, QR code defaults, and currency settings.
                </p>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const res = await fetch("/api/erp", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      action: "update_settings",
                      businessName: formData.get("businessName"),
                      tagline: formData.get("tagline"),
                      email: formData.get("email"),
                      phone: formData.get("phone"),
                      address: formData.get("address"),
                      taxId: formData.get("taxId"),
                      invoicePrefix: formData.get("invoicePrefix"),
                      timezone: formData.get("timezone"),
                      invoiceFooterNote: formData.get("invoiceFooterNote"),
                    }),
                  });
                  if (res.ok) {
                    showToast(
                      "Settings Control Center persisted to PostgreSQL database!"
                    );
                    await fetchAllData();
                  }
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">
                      Business Name
                    </label>
                    <input
                      name="businessName"
                      defaultValue={settings.businessName}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">
                      Tagline
                    </label>
                    <input
                      name="tagline"
                      defaultValue={settings.tagline}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">
                      Billing Email
                    </label>
                    <input
                      name="email"
                      defaultValue={settings.email}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">
                      Phone / WhatsApp
                    </label>
                    <input
                      name="phone"
                      defaultValue={settings.phone}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">
                      Tax / BIN / EIN Number
                    </label>
                    <input
                      name="taxId"
                      defaultValue={settings.taxId}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">
                      Invoice Number Prefix
                    </label>
                    <input
                      name="invoicePrefix"
                      defaultValue={settings.invoicePrefix}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono-num text-white"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-300 mb-1">
                      Headquarters Address
                    </label>
                    <input
                      name="address"
                      defaultValue={settings.address}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">
                      System Timezone (IANA)
                    </label>
                    <input
                      name="timezone"
                      defaultValue={settings.timezone}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono-num text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">
                    Invoice Compliance &amp; Payment Footer Note
                  </label>
                  <textarea
                    name="invoiceFooterNote"
                    rows={2}
                    defaultValue={settings.invoiceFooterNote}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                  />
                </div>

                {/* Branding Upload Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-800">
                  <label className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900 p-3.5 cursor-pointer hover:border-amber-500">
                    <div>
                      <span className="text-xs font-bold text-white block">
                        Upload Agency Logo
                      </span>
                      <span className="text-[11px] text-slate-400">
                        PNG / SVG / JPG
                      </span>
                    </div>
                    <Upload className="h-4 w-4 text-amber-400" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleAssetUpload(e, "LOGO")}
                      className="hidden"
                    />
                  </label>

                  <label className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900 p-3.5 cursor-pointer hover:border-amber-500">
                    <div>
                      <span className="text-xs font-bold text-white block">
                        Upload Executive Signature
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Transparent PNG / SVG
                      </span>
                    </div>
                    <Upload className="h-4 w-4 text-amber-400" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleAssetUpload(e, "SIGNATURE")}
                      className="hidden"
                    />
                  </label>

                  <label className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900 p-3.5 cursor-pointer hover:border-amber-500">
                    <div>
                      <span className="text-xs font-bold text-white block">
                        Upload Custom QR Image
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Validated &amp; Embedded in PDF
                      </span>
                    </div>
                    <Upload className="h-4 w-4 text-amber-400" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleAssetUpload(e, "QR_CODE")}
                      className="hidden"
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  className="rounded-lg bg-amber-500 px-6 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer"
                >
                  Save &amp; Persist All Settings
                </button>
              </form>
            </div>
          )}

          {/* ==============================================================
              MODULE 14: FILE UPLOADS & SHA-256 BACKUP / RESTORE
             ============================================================== */}
          {activeModule === "uploads_backups" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Backup & Restore */}
              <div className="lg:col-span-7 rounded-xl border border-slate-800 bg-[#111827] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-white">
                      SHA-256 Verified System Backup &amp; Restore
                    </h2>
                    <p className="text-xs text-slate-400">
                      Create instant snapshots, download JSON archives, and verify SHA-256 integrity before restore.
                    </p>
                  </div>
                  <button
                    onClick={handleCreateBackup}
                    className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer"
                  >
                    + Create Manual Backup
                  </button>
                </div>

                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
                  <label className="block text-xs font-bold text-amber-300">
                    Destructive Restore Safeguard — Type{" "}
                    <code className="bg-black/40 px-1.5 py-0.5 rounded">
                      RESTORE_CONFIRMED
                    </code>{" "}
                    before clicking Restore on any snapshot:
                  </label>
                  <input
                    type="text"
                    placeholder="Type RESTORE_CONFIRMED here to unlock restore buttons"
                    value={restoreConfirmInput}
                    onChange={(e) => setRestoreConfirmInput(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-mono-num text-white"
                  />
                </div>

                <div className="space-y-2.5">
                  {erpData.backups.map(
                    (b: {
                      id: number;
                      backupCode: string;
                      label: string;
                      recordCount: number;
                      sizeBytes: number;
                      checksumSha256: string;
                      payloadJson: string;
                      createdAt: string;
                    }) => (
                      <div
                        key={b.id}
                        className="rounded-lg border border-slate-800 bg-slate-900/60 p-3.5 flex flex-wrap items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono-num text-xs font-bold text-amber-400">
                              {b.backupCode}
                            </span>
                            <span className="text-xs font-bold text-white">
                              {b.label}
                            </span>
                          </div>
                          <p className="text-[11px] font-mono-num text-slate-400 mt-0.5">
                            {b.recordCount} records • {b.sizeBytes} bytes • SHA-256:{" "}
                            {b.checksumSha256.slice(0, 16)}...
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const blob = new Blob([b.payloadJson], {
                                type: "application/json",
                              });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = `${b.backupCode}_creatobee.json`;
                              a.click();
                            }}
                            className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-200 hover:bg-slate-700 cursor-pointer"
                          >
                            <Download className="h-3.5 w-3.5" /> Download
                          </button>
                          <button
                            onClick={() => handleRestoreBackup(b.id)}
                            className="inline-flex items-center gap-1 rounded border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25 cursor-pointer"
                          >
                            <RefreshCw className="h-3.5 w-3.5" /> Verify &amp; Restore
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Uploaded Files Registry */}
              <div className="lg:col-span-5 rounded-xl border border-slate-800 bg-[#111827] p-5 space-y-4">
                <h2 className="text-base font-bold text-white">
                  Safe Storage &amp; Uploaded Assets Registry
                </h2>
                <p className="text-xs text-slate-400">
                  Path-traversal sanitized filenames (`STORAGE_DIR`) with persistent Data URI mirrors for container compatibility.
                </p>

                <div className="space-y-2.5">
                  {erpData.uploadedFiles.map(
                    (f: {
                      id: number;
                      fileName: string;
                      safeStorageName: string;
                      category: string;
                      mimeType: string;
                      sizeBytes: number;
                    }) => (
                      <div
                        key={f.id}
                        className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 flex items-center justify-between"
                      >
                        <div>
                          <span className="text-xs font-bold text-white block">
                            {f.fileName}
                          </span>
                          <span className="font-mono-num text-[10px] text-slate-400">
                            {f.safeStorageName} ({f.mimeType} • {f.sizeBytes}B)
                          </span>
                        </div>
                        <span className="rounded bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                          {f.category}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==============================================================
              MODULE 15: SYSTEM DIAGNOSTICS, LOGS & AUTOMATED TEST SUITE
             ============================================================== */}
          {activeModule === "diagnostics" && (
            <div className="space-y-6">
              {/* Live Automated Test Suite Results */}
              <div className="rounded-xl border border-emerald-500/40 bg-[#111827] p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-emerald-400" />
                      Automated End-to-End System Verification Suite
                    </h2>
                    <p className="text-xs text-slate-400">
                      Executes live server-side verification across Local QR Generation, Decimal-Safe Balance Invariants, Historical FX Preservation, and Campaign Lifecycle logic.
                    </p>
                  </div>
                  <button
                    onClick={handleRunVerificationSuite}
                    disabled={runningTests}
                    className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 cursor-pointer"
                  >
                    {runningTests
                      ? "Executing Suite..."
                      : "Re-Run All Verification Tests"}
                  </button>
                </div>

                {testResults && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {testResults.map((tr, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase text-emerald-300">
                            {tr.suite}
                          </span>
                          <span className="rounded bg-emerald-500 text-slate-950 px-2 py-0.5 text-[10px] font-extrabold">
                            {tr.passed ? "PASSED" : "FAILED"}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-white">{tr.name}</p>
                        <p className="text-[11px] font-mono-num text-slate-300">
                          {tr.details}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Structured Server Diagnostic Logs */}
              <div className="rounded-xl border border-slate-800 bg-[#111827] p-5 space-y-4">
                <h2 className="text-base font-bold text-white">
                  Structured Server-Side Diagnostics &amp; Security Audit Logs
                </h2>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {erpData.systemLogs.map(
                    (log: {
                      id: number;
                      level: string;
                      category: string;
                      diagnosticCode: string;
                      message: string;
                      createdAt: string;
                    }) => (
                      <div
                        key={log.id}
                        className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 flex flex-wrap items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`rounded px-2 py-0.5 font-mono-num text-[10px] font-bold ${
                              log.level === "ERROR"
                                ? "bg-rose-500/20 text-rose-300"
                                : log.level === "WARN"
                                ? "bg-amber-500/20 text-amber-300"
                                : "bg-emerald-500/20 text-emerald-300"
                            }`}
                          >
                            {log.level} • {log.category}
                          </span>
                          <span className="font-mono-num font-bold text-amber-400">
                            [{log.diagnosticCode}]
                          </span>
                          <span className="text-slate-200">{log.message}</span>
                        </div>
                        <span className="font-mono-num text-[10px] text-slate-500">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
