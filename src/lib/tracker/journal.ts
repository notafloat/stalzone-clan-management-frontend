import "server-only";
import { desc, eq } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { clanEvents, players, type EventType } from "@/lib/db/schema";

const MAX_EVENTS = 1000;

export type JournalEvent = {
  id: number;
  type: EventType;
  /** The name when the event happened. */
  name: string;
  /** Links to the profile need today's name. */
  currentName: string;
  inClan: boolean;
  fromValue: string | null;
  toValue: string | null;
  occurredAt: Date;
  /** Left out entirely for players who may not read notes. */
  note?: string;
  noteUpdatedBy?: string;
};

export async function getJournalEvents(
  db: Db,
  { includeNotes }: { includeNotes: boolean },
): Promise<JournalEvent[]> {
  const rows = await db
    .select({
      id: clanEvents.id,
      type: clanEvents.type,
      name: clanEvents.playerName,
      currentName: players.name,
      leftAt: players.leftAt,
      fromValue: clanEvents.fromValue,
      toValue: clanEvents.toValue,
      occurredAt: clanEvents.occurredAt,
      note: clanEvents.note,
      noteUpdatedBy: clanEvents.noteUpdatedBy,
    })
    .from(clanEvents)
    .innerJoin(players, eq(players.uuid, clanEvents.playerUuid))
    .orderBy(desc(clanEvents.occurredAt), desc(clanEvents.id))
    .limit(MAX_EVENTS);

  return rows.map(({ leftAt, note, noteUpdatedBy, ...event }) => ({
    ...event,
    inClan: leftAt === null,
    ...(includeNotes
      ? { note: note ?? "", noteUpdatedBy: noteUpdatedBy ?? undefined }
      : {}),
  }));
}
