import { RANK_BY_ID } from "@/lib/members/members";
import { pluralRu } from "@/lib/plural";
import type { ClanRank } from "@/lib/stalzone/types";

const MAX_THRESHOLD_DAYS = 60;
const MAX_TEMPLATES = 30;
const MAX_TEMPLATE_SQUADS = 30;
const MAX_NAME_LENGTH = 40;
export const MAX_TEMPLATE_SQUAD_SIZE = 10;

export type AbsenceRules = {
  warn: number;
  crit: number;
  /** Ranks that never get flagged. */
  exclude: ClanRank[];
};

export const DEFAULT_ABSENCE_RULES: AbsenceRules = {
  warn: 3,
  crit: 7,
  exclude: [],
};

/** Days of the week from 0 (Monday) to 6 (Sunday). */
export type KvRules = { mandatory: number[] };

export const DEFAULT_KV_RULES: KvRules = { mandatory: [0, 1, 2, 3, 4, 5, 6] };

export type SquadTemplate = {
  id: string;
  name: string;
  squads: { name: string; size: number }[];
};

export type TemplateSettings = {
  templates: SquadTemplate[];
  defaultId: string;
};

const numberedTemplate = (count: number): SquadTemplate => ({
  id: `t${count}`,
  name: `${count} ${pluralRu(count, ["отряд", "отряда", "отрядов"])}`,
  squads: Array.from({ length: count }, (_, i) => ({
    name: `Отряд ${i + 1}`,
    size: 5,
  })),
});

export const DEFAULT_TEMPLATES: TemplateSettings = {
  templates: [3, 5, 7].map(numberedTemplate),
  defaultId: "t5",
};

const isDayCount = (value: unknown): value is number =>
  Number.isInteger(value) &&
  (value as number) >= 1 &&
  (value as number) <= MAX_THRESHOLD_DAYS;

const isName = (value: unknown): value is string =>
  typeof value === "string" && value.length <= MAX_NAME_LENGTH;

export function parseAbsenceRules(value: unknown): AbsenceRules | null {
  const { warn, crit, exclude } = (value ?? {}) as AbsenceRules;
  if (!isDayCount(warn) || !isDayCount(crit) || warn >= crit) return null;
  if (!Array.isArray(exclude)) return null;
  if (!exclude.every((rank) => Object.hasOwn(RANK_BY_ID, rank))) return null;
  return { warn, crit, exclude: [...new Set(exclude)] };
}

export function parseKvRules(value: unknown): KvRules | null {
  const { mandatory } = (value ?? {}) as KvRules;
  if (!Array.isArray(mandatory) || mandatory.length === 0) return null;
  const isWeekday = (day: unknown) =>
    Number.isInteger(day) && (day as number) >= 0 && (day as number) <= 6;
  if (!mandatory.every(isWeekday)) return null;
  return { mandatory: [...new Set(mandatory)].sort((a, b) => a - b) };
}

export function parseTemplates(value: unknown): TemplateSettings | null {
  const { templates, defaultId } = (value ?? {}) as TemplateSettings;
  if (!Array.isArray(templates)) return null;
  if (templates.length === 0 || templates.length > MAX_TEMPLATES) return null;

  const clean: SquadTemplate[] = [];
  for (const template of templates) {
    const { id, name, squads } = template ?? {};
    if (!isName(id) || !id || !isName(name) || !Array.isArray(squads)) {
      return null;
    }
    if (squads.length > MAX_TEMPLATE_SQUADS) return null;
    const isValidSquad = (squad: { name: string; size: number }) =>
      isName(squad?.name) &&
      Number.isInteger(squad?.size) &&
      squad.size >= 1 &&
      squad.size <= MAX_TEMPLATE_SQUAD_SIZE;
    if (!squads.every(isValidSquad)) return null;
    clean.push({
      id,
      name,
      squads: squads.map(({ name, size }) => ({ name, size })),
    });
  }
  if (new Set(clean.map(({ id }) => id)).size !== clean.length) return null;
  if (!clean.some(({ id }) => id === defaultId)) return null;
  return { templates: clean, defaultId };
}
