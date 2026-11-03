"use server";

import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { clanEvents } from "@/lib/db/schema";
import { isOfficerRank } from "@/lib/members/members";
import { getCurrentMembership } from "@/lib/members/roster";

const MAX_NOTE_LENGTH = 500;

/** Callable by anyone who can reach the site, so the rank is checked here, live. */
export async function saveEventNote(
  eventId: number,
  note: string,
): Promise<boolean> {
  const db = getDb();
  if (!db) return false;

  const { clan } = await getCurrentMembership("/journal", {
    live: true,
  });
  if (!isOfficerRank(clan.member.rank)) return false;
  if (!Number.isSafeInteger(eventId) || typeof note !== "string") return false;

  const saved = await db
    .update(clanEvents)
    .set({
      note: note.trim().slice(0, MAX_NOTE_LENGTH) || null,
      noteUpdatedBy: clan.member.name,
      noteUpdatedAt: new Date(),
    })
    .where(eq(clanEvents.id, eventId))
    .returning({ id: clanEvents.id });
  return saved.length > 0;
}
