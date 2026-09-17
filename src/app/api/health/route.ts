import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({
      ok: true,
      system: "Creato Bee Advanced Business Management System v4.2",
      database: "connected",
      localQrEngine: "active (zero external API dependency)",
      nodeVersion: process.version,
      timezone: process.env.APP_TIMEZONE || process.env.TZ || "Asia/Dhaka",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Database healthcheck failed",
      },
      { status: 500 }
    );
  }
}
