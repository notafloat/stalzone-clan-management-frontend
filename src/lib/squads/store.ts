import "server-only";
import { and, eq } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { lineups } from "@/lib/db/schema";
import { defaultLineup, parseLineup, type Lineup } from "./lineup";

const CURRENT_LINEUP_ID = 1;

export async function getLineup(db: Db) {
  const [row] = await db
    .select()
    .from(lineups)
    .where(eq(lineups.id, CURRENT_LINEUP_ID));
  return {
    lineup: (row && parseLineup(row.data)) ?? defaultLineup(),
    version: row?.version ?? 0,
  };
}

/** Returns the new version, or null if someone else saved since `expectedVersion`. */
export async function writeLineup(
  db: Db,
  lineup: Lineup,
  expectedVersion: number,
  updatedBy: string,
): Promise<number | null> {
  const version = expectedVersion + 1;
  const values = { data: lineup, version, updatedBy, updatedAt: new Date() };

  const saved =
    expectedVersion === 0
      ? await db
          .insert(lineups)
          .values({ id: CURRENT_LINEUP_ID, ...values })
          .onConflictDoNothing()
          .returning({ version: lineups.version })
      : await db
          .update(lineups)
          .set(values)
          .where(
            and(
              eq(lineups.id, CURRENT_LINEUP_ID),
              eq(lineups.version, expectedVersion),
            ),
          )
          .returning({ version: lineups.version });
  return saved[0]?.version ?? null;
}
