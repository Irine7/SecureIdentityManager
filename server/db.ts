import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "process";
import * as schema from "@shared/schema";

if (!env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set in environment variables");
}

// Connect to PostgresQL
const client = postgres(env.DATABASE_URL);
export const db = drizzle(client, { schema });

// Export for use with DB migrations
export { client };