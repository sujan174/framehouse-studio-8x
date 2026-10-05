import "server-only";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");
const pool = new Pool({
  connectionString: url,
  max: 10,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  statement_timeout: 5000,
});
export const db = drizzle(pool);
export async function checkDatabase() {
  const client = await pool.connect();
  try {
    await client.query("select 1 from projects limit 1");
  } finally {
    client.release();
  }
}
