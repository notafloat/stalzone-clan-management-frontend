import "server-only";
import { cache } from "react";
import { getDb, type Db } from "@/lib/db/client";
import { settings } from "@/lib/db/schema";
import {
  DEFAULT_ABSENCE_RULES,
  DEFAULT_KV_RULES,
  DEFAULT_TEMPLATES,
  parseAbsenceRules,
  parseKvRules,
  parseTemplates,
} from "./settings";

const KEYS = {
  absence: "absence_rules",
  kv: "kv_rules",
  templates: "squad_templates",
  trackingStart: "tracking_started_at",
} as const;

const loadAll = cache(async (): Promise<Map<string, unknown>> => {
  const db = getDb();
  if (!db) return new Map();
  const rows = await db
    .select()
    .from(settings)
    .catch((error) => {
      console.error("Could not load settings:", error);
      return [];
    });
  return new Map(rows.map(({ key, value }) => [key, value]));
});

export const getAbsenceRules = async () =>
  parseAbsenceRules((await loadAll()).get(KEYS.absence)) ??
  DEFAULT_ABSENCE_RULES;

export const getKvRules = async () =>
  parseKvRules((await loadAll()).get(KEYS.kv)) ?? DEFAULT_KV_RULES;

export const getTemplateSettings = async () =>
  parseTemplates((await loadAll()).get(KEYS.templates)) ?? DEFAULT_TEMPLATES;

/** The first day logins were recorded: earlier days can't count as "didn't log in". */
export async function getTrackingStart(): Promise<Date | null> {
  const value = (await loadAll()).get(KEYS.trackingStart);
  return typeof value === "string" ? new Date(value) : null;
}

async function writeSetting(
  db: Db,
  key: string,
  value: unknown,
  updatedBy: string,
) {
  const values = { value, updatedBy, updatedAt: new Date() };
  await db
    .insert(settings)
    .values({ key, ...values })
    .onConflictDoUpdate({ target: settings.key, set: values });
}

export const saveAbsenceRules = (db: Db, value: unknown, by: string) =>
  writeSetting(db, KEYS.absence, value, by);
export const saveKvRules = (db: Db, value: unknown, by: string) =>
  writeSetting(db, KEYS.kv, value, by);
export const saveTemplateSettings = (db: Db, value: unknown, by: string) =>
  writeSetting(db, KEYS.templates, value, by);

export async function rememberTrackingStart(db: Db, now: Date) {
  await db
    .insert(settings)
    .values({
      key: KEYS.trackingStart,
      value: now.toISOString(),
      updatedBy: "tracker",
    })
    .onConflictDoNothing();
}
