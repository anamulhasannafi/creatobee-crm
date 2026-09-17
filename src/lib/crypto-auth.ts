import crypto from "crypto";
import { cookies, headers } from "next/headers";
import { db } from "@/db";
import { admins, adminSessions, systemLogs } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";

export const SESSION_COOKIE_NAME = "creatobee_erp_session";

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return `pbkdf2_sha512$100000$${salt}$${derivedKey}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const parts = storedHash.split("$");
    if (parts.length !== 4 || parts[0] !== "pbkdf2_sha512") {
      return false;
    }
    const iterations = parseInt(parts[1], 10);
    const salt = parts[2];
    const originalKey = parts[3];
    const derivedKey = crypto
      .pbkdf2Sync(password, salt, iterations, 64, "sha512")
      .toString("hex");
    return crypto.timingSafeEqual(
      Buffer.from(originalKey, "hex"),
      Buffer.from(derivedKey, "hex")
    );
  } catch {
    return false;
  }
}

export function hashSessionToken(rawToken: string): string {
  const secret = process.env.SESSION_SECRET || "creatobee_default_fallback_secret_2026_erp";
  return crypto.createHmac("sha256", secret).update(rawToken).digest("hex");
}

export async function logDiagnosticEvent(params: {
  level: "INFO" | "WARN" | "ERROR" | "SECURITY";
  category: "AUTH" | "DATABASE" | "MIGRATION" | "QR_PDF" | "UPLOAD" | "FINANCE" | "CAMPAIGN" | "SYSTEM";
  diagnosticCode: string;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await db.insert(systemLogs).values({
      level: params.level,
      category: params.category,
      diagnosticCode: params.diagnosticCode,
      message: params.message,
      metadataJson: params.metadata ? JSON.stringify(params.metadata) : null,
    });
  } catch (err) {
    console.error("[DIAGNOSTIC_LOG_WRITE_ERROR]", params.diagnosticCode, err);
  }
}

export async function createAdminSession(adminId: number, userAgent?: string, ipAddress?: string) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(rawToken);
  const csrfToken = crypto.randomBytes(24).toString("hex");
  const ttlHours = Number(process.env.AUTH_SESSION_TTL_HOURS || "168");
  const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000);

  await db.insert(adminSessions).values({
    tokenHash,
    adminId,
    userAgent: userAgent || "Browser Client",
    ipAddress: ipAddress || "127.0.0.1",
    csrfToken,
    expiresAt,
  });

  // Determine cookie security dynamically for cPanel / Nginx / Reverse Proxy compatibility
  let isSecure = false;
  if (process.env.COOKIE_SECURE === "true") {
    isSecure = true;
  } else if (process.env.COOKIE_SECURE !== "false") {
    try {
      const hdrs = await headers();
      const proto = hdrs.get("x-forwarded-proto");
      if (proto === "https") {
        isSecure = true;
      }
    } catch {
      isSecure = false;
    }
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: isSecure,
    expires: expiresAt,
  });

  return { rawToken, csrfToken, expiresAt };
}

export async function getAuthenticatedAdmin() {
  try {
    const cookieStore = await cookies();
    const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!rawToken) {
      return null;
    }
    const tokenHash = hashSessionToken(rawToken);
    const now = new Date();

    const rows = await db
      .select({
        session: adminSessions,
        admin: admins,
      })
      .from(adminSessions)
      .innerJoin(admins, eq(adminSessions.adminId, admins.id))
      .where(and(eq(adminSessions.tokenHash, tokenHash), gt(adminSessions.expiresAt, now)))
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    return {
      id: rows[0].admin.id,
      username: rows[0].admin.username,
      email: rows[0].admin.email,
      displayName: rows[0].admin.displayName,
      role: rows[0].admin.role,
      csrfToken: rows[0].session.csrfToken,
      sessionExpiresAt: rows[0].session.expiresAt,
    };
  } catch (err) {
    console.error("[AUTH_SESSION_CHECK_ERROR]", err);
    return null;
  }
}

export async function destroyAdminSession() {
  try {
    const cookieStore = await cookies();
    const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (rawToken) {
      const tokenHash = hashSessionToken(rawToken);
      await db.delete(adminSessions).where(eq(adminSessions.tokenHash, tokenHash));
    }
    cookieStore.delete(SESSION_COOKIE_NAME);
  } catch (err) {
    console.error("[DESTROY_SESSION_ERROR]", err);
  }
}
