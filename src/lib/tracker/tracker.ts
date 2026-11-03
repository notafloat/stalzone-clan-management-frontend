import "server-only";
import { eq, inArray, isNull, and } from "drizzle-orm";
import { getDb, type Db } from "@/lib/db/client";
import {
  activityDays,
  clanEvents,
  players,
  type EventType,
} from "@/lib/db/schema";
import { dayKey } from "@/lib/dates";
import { isAllowedClan, RANK_BY_ID, REGION } from "@/lib/members/members";
import { saveClanInfo } from "@/lib/members/store";
import { fetchStalzonePublic, StalzoneError } from "@/lib/stalzone/client";
import type {
  CharacterProfileData,
  ClanInfo,
  ClanMember,
} from "@/lib/stalzone/types";

const BATCH_SIZE = 8;
const UNKNOWN_RANK_ORDER = 99;

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Player = typeof players.$inferSelect;
type EventDraft = {
  type: EventType;
  playerName: string;
  fromValue: string | null;
  toValue: string | null;
  occurredAt: Date;
};

/** No caching: unlike the pages, the tracker must see the current value. */
const fetchProfile = (lookup: string) =>
  fetchStalzonePublic<CharacterProfileData>(
    `/${REGION}/character/${lookup}/profile`,
    0,
  );

const rankOrder = (rank: string) =>
  RANK_BY_ID[rank as ClanMember["rank"]]?.order ?? UNKNOWN_RANK_ORDER;

function changesSince(
  player: Player,
  profile: CharacterProfileData,
  now: Date,
): EventDraft[] {
  const events: EventDraft[] = [];
  const name = profile.username;

  if (name !== player.name) {
    events.push({
      type: "renamed",
      playerName: name,
      fromValue: player.name,
      toValue: name,
      occurredAt: now,
    });
  }

  if (!isAllowedClan(profile.clan?.info.id)) {
    events.push({
      type: "left",
      playerName: name,
      fromValue: player.rank,
      toValue: null,
      occurredAt: now,
    });
    return events;
  }

  const rank = profile.clan?.member.rank;
  if (rank && rank !== player.rank) {
    events.push({
      // Order 0 is the highest rank.
      type: rankOrder(rank) < rankOrder(player.rank) ? "promoted" : "demoted",
      playerName: name,
      fromValue: player.rank,
      toValue: rank,
      occurredAt: now,
    });
  }
  return events;
}

async function saveEvents(tx: Tx, uuid: string, events: EventDraft[]) {
  if (events.length === 0) return;
  await tx
    .insert(clanEvents)
    .values(events.map((event) => ({ ...event, playerUuid: uuid })))
    .onConflictDoNothing();
}

async function saveActivity(tx: Tx, uuid: string, lastLogin: Date | null) {
  if (!lastLogin) return;
  await tx
    .insert(activityDays)
    .values({ playerUuid: uuid, day: dayKey(lastLogin) })
    .onConflictDoNothing();
}

const toDate = (value?: string | null) => (value ? new Date(value) : null);

/** Returns the clan's details as this player's profile reports them, and the events recorded. */
async function trackPlayer(db: Db, uuid: string, now: Date) {
  const profile = await fetchProfile(`by-uuid/${encodeURIComponent(uuid)}`);

  const events = await db.transaction(async (tx) => {
    // The row lock makes an overlapping run wait, then see the changes and record nothing twice.
    const [player] = await tx
      .select()
      .from(players)
      .where(eq(players.uuid, uuid))
      .for("update");
    if (!player || player.leftAt) return 0;

    const events = changesSince(player, profile, now);
    const hasLeft = events.some(({ type }) => type === "left");
    const lastLogin = toDate(profile.lastLogin) ?? player.lastLogin;
    const hasNewLogin = lastLogin?.getTime() !== player.lastLogin?.getTime();

    await tx
      .update(players)
      .set({
        name: profile.username,
        rank: hasLeft
          ? player.rank
          : (profile.clan?.member.rank ?? player.rank),
        lastLogin,
        leftAt: hasLeft ? now : null,
        updatedAt: now,
      })
      .where(eq(players.uuid, uuid));
    await saveEvents(tx, uuid, events);
    if (hasNewLogin) await saveActivity(tx, uuid, lastLogin);
    return events.length;
  });

  const info = profile.clan?.info;
  return { events, clan: isAllowedClan(info?.id) ? info : undefined };
}

async function inBatches<T>(
  items: T[],
  run: (item: T) => Promise<void>,
): Promise<void> {
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    await Promise.all(items.slice(i, i + BATCH_SIZE).map(run));
  }
}

/** Checks every known member using only the app's credentials. */
export async function runTracker(db: Db) {
  const now = new Date();
  const active = await db
    .select({ uuid: players.uuid })
    .from(players)
    .where(isNull(players.leftAt));

  let events = 0;
  let failed = 0;
  let clan: ClanInfo | undefined;
  await inBatches(active, async ({ uuid }) => {
    try {
      const result = await trackPlayer(db, uuid, now);
      events += result.events;
      clan ??= result.clan;
    } catch (error) {
      failed++;
      console.error(`Tracker failed for player ${uuid}:`, error);
    }
  });
  if (clan) await saveClanInfo(db, clan);

  return { checked: active.length, events, failed };
}

async function addFromRoster(
  db: Db,
  { name, rank, joinTime }: ClanMember,
): Promise<void> {
  const profile = await fetchProfile(
    `by-name/${encodeURIComponent(name)}`,
  ).catch((error) => {
    if (error instanceof StalzoneError && error.status === 404) return null;
    throw error;
  });
  if (!profile) return;

  const joinedAt = new Date(joinTime);
  const lastLogin = toDate(profile.lastLogin);
  const now = new Date();

  await db.transaction(async (tx) => {
    const [known] = await tx
      .select()
      .from(players)
      .where(eq(players.uuid, profile.uuid))
      .for("update");

    if (known && !known.leftAt) {
      // Already tracked under an older name.
      await tx
        .update(players)
        .set({ name, updatedAt: now })
        .where(eq(players.uuid, known.uuid));
      await saveEvents(tx, known.uuid, [
        {
          type: "renamed",
          playerName: name,
          fromValue: known.name,
          toValue: name,
          occurredAt: now,
        },
      ]);
      return;
    }

    await tx
      .insert(players)
      .values({ uuid: profile.uuid, name, rank, joinedAt, lastLogin })
      .onConflictDoUpdate({
        target: players.uuid,
        set: { name, rank, joinedAt, lastLogin, leftAt: null, updatedAt: now },
      });
    await saveEvents(tx, profile.uuid, [
      {
        type: "joined",
        playerName: name,
        fromValue: null,
        toValue: rank,
        occurredAt: joinedAt,
      },
    ]);
    await saveActivity(tx, profile.uuid, lastLogin);
  });
}

/**
 * The roster needs a member's token, so the tracker can't read it by itself.
 * Pages call this with the roster they loaded, which is how new members are found.
 */
export async function recordRoster(roster: ClanMember[]): Promise<void> {
  const db = getDb();
  if (!db || roster.length === 0) return;

  const names = roster.map(({ name }) => name);
  const tracked = await db
    .select({ name: players.name })
    .from(players)
    .where(and(inArray(players.name, names), isNull(players.leftAt)));
  const trackedNames = new Set(tracked.map(({ name }) => name));

  await inBatches(
    roster.filter(({ name }) => !trackedNames.has(name)),
    (member) => addFromRoster(db, member),
  );
}
