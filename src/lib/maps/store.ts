import "server-only";
import { and, asc, count, eq, sql } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { customMaps, mapPlans } from "@/lib/db/schema";
import { newMapId, parsePlan, type GameMap, type MapPlan } from "./maps";

export type StoredPlan = { plan: MapPlan; version: number };

const toGameMap = (row: {
  id: string;
  name: string;
  width: number;
  height: number;
}): GameMap => ({
  id: row.id,
  name: row.name,
  src: `/api/maps/${row.id}/image`,
  w: row.width,
  h: row.height,
});

const MAP_COLUMNS = {
  id: customMaps.id,
  name: customMaps.name,
  width: customMaps.width,
  height: customMaps.height,
};

/** Without the images themselves, which are only read one at a time. */
export async function getMaps(db: Db): Promise<GameMap[]> {
  const rows = await db
    .select(MAP_COLUMNS)
    .from(customMaps)
    .orderBy(asc(customMaps.createdAt), asc(customMaps.id));
  return rows.map(toGameMap);
}

export async function countCustomMaps(db: Db) {
  const [row] = await db.select({ total: count() }).from(customMaps);
  return row.total;
}

export async function getMapImage(db: Db, id: string) {
  const [row] = await db
    .select({ image: customMaps.image })
    .from(customMaps)
    .where(eq(customMaps.id, id));
  return row?.image ?? null;
}

export async function addCustomMap(
  db: Db,
  name: string,
  image: { data: Buffer; width: number; height: number },
  createdBy: string,
): Promise<GameMap> {
  const [row] = await db
    .insert(customMaps)
    .values({
      id: newMapId("u"),
      name,
      width: image.width,
      height: image.height,
      image: image.data,
      createdBy,
    })
    .returning(MAP_COLUMNS);
  return toGameMap(row);
}

/** Plans on the map go with it, as they can't be shown without it. */
export async function deleteCustomMap(db: Db, id: string) {
  await db.transaction(async (tx) => {
    await tx.delete(mapPlans).where(sql`${mapPlans.data}->>'map' = ${id}`);
    await tx.delete(customMaps).where(eq(customMaps.id, id));
  });
}

export async function getPlans(db: Db, maps: GameMap[]): Promise<StoredPlan[]> {
  const rows = await db
    .select()
    .from(mapPlans)
    .orderBy(asc(mapPlans.createdAt), asc(mapPlans.id));
  return rows.flatMap((row) => {
    const plan = parsePlan(row.data, maps);
    return plan ? [{ plan, version: row.version }] : [];
  });
}

/** Returns the new version, or null if someone else saved since `expectedVersion`. */
export async function writePlan(
  db: Db,
  plan: MapPlan,
  expectedVersion: number,
  updatedBy: string,
): Promise<number | null> {
  const version = expectedVersion + 1;
  const values = { data: plan, version, updatedBy, updatedAt: new Date() };

  const saved =
    expectedVersion === 0
      ? await db
          .insert(mapPlans)
          .values({ id: plan.id, ...values })
          .onConflictDoNothing()
          .returning({ version: mapPlans.version })
      : await db
          .update(mapPlans)
          .set(values)
          .where(
            and(
              eq(mapPlans.id, plan.id),
              eq(mapPlans.version, expectedVersion),
            ),
          )
          .returning({ version: mapPlans.version });
  return saved[0]?.version ?? null;
}

export async function deletePlan(db: Db, id: string) {
  await db.delete(mapPlans).where(eq(mapPlans.id, id));
}
