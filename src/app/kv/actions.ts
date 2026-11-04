"use server";

import { dayKey } from "@/lib/dates";
import { isWarDate, parseMarkUpdate, weekdayOf } from "@/lib/kv/kv";
import {
  confirmWar,
  createWar,
  deleteWar,
  saveMarks,
  warExists,
  type MarkUpdate,
} from "@/lib/kv/store";
import { getOfficerContext } from "@/lib/members/roster";
import { getKvRules } from "@/lib/settings/store";
import { getLineup } from "@/lib/squads/store";

const KV_PATH = "/kv";

function parseUpdates(value: unknown): Record<string, MarkUpdate> | null {
  if (typeof value !== "object" || value === null) return null;
  const updates: Record<string, MarkUpdate> = {};
  for (const [uuid, mark] of Object.entries(value)) {
    const parsed = parseMarkUpdate(mark);
    if (!parsed) return null;
    updates[uuid] = parsed;
  }
  return updates;
}

/** These are callable by anyone who can reach the site, so each one checks the rank live. */
export async function saveKvMarks(date: unknown, marks: unknown) {
  const officer = await getOfficerContext(KV_PATH);
  const updates = parseUpdates(marks);
  if (!officer || !isWarDate(date) || !updates) return false;
  await saveMarks(officer.db, date, updates, officer.name);
  return true;
}

export async function confirmKvWar(date: unknown) {
  const officer = await getOfficerContext(KV_PATH);
  if (!officer || !isWarDate(date)) return null;
  return confirmWar(officer.db, date, officer.name);
}

export type CreateWarResult = "created" | "exists" | "forbidden" | "invalid";

export async function createKvWar(date?: unknown): Promise<CreateWarResult> {
  const officer = await getOfficerContext(KV_PATH);
  if (!officer) return "forbidden";
  const warDate = date ?? dayKey(new Date());
  if (!isWarDate(warDate)) return "invalid";
  if (await warExists(officer.db, warDate)) return "exists";
  const [{ lineup }, rules] = await Promise.all([
    getLineup(officer.db),
    getKvRules(),
  ]);
  const created = await createWar(
    officer.db,
    warDate,
    lineup,
    rules.mandatory.includes(weekdayOf(warDate)),
    officer.name,
  );
  return created ? "created" : "exists";
}

export async function deleteKvWar(date: unknown) {
  const officer = await getOfficerContext(KV_PATH);
  if (!officer || !isWarDate(date)) return false;
  await deleteWar(officer.db, date);
  return true;
}
