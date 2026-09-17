import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("[CREATOBEE_DB_CONFIG_ERROR] DATABASE_URL environment variable is not set.");
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl || "postgresql://postgres:postgres@127.0.0.1:5432/app_db",
    max: 15,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 8000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool, { schema });

export async function verifyDatabaseConnection(): Promise<{
  connected: boolean;
  diagnosticCode: string;
  safeMessage: string;
  latencyMs: number;
}> {
  const start = Date.now();
  if (!process.env.DATABASE_URL) {
    return {
      connected: false,
      diagnosticCode: "DB_MISSING_ENV",
      safeMessage: "DATABASE_URL environment variable is missing. Configure .env before starting.",
      latencyMs: Date.now() - start,
    };
  }
  try {
    const client = await pool.connect();
    try {
      await client.query("SELECT 1");
      return {
        connected: true,
        diagnosticCode: "DB_OK",
        safeMessage: "PostgreSQL connection pool active and healthy.",
        latencyMs: Date.now() - start,
      };
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : "Unknown database error";
    let diagnosticCode = "DB_CONNECTION_REFUSED";
    let safeMessage = "Unable to connect to PostgreSQL database. Check host, port, and service status.";
    if (rawMsg.includes("password authentication failed")) {
      diagnosticCode = "DB_AUTH_FAILED";
      safeMessage = "Database credentials rejected. Verify username and password in DATABASE_URL.";
    } else if (rawMsg.includes("does not exist")) {
      diagnosticCode = "DB_NOT_FOUND";
      safeMessage = "Target database or schema table does not exist. Run migrations (`npx drizzle-kit push`).";
    }
    return {
      connected: false,
      diagnosticCode,
      safeMessage,
      latencyMs: Date.now() - start,
    };
  }
}
