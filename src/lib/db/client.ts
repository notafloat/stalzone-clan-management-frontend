import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { DATABASE_URL } from "@/lib/env";
import * as schema from "./schema";

const createDb = (url: string) => drizzle(postgres(url), { schema });

export type Db = ReturnType<typeof createDb>;

// Kept on globalThis so dev-mode reloads don't open a new connection pool each time.
const globalForDb = globalThis as unknown as { trackerDb?: Db };

/** Null when DATABASE_URL is not set: the site still works, it just records no history. */
export function getDb(): Db | null {
  if (!DATABASE_URL) return null;
  globalForDb.trackerDb ??= createDb(DATABASE_URL);
  return globalForDb.trackerDb;
}
