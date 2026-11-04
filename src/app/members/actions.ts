"use server";

import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { players } from "@/lib/db/schema";
import { isOfficerRank, MAX_NOTE_LENGTH } from "@/lib/members/members";
import { getCurrentMembership } from "@/lib/members/roster";

/** Callable by anyone who can reach the site, so the rank is checked here, live. */
export async function saveMemberNote(
  name: string,
  note: string,
): Promise<boolean> {
  const db = getDb();
  if (!db) return false;

  const { clan } = await getCurrentMembership("/members", { live: true });
  if (!isOfficerRank(clan.member.rank)) return false;
  if (typeof name !== "string" || typeof note !== "string") return false;

  const saved = await db
    .update(players)
    .set({
      note: note.trim().slice(0, MAX_NOTE_LENGTH) || null,
      noteUpdatedBy: clan.member.name,
      noteUpdatedAt: new Date(),
    })
    .where(and(eq(players.name, name), isNull(players.leftAt)))
    .returning({ uuid: players.uuid });
  return saved.length > 0;
}
