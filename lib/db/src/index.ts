import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

function shouldUseSsl(databaseUrl: string): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.RAILWAY_ENVIRONMENT_NAME !== undefined ||
    process.env.RAILWAY_PUBLIC_DOMAIN !== undefined ||
    process.env.RENDER !== undefined ||
    databaseUrl.includes("sslmode=require")
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: shouldUseSsl(process.env.DATABASE_URL)
    ? { rejectUnauthorized: false }
    : undefined,
});
export const db = drizzle(pool, { schema });

export * from "./schema";
