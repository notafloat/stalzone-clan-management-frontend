import "server-only";
import { and, asc, desc, eq, isNull, max } from "drizzle-orm";
import { cache } from "react";
import type { Db } from "@/lib/db/client";
import { activityDays, clanEvents, clanInfo, players } from "@/lib/db/schema";
import type { CharacterClanInfo, ClanInfo } from "@/lib/stalzone/types";

const CURRENT_CLAN_ID = 1;

/**
 * Older data means the tracker has stopped, for example because the PC is off.
 * Pages then use the API instead, so that a player who left doesn't keep access indefinitely.
 */
const MAX_DATA_AGE_MS = 60 * 60 * 1000;

const isFresh = (date: Date | null) =>
  date !== null && Date.now() - date.getTime() < MAX_DATA_AGE_MS;

/** When the tracker last checked the clan, or null if that is too long ago to rely on. */
export const getFreshTrackedAt = cache(async (db: Db) => {
  const [row] = await db
    .select({ trackedAt: max(players.updatedAt) })
    .from(players)
    .where(isNull(players.leftAt));
  const trackedAt = row?.trackedAt ?? null;
  return isFresh(trackedAt) ? trackedAt : null;
});

/** Null when the database can't answer, so the caller should ask the API. */
export async function getStoredMembership(
  db: Db,
  characterId: string,
): Promise<CharacterClanInfo | null> {
  const [[player], [clan]] = await Promise.all([
    db
      .select()
      .from(players)
      .where(and(eq(players.characterId, characterId), isNull(players.leftAt))),
    db.select().from(clanInfo).where(eq(clanInfo.id, CURRENT_CLAN_ID)),
  ]);
  if (!player || !clan || !isFresh(player.updatedAt)) return null;

  return {
    info: clan.data,
    member: {
      name: player.name,
      rank: player.rank as CharacterClanInfo["member"]["rank"],
      joinTime: player.joinedAt.toISOString(),
    },
  };
}

/** Null when the database can't answer, so the caller should ask the API. */
export async function getStoredPlayers(db: Db) {
  if (!(await getFreshTrackedAt(db))) return null;
  const rows = await db
    .select()
    .from(players)
    .where(isNull(players.leftAt))
    .orderBy(asc(players.joinedAt));
  return rows.length > 0 ? rows : null;
}

/** Only for officers and above: the caller must check the rank first. */
export async function getMemberNotes(db: Db) {
  const rows = await db
    .select({
      name: players.name,
      note: players.note,
      noteUpdatedBy: players.noteUpdatedBy,
    })
    .from(players)
    .where(isNull(players.leftAt));
  return new Map(rows.map((row) => [row.name, row]));
}

/** Also finds players who have left, so their history can still be shown. */
export async function findPlayerByName(db: Db, name: string) {
  const rows = await db.select().from(players).where(eq(players.name, name));
  return rows.find(({ leftAt }) => leftAt === null) ?? rows[0] ?? null;
}

export const getPlayerEvents = (db: Db, uuid: string) =>
  db
    .select()
    .from(clanEvents)
    .where(eq(clanEvents.playerUuid, uuid))
    .orderBy(desc(clanEvents.occurredAt), desc(clanEvents.id));

export async function getActivityDays(db: Db, uuid: string) {
  const rows = await db
    .select({ day: activityDays.day })
    .from(activityDays)
    .where(eq(activityDays.playerUuid, uuid));
  return new Set(rows.map(({ day }) => day));
}

export async function saveClanInfo(db: Db, info: ClanInfo) {
  const values = { data: info, updatedAt: new Date() };
  await db
    .insert(clanInfo)
    .values({ id: CURRENT_CLAN_ID, ...values })
    .onConflictDoUpdate({ target: clanInfo.id, set: values });
}

/** A character's ID isn't known to match its UUID, so the link is recorded after a live check. */
export async function linkCharacter(
  db: Db,
  characterId: string,
  playerName: string,
) {
  await db
    .update(players)
    .set({ characterId })
    .where(and(eq(players.name, playerName), isNull(players.leftAt)));
}
