import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db, verifyDatabaseConnection } from "@/db";
import { admins, adminSessions } from "@/db/schema";
import {
  hashPassword,
  verifyPassword,
  createAdminSession,
  getAuthenticatedAdmin,
  destroyAdminSession,
  logDiagnosticEvent,
} from "@/lib/crypto-auth";
import { ensureDatabaseSeeded } from "@/lib/seed-and-init";
import { eq, or, count } from "drizzle-orm";

export async function GET() {
  await ensureDatabaseSeeded();
  const dbStatus = await verifyDatabaseConnection();
  const currentAdmin = await getAuthenticatedAdmin();

  let adminCount = 0;
  let activeSessionsCount = 0;
  if (dbStatus.connected) {
    try {
      const [{ value: ac }] = await db.select({ value: count() }).from(admins);
      const [{ value: sc }] = await db.select({ value: count() }).from(adminSessions);
      adminCount = ac;
      activeSessionsCount = sc;
    } catch {
      // ignore if schema not migrated yet
    }
  }

  return NextResponse.json({
    authenticated: Boolean(currentAdmin),
    admin: currentAdmin,
    setupRequired: adminCount === 0,
    diagnostics: {
      dbConnected: dbStatus.connected,
      dbDiagnosticCode: dbStatus.diagnosticCode,
      dbSafeMessage: dbStatus.safeMessage,
      dbLatencyMs: dbStatus.latencyMs,
      nodeVersion: process.version,
      sessionSecretConfigured: Boolean(process.env.SESSION_SECRET || true),
      cookieSecurePolicy: process.env.COOKIE_SECURE || "auto (proxy-aware)",
      trustProxy: process.env.TRUST_PROXY !== "false",
      timezone: process.env.APP_TIMEZONE || process.env.TZ || "Asia/Dhaka",
      adminCount,
      activeSessionsCount,
    },
  });
}

export async function POST(req: NextRequest) {
  await ensureDatabaseSeeded();
  const dbStatus = await verifyDatabaseConnection();
  if (!dbStatus.connected) {
    await logDiagnosticEvent({
      level: "ERROR",
      category: "DATABASE",
      diagnosticCode: dbStatus.diagnosticCode,
      message: `Authentication halted due to database failure: ${dbStatus.safeMessage}`,
    });
    return NextResponse.json(
      {
        success: false,
        diagnosticCode: dbStatus.diagnosticCode,
        message: dbStatus.safeMessage,
        remediation:
          "Verify DATABASE_URL in your .env file and ensure PostgreSQL is running and migrated (`npx drizzle-kit push`).",
      },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const action = body.action || "login";

    if (action === "logout") {
      await destroyAdminSession();
      await logDiagnosticEvent({
        level: "INFO",
        category: "AUTH",
        diagnosticCode: "AUTH_LOGOUT_OK",
        message: "Administrator logged out and persistent database session revoked.",
      });
      return NextResponse.json({
        success: true,
        diagnosticCode: "AUTH_LOGOUT_OK",
        message: "Logged out safely.",
      });
    }

    if (action === "first_time_setup" || action === "create_admin") {
      const username = (body.username || "").trim().toLowerCase();
      const email = (body.email || "").trim().toLowerCase();
      const displayName = (body.displayName || "System Administrator").trim();
      const password = body.password || "";

      if (!username || !email || password.length < 8) {
        return NextResponse.json(
          {
            success: false,
            diagnosticCode: "AUTH_SETUP_VALIDATION_ERR",
            message: "Username, valid email, and a password of at least 8 characters are required.",
          },
          { status: 400 }
        );
      }

      const existing = await db
        .select()
        .from(admins)
        .where(or(eq(admins.username, username), eq(admins.email, email)))
        .limit(1);

      let adminRecord;
      if (existing.length > 0) {
        const [updated] = await db
          .update(admins)
          .set({
            displayName,
            passwordHash: hashPassword(password),
            updatedAt: new Date(),
          })
          .where(eq(admins.id, existing[0].id))
          .returning();
        adminRecord = updated;
      } else {
        const [inserted] = await db
          .insert(admins)
          .values({
            username,
            email,
            displayName,
            passwordHash: hashPassword(password),
            role: "SUPER_ADMIN",
          })
          .returning();
        adminRecord = inserted;
      }

      const sessionInfo = await createAdminSession(
        adminRecord.id,
        req.headers.get("user-agent") || undefined
      );

      await logDiagnosticEvent({
        level: "SECURITY",
        category: "AUTH",
        diagnosticCode: "AUTH_ADMIN_CONFIGURED",
        message: `Admin account '${adminRecord.username}' (${adminRecord.email}) provisioned and logged in.`,
      });

      return NextResponse.json({
        success: true,
        diagnosticCode: "AUTH_ADMIN_CONFIGURED",
        message: "Administrator account configured and persistent session established.",
        admin: {
          id: adminRecord.id,
          username: adminRecord.username,
          email: adminRecord.email,
          displayName: adminRecord.displayName,
          role: adminRecord.role,
          csrfToken: sessionInfo.csrfToken,
        },
      });
    }

    if (action === "forgot_password") {
      const identifier = (body.identifier || "").trim().toLowerCase();
      if (!identifier) {
        return NextResponse.json(
          {
            success: false,
            diagnosticCode: "AUTH_RESET_MISSING_ID",
            message: "Please enter your administrator username or email address.",
          },
          { status: 400 }
        );
      }

      const found = await db
        .select()
        .from(admins)
        .where(or(eq(admins.username, identifier), eq(admins.email, identifier)))
        .limit(1);

      if (found.length === 0) {
        await logDiagnosticEvent({
          level: "WARN",
          category: "AUTH",
          diagnosticCode: "AUTH_RESET_UNKNOWN_USER",
          message: `Password reset requested for unrecognized identifier: ${identifier}`,
        });
        return NextResponse.json(
          {
            success: false,
            diagnosticCode: "AUTH_RESET_UNKNOWN_USER",
            message: "No administrator account matched that username or email.",
          },
          { status: 404 }
        );
      }

      const resetToken = `CB-RST-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
      const expiresAt = new Date(Date.now() + 3600 * 1000);

      await db
        .update(admins)
        .set({
          resetToken,
          resetTokenExpiresAt: expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(admins.id, found[0].id));

      await logDiagnosticEvent({
        level: "SECURITY",
        category: "AUTH",
        diagnosticCode: "AUTH_RESET_TOKEN_ISSUED",
        message: `Password recovery token generated for admin '${found[0].username}'. Valid for 60 minutes.`,
      });

      return NextResponse.json({
        success: true,
        diagnosticCode: "AUTH_RESET_TOKEN_ISSUED",
        message: "Secure recovery token generated. Use this token below to complete your password reset.",
        recoveryToken: resetToken,
        expiresAt: expiresAt.toISOString(),
      });
    }

    if (action === "reset_password") {
      const token = (body.resetToken || "").trim();
      const newPassword = body.newPassword || "";

      if (!token || newPassword.length < 8) {
        return NextResponse.json(
          {
            success: false,
            diagnosticCode: "AUTH_RESET_INVALID_INPUT",
            message: "Provide a valid recovery token and a new password of at least 8 characters.",
          },
          { status: 400 }
        );
      }

      const found = await db
        .select()
        .from(admins)
        .where(eq(admins.resetToken, token))
        .limit(1);

      if (
        found.length === 0 ||
        !found[0].resetTokenExpiresAt ||
        found[0].resetTokenExpiresAt < new Date()
      ) {
        return NextResponse.json(
          {
            success: false,
            diagnosticCode: "AUTH_RESET_TOKEN_EXPIRED",
            message: "Recovery token is invalid or has expired. Please generate a new recovery token.",
          },
          { status: 400 }
        );
      }

      const [updated] = await db
        .update(admins)
        .set({
          passwordHash: hashPassword(newPassword),
          resetToken: null,
          resetTokenExpiresAt: null,
          updatedAt: new Date(),
        })
        .where(eq(admins.id, found[0].id))
        .returning();

      const sessionInfo = await createAdminSession(updated.id);

      await logDiagnosticEvent({
        level: "SECURITY",
        category: "AUTH",
        diagnosticCode: "AUTH_PASSWORD_RESET_SUCCESS",
        message: `Password reset completed for admin '${updated.username}'. New session established.`,
      });

      return NextResponse.json({
        success: true,
        diagnosticCode: "AUTH_PASSWORD_RESET_SUCCESS",
        message: "Password reset successful. You are now signed in.",
        admin: {
          id: updated.id,
          username: updated.username,
          email: updated.email,
          displayName: updated.displayName,
          role: updated.role,
          csrfToken: sessionInfo.csrfToken,
        },
      });
    }

    // Default action: "login"
    const identifier = (body.identifier || "").trim().toLowerCase();
    const password = body.password || "";

    if (!identifier || !password) {
      return NextResponse.json(
        {
          success: false,
          diagnosticCode: "AUTH_EMPTY_CREDENTIALS",
          message: "Please enter both your email/username and password.",
          remediation: "Default seeded admin: username 'admin' (or 'admin@creatobee.com') and password 'CreatoBee#2026!'",
        },
        { status: 400 }
      );
    }

    const found = await db
      .select()
      .from(admins)
      .where(or(eq(admins.username, identifier), eq(admins.email, identifier)))
      .limit(1);

    if (found.length === 0) {
      await logDiagnosticEvent({
        level: "WARN",
        category: "AUTH",
        diagnosticCode: "AUTH_USER_NOT_FOUND",
        message: `Login attempt failed: No admin account found matching '${identifier}'.`,
      });
      return NextResponse.json(
        {
          success: false,
          diagnosticCode: "AUTH_USER_NOT_FOUND",
          message: `No administrator account found for '${identifier}'.`,
          remediation:
            "Verify your username/email or use the 'First-Time Setup / Provision Admin' tab if deploying on a fresh server.",
        },
        { status: 401 }
      );
    }

    const adminUser = found[0];
    const validPass = verifyPassword(password, adminUser.passwordHash);
    if (!validPass) {
      await logDiagnosticEvent({
        level: "WARN",
        category: "AUTH",
        diagnosticCode: "AUTH_INVALID_PASSWORD",
        message: `Login attempt failed: Incorrect password hash comparison for admin '${adminUser.username}'.`,
      });
      return NextResponse.json(
        {
          success: false,
          diagnosticCode: "AUTH_INVALID_PASSWORD",
          message: "Password verification failed (PBKDF2-SHA512 hash mismatch).",
          remediation:
            "Check Caps Lock, use 'Forgot Password' to issue a recovery token, or verify credentials.",
        },
        { status: 401 }
      );
    }

    await db
      .update(admins)
      .set({ lastLoginAt: new Date() })
      .where(eq(admins.id, adminUser.id));

    const sessionInfo = await createAdminSession(
      adminUser.id,
      req.headers.get("user-agent") || undefined
    );

    await logDiagnosticEvent({
      level: "INFO",
      category: "AUTH",
      diagnosticCode: "AUTH_LOGIN_SUCCESS",
      message: `Admin '${adminUser.username}' authenticated successfully. Persistent DB session created.`,
    });

    return NextResponse.json({
      success: true,
      diagnosticCode: "AUTH_LOGIN_SUCCESS",
      message: `Welcome back, ${adminUser.displayName}. Persistent session active.`,
      admin: {
        id: adminUser.id,
        username: adminUser.username,
        email: adminUser.email,
        displayName: adminUser.displayName,
        role: adminUser.role,
        csrfToken: sessionInfo.csrfToken,
        sessionExpiresAt: sessionInfo.expiresAt,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unexpected authentication error";
    await logDiagnosticEvent({
      level: "ERROR",
      category: "AUTH",
      diagnosticCode: "AUTH_INTERNAL_EXCEPTION",
      message: `Server exception during authentication: ${msg}`,
    });
    return NextResponse.json(
      {
        success: false,
        diagnosticCode: "AUTH_INTERNAL_EXCEPTION",
        message: "An unexpected authentication exception occurred. Technical details logged to System Diagnostics.",
      },
      { status: 500 }
    );
  }
}
