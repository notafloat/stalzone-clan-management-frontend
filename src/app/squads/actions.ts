"use server";

import { getDb } from "@/lib/db/client";
import { isOfficerRank } from "@/lib/members/members";
import { getCurrentMembership } from "@/lib/members/roster";
import { parseLineup } from "@/lib/squads/lineup";
import { writeLineup } from "@/lib/squads/store";

export type SaveLineupResult =
  | { status: "saved"; version: number }
  | { status: "conflict" | "forbidden" | "invalid" | "unavailable" };

/** Callable by anyone who can reach the site, so rank and data are both checked here. */
export async function saveLineup(
  data: unknown,
  expectedVersion: number,
): Promise<SaveLineupResult> {
  const db = getDb();
  if (!db) return { status: "unavailable" };

  const { clan } = await getCurrentMembership("/squads", {
    live: true,
  });
  if (!isOfficerRank(clan.member.rank)) return { status: "forbidden" };

  const lineup = parseLineup(data);
  if (!lineup || !Number.isSafeInteger(expectedVersion)) {
    return { status: "invalid" };
  }

  const version = await writeLineup(
    db,
    lineup,
    expectedVersion,
    clan.member.name,
  );
  return version === null
    ? { status: "conflict" }
    : { status: "saved", version };
}
