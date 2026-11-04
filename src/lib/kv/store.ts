import "server-only";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { kvMarks, kvWars, players } from "@/lib/db/schema";
import { RANK_BY_ID } from "@/lib/members/members";
import type { Lineup } from "@/lib/squads/lineup";
import type { ClanRank } from "@/lib/stalzone/types";
import {
  withUnmarkedAsOff,
  type KvMark,
  type KvWar,
  type StageMark,
} from "./kv";

const UNKNOWN_RANK_ORDER = 99;

export type KvPlayer = { uuid: string; name: string; rank: ClanRank };

export async function getKvPlayers(db: Db): Promise<KvPlayer[]> {
  const rows = await db
    .select({ uuid: players.uuid, name: players.name, rank: players.rank })
    .from(players)
    .where(isNull(players.leftAt))
    .orderBy(asc(players.joinedAt));
  const order = (rank: string) =>
    RANK_BY_ID[rank as ClanRank]?.order ?? UNKNOWN_RANK_ORDER;
  return rows
    .sort((a, b) => order(a.rank) - order(b.rank))
    .map((row) => ({ ...row, rank: row.rank as ClanRank }));
}

export async function getKvData(db: Db) {
  const [wars, marks] = await Promise.all([
    db.select().from(kvWars).orderBy(asc(kvWars.date)),
    db.select().from(kvMarks),
  ]);
  const byWar: Record<string, Record<string, KvMark>> = {};
  for (const {
    warDate,
    playerUuid,
    plan,
    stages,
    absence,
    reason,
    why,
  } of marks) {
    byWar[warDate] ??= {};
    byWar[warDate][playerUuid] = { plan, stages, absence, reason, why };
  }
  return {
    wars: wars.map(({ date, confirmed, mandatory }): KvWar => ({
      date,
      confirmed,
      mandatory,
    })),
    marks: byWar,
  };
}

/** Copies today's lineup, so that later lineup changes don't rewrite past wars. */
function firstMark(name: string, lineup: Lineup): KvMark {
  const plan =
    lineup.squads.find(({ players }) => players.includes(name))?.name ?? "";
  const reason = lineup.absentReason.find((entry) => entry.name === name);
  const isAbsent = Boolean(reason) || lineup.absentNo.includes(name);
  const stages: StageMark[] = isAbsent
    ? ["off", "off", "off"]
    : [null, null, null];
  return {
    plan,
    stages,
    absence: isAbsent ? (reason?.reason.trim() ? "reason" : "no") : "",
    reason: reason?.reason ?? "",
    why: "",
  };
}

/** False if that date already has a war. */
export async function createWar(
  db: Db,
  date: string,
  lineup: Lineup,
  mandatory: boolean,
  createdBy: string,
): Promise<boolean> {
  const roster = await getKvPlayers(db);
  return db.transaction(async (tx) => {
    const created = await tx
      .insert(kvWars)
      .values({ date, mandatory, createdBy })
      .onConflictDoNothing()
      .returning({ date: kvWars.date });
    if (created.length === 0) return false;
    if (roster.length > 0) {
      await tx.insert(kvMarks).values(
        roster.map(({ uuid, name }) => ({
          warDate: date,
          playerUuid: uuid,
          updatedBy: createdBy,
          ...firstMark(name, lineup),
        })),
      );
    }
    return true;
  });
}

export async function deleteWar(db: Db, date: string) {
  await db.transaction(async (tx) => {
    await tx.delete(kvMarks).where(eq(kvMarks.warDate, date));
    await tx.delete(kvWars).where(eq(kvWars.date, date));
  });
}

export type MarkUpdate = Omit<KvMark, "plan">;

export async function saveMarks(
  db: Db,
  date: string,
  updates: Record<string, MarkUpdate>,
  updatedBy: string,
) {
  await db.transaction(async (tx) => {
    for (const [playerUuid, update] of Object.entries(updates)) {
      await tx
        .update(kvMarks)
        .set({ ...update, updatedBy, updatedAt: new Date() })
        .where(
          and(eq(kvMarks.warDate, date), eq(kvMarks.playerUuid, playerUuid)),
        );
    }
  });
}

/**
 * Fills in what is still unmarked here, on the current rows, so that a page opened
 * earlier can't overwrite marks another officer has saved since.
 */
export async function confirmWar(db: Db, date: string, updatedBy: string) {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(kvMarks)
      .where(eq(kvMarks.warDate, date))
      .for("update");

    const marks: Record<string, KvMark> = {};
    let filled = 0;
    for (const { playerUuid, plan, stages, absence, reason, why } of rows) {
      const mark = { plan, stages, absence, reason, why };
      const finished = withUnmarkedAsOff(mark);
      marks[playerUuid] = finished;
      if (finished === mark) continue;
      filled++;
      await tx
        .update(kvMarks)
        .set({
          stages: finished.stages,
          absence: finished.absence,
          updatedBy,
          updatedAt: new Date(),
        })
        .where(
          and(eq(kvMarks.warDate, date), eq(kvMarks.playerUuid, playerUuid)),
        );
    }
    await tx
      .update(kvWars)
      .set({ confirmed: true })
      .where(eq(kvWars.date, date));
    return { marks, filled };
  });
}

export async function warExists(db: Db, date: string) {
  const rows = await db
    .select({ date: kvWars.date })
    .from(kvWars)
    .where(inArray(kvWars.date, [date]));
  return rows.length > 0;
}
