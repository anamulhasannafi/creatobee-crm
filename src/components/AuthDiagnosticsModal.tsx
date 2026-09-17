"use client";

import React, { useState } from "react";
import {
  Shield,
  Lock,
  KeyRound,
  UserPlus,
  CheckCircle2,
  AlertOctagon,
  Server,
  LogOut,
  X,
} from "lucide-react";

export interface AuthState {
  authenticated: boolean;
  admin: {
    id: number;
    username: string;
    email: string;
    displayName: string;
    role: string;
    csrfToken?: string;
    sessionExpiresAt?: string;
  } | null;
  setupRequired: boolean;
  diagnostics: {
    dbConnected: boolean;
    dbDiagnosticCode: string;
    dbSafeMessage: string;
    dbLatencyMs: number;
    nodeVersion: string;
    sessionSecretConfigured: boolean;
    cookieSecurePolicy: string;
    trustProxy: boolean;
    timezone: string;
    adminCount: number;
    activeSessionsCount: number;
  };
}

interface AuthModalProps {
  authState: AuthState | null;
  onClose: () => void;
  onAuthRefreshed: () => Promise<void>;
}

export function AuthDiagnosticsModal({
  authState,
  onClose,
  onAuthRefreshed,
}: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<
    "login" | "setup" | "forgot" | "diagnostics"
  >(authState?.setupRequired ? "setup" : "login");

  // Login State
  const [identifier, setIdentifier] = useState("admin");
  const [password, setPassword] = useState("CreatoBee#2026!");

  // Setup / Provision Admin State
  const [setupUsername, setSetupUsername] = useState("admin");
  const [setupEmail, setSetupEmail] = useState("admin@creatobee.com");
  const [setupDisplayName, setSetupDisplayName] = useState(
    "Tariqul Islam (Managing Director)"
  );
  const [setupPassword, setSetupPassword] = useState("CreatoBee#2026!");

  // Forgot / Reset Password State
  const [resetIdentifier, setResetIdentifier] = useState("admin@creatobee.com");
  const [issuedResetToken, setIssuedResetToken] = useState("");
  const [newPasswordReset, setNewPasswordReset] = useState("CreatoBee#2026!");

  const [statusBanner, setStatusBanner] = useState<{
    ok: boolean;
    code: string;
    message: string;
    remediation?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusBanner(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          identifier,
          password,
        }),
      });
      const data = await res.json();
      setStatusBanner({
        ok: Boolean(data.success),
        code: data.diagnosticCode || "AUTH_RESPONSE",
        message: data.message,
        remediation: data.remediation,
      });
      if (data.success) {
        await onAuthRefreshed();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusBanner(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "first_time_setup",
          username: setupUsername,
          email: setupEmail,
          displayName: setupDisplayName,
          password: setupPassword,
        }),
      });
      const data = await res.json();
      setStatusBanner({
        ok: Boolean(data.success),
        code: data.diagnosticCode || "AUTH_SETUP",
        message: data.message,
      });
      if (data.success) {
        await onAuthRefreshed();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRequestResetToken = async () => {
    setLoading(true);
    setStatusBanner(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "forgot_password",
          identifier: resetIdentifier,
        }),
      });
      const data = await res.json();
      if (data.success && data.recoveryToken) {
        setIssuedResetToken(data.recoveryToken);
      }
      setStatusBanner({
        ok: Boolean(data.success),
        code: data.diagnosticCode || "AUTH_RESET",
        message: data.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCompletePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusBanner(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset_password",
          resetToken: issuedResetToken,
          newPassword: newPasswordReset,
        }),
      });
      const data = await res.json();
      setStatusBanner({
        ok: Boolean(data.success),
        code: data.diagnosticCode || "AUTH_RESET_COMPLETE",
        message: data.message,
      });
      if (data.success) {
        await onAuthRefreshed();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      });
      setStatusBanner({
        ok: true,
        code: "AUTH_LOGOUT_OK",
        message: "Persistent database session terminated and cookie cleared.",
      });
      await onAuthRefreshed();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-[#0B0F17] text-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-[#111827] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Shield className="h-5 w-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-bold text-white">
                Admin Security, Persistent Session &amp; Login Diagnostics
              </h3>
              <p className="text-[11px] text-slate-400">
                PBKDF2-SHA512 Salted Hashing • PostgreSQL Session Persistence • Reverse-Proxy Cookie Guard
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/60 px-6 pt-2 gap-2 overflow-x-auto">
          {[
            { id: "login", label: "Admin Login", icon: Lock },
            { id: "setup", label: "First-Time Setup / Provision", icon: UserPlus },
            { id: "forgot", label: "Forgot / Reset Password", icon: KeyRound },
            { id: "diagnostics", label: "Login Diagnostics", icon: Server },
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as typeof activeTab)}
                className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-semibold transition cursor-pointer ${
                  active
                    ? "border-amber-400 text-amber-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Active Session Status Card */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#111827] p-3.5">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Current Session State
              </span>
              {authState?.authenticated && authState.admin ? (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-emerald-300">
                    Signed in as {authState.admin.displayName} ({authState.admin.username})
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span className="text-xs font-medium text-amber-300">
                    No active session cookie — Sign in below or provision admin
                  </span>
                </div>
              )}
            </div>

            {authState?.authenticated && (
              <button
                onClick={handleLogout}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/15 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/25 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            )}
          </div>

          {statusBanner && (
            <div
              className={`rounded-xl border p-3.5 text-xs space-y-1 ${
                statusBanner.ok
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                  : "border-rose-500/40 bg-rose-500/10 text-rose-200"
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5">
                  {statusBanner.ok ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <AlertOctagon className="h-4 w-4 text-rose-400" />
                  )}
                  {statusBanner.message}
                </span>
                <span className="font-mono-num text-[10px] px-2 py-0.5 rounded bg-black/40">
                  {statusBanner.code}
                </span>
              </div>
              {statusBanner.remediation && (
                <p className="text-[11px] text-slate-300 pl-5">
                  Remediation: {statusBanner.remediation}
                </p>
              )}
            </div>
          )}

          {/* TAB 1: ADMIN LOGIN */}
          {activeTab === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Administrator Email or Username
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="admin or admin@creatobee.com"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-white"
                  required
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Default verified credentials: <code className="text-amber-300">admin</code> /{" "}
                  <code className="text-amber-300">CreatoBee#2026!</code> (Test invalid password to inspect diagnosable error handling).
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("forgot")}
                  className="text-xs text-amber-400 hover:underline cursor-pointer"
                >
                  Forgot Password? Generate Recovery Token
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-amber-500 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer"
                >
                  {loading ? "Authenticating..." : "Sign In & Persist Session"}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: FIRST-TIME SETUP / PROVISION ADMIN */}
          {activeTab === "setup" && (
            <form onSubmit={handleSetupSubmit} className="space-y-4">
              <p className="text-xs text-slate-300">
                Ensure the agency owner is never locked out during fresh server deployments. Provision or update an administrator account with PBKDF2-SHA512 hashing:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Username</label>
                  <input
                    type="text"
                    value={setupUsername}
                    onChange={(e) => setSetupUsername(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Email</label>
                  <input
                    type="email"
                    value={setupEmail}
                    onChange={(e) => setSetupEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Display Name</label>
                  <input
                    type="text"
                    value={setupDisplayName}
                    onChange={(e) => setSetupDisplayName(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    New Password (min 8 chars)
                  </label>
                  <input
                    type="password"
                    value={setupPassword}
                    onChange={(e) => setSetupPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-emerald-500 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 cursor-pointer"
              >
                {loading ? "Provisioning..." : "Save Admin & Establish Session"}
              </button>
            </form>
          )}

          {/* TAB 3: FORGOT PASSWORD / RESET TOKEN */}
          {activeTab === "forgot" && (
            <div className="space-y-4">
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-xs text-slate-300 mb-1">
                    Admin Username or Email for Recovery
                  </label>
                  <input
                    type="text"
                    value={resetIdentifier}
                    onChange={(e) => setResetIdentifier(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleRequestResetToken}
                  disabled={loading}
                  className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer"
                >
                  Generate Recovery Token
                </button>
              </div>

              <form
                onSubmit={handleCompletePasswordReset}
                className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3"
              >
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Complete Password Reset with Token
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Recovery Token
                    </label>
                    <input
                      type="text"
                      value={issuedResetToken}
                      onChange={(e) => setIssuedResetToken(e.target.value)}
                      placeholder="CB-RST-XXXXXXXXXXXX"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono-num text-amber-300"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPasswordReset}
                      onChange={(e) => setNewPasswordReset(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 cursor-pointer"
                >
                  Verify Token &amp; Update Password
                </button>
              </form>
            </div>
          )}

          {/* TAB 4: LIVE LOGIN & PROXY DIAGNOSTICS */}
          {activeTab === "diagnostics" && authState?.diagnostics && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                <span className="text-slate-400">Database Connection Pool:</span>
                <p className="font-mono-num font-bold text-emerald-400 mt-0.5">
                  {authState.diagnostics.dbDiagnosticCode} ({authState.diagnostics.dbLatencyMs}ms)
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {authState.diagnostics.dbSafeMessage}
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                <span className="text-slate-400">Node.js Runtime &amp; Timezone:</span>
                <p className="font-mono-num font-bold text-white mt-0.5">
                  {authState.diagnostics.nodeVersion} • {authState.diagnostics.timezone}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Native crypto PBKDF2-SHA512 active
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                <span className="text-slate-400">Cookie &amp; Reverse Proxy Policy:</span>
                <p className="font-mono-num font-bold text-amber-300 mt-0.5">
                  Secure: {authState.diagnostics.cookieSecurePolicy} | TrustProxy:{" "}
                  {String(authState.diagnostics.trustProxy)}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Compatible with cPanel Passenger, Nginx, and Cloudflare SSL
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                <span className="text-slate-400">Persistent DB Sessions:</span>
                <p className="font-mono-num font-bold text-white mt-0.5">
                  {authState.diagnostics.adminCount} Admins •{" "}
                  {authState.diagnostics.activeSessionsCount} Active DB Sessions
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Survives server restarts &amp; multi-worker processes
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
