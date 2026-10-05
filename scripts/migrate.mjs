import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  connectionTimeoutMillis: 5000,
  statement_timeout: 30000,
  lock_timeout: 5000,
});
try {
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  console.log("Database migrations applied");
} finally {
  await pool.end();
}
