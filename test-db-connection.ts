import { pool } from "./lib/db/src";

async function testConnection() {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("Database connection successful:", res.rows[0]);
    process.exit(0);
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
}

testConnection();
