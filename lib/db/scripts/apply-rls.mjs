import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import dotenv from "dotenv";
import pg from "pg";

const { Client } = pg;

function loadEnv() {
  const envPath = path.resolve(process.cwd(), "../../.env");
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

async function main() {
  loadEnv();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to apply RLS policies.");
  }

  const sqlPath = path.resolve(process.cwd(), "./scripts/rls-policies.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");

  const client = new Client({
    connectionString: databaseUrl,
    ssl:
      process.env.NODE_ENV === "production" ||
      databaseUrl.includes("sslmode=require") ||
      process.env.RAILWAY_ENVIRONMENT_NAME ||
      process.env.RENDER
        ? { rejectUnauthorized: false }
        : undefined,
  });

  await client.connect();
  try {
    await client.query("begin");
    await client.query(sql);

    // Quick verification: list all tables with RLS enabled in public schema.
    const verification = await client.query(`
      select
        n.nspname as schemaname,
        c.relname as tablename,
        c.relrowsecurity as rowsecurity,
        c.relforcerowsecurity as forcerowsecurity
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind = 'r'
      order by c.relname;
    `);

    const roleInfo = await client.query(`
      select current_user as role_name, r.rolsuper, r.rolbypassrls
      from pg_roles r
      where r.rolname = current_user
    `);

    await client.query("commit");

    const enabledRows = verification.rows.filter((row) => row.rowsecurity);

    console.log("RLS policy script applied successfully.");
    console.log(`Tables with RLS enabled: ${enabledRows.length}`);
    for (const row of enabledRows) {
      console.log(
        `- ${row.schemaname}.${row.tablename} (force=${row.forcerowsecurity ? "yes" : "no"})`,
      );
    }

    const currentRole = roleInfo.rows[0];
    if (currentRole) {
      console.log(
        `Current DB role: ${currentRole.role_name} (superuser=${currentRole.rolsuper ? "yes" : "no"}, bypassrls=${currentRole.rolbypassrls ? "yes" : "no"})`,
      );
      if (currentRole.rolsuper || currentRole.rolbypassrls) {
        console.warn(
          "WARNING: This role can bypass RLS. Use a restricted application role in production for structural enforcement.",
        );
      }
    }
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Failed to apply RLS policies:", error);
  process.exitCode = 1;
});
