"use server";

import { isPlanId, parsePlan } from "@/lib/maps/maps";
import {
  deleteCustomMap,
  deletePlan,
  getMaps,
  writePlan,
} from "@/lib/maps/store";
import { getOfficerContext } from "@/lib/members/roster";

const MAPS_PATH = "/maps";

/** These are callable by anyone who can reach the site, so each one checks the rank live. */
export async function saveMapPlan(plan: unknown, expectedVersion: unknown) {
  const officer = await getOfficerContext(MAPS_PATH);
  if (!officer) return null;
  const parsed = parsePlan(plan, await getMaps(officer.db));
  if (!parsed) return null;
  if (!Number.isInteger(expectedVersion) || (expectedVersion as number) < 0) {
    return null;
  }
  return writePlan(officer.db, parsed, expectedVersion as number, officer.name);
}

export async function deleteUploadedMap(id: unknown) {
  const officer = await getOfficerContext(MAPS_PATH);
  if (!officer || !isPlanId(id)) return false;
  await deleteCustomMap(officer.db, id);
  return true;
}

export async function deleteMapPlan(id: unknown) {
  const officer = await getOfficerContext(MAPS_PATH);
  if (!officer || !isPlanId(id)) return false;
  await deletePlan(officer.db, id);
  return true;
}
