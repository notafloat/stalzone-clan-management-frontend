// Shared with client components: must not import server-only modules (lib/auth, lib/env, lib/stalzone/client, roster).
import { DAY_FORMS, pluralRu } from "@/lib/plural";
import type { AbsenceRules } from "@/lib/settings/settings";
import type { ClanRank } from "@/lib/stalzone/types";

export interface MemberData {
  name: string;
  rank: ClanRank;
  joinTime: Date;
  /** null when the public profile was not found. */
  lastLogin: Date | null;
  daysInClan: number;
  daysSinceLastLogin: number | null;
  /** Only set for officers and above. */
  note?: string;
  noteUpdatedBy?: string;
}

export type AbsenceFlag = "warn" | "crit";

/** Full class strings, so Tailwind can detect them. */
export const ABSENCE_STYLES: Record<
  AbsenceFlag,
  { label: string; className: string }
> = {
  warn: {
    label: "внимание",
    className: "bg-tone-yellow-96 text-tone-amber-52",
  },
  crit: {
    label: "неактивен",
    className: "bg-tone-red-955 text-tone-red-52",
  },
};

/** An unknown last login also needs a look, but doesn't prove the player is inactive. */
export function absenceFlag(
  member: MemberData,
  rules: AbsenceRules,
): AbsenceFlag | null {
  if (rules.exclude.includes(member.rank)) return null;
  const days = member.daysSinceLastLogin;
  if (days === null) return "warn";
  if (days >= rules.crit) return "crit";
  return days >= rules.warn ? "warn" : null;
}

export function needsAttention(
  member: MemberData,
  rules: AbsenceRules,
): boolean {
  return absenceFlag(member, rules) !== null;
}

export function formatLastSeen(days: number | null): string {
  if (days === null) return "вход неизвестен";
  if (days === 0) return "менее суток назад";
  return `${days} ${pluralRu(days, DAY_FORMS)} назад`;
}

export const MAX_NOTE_LENGTH = 500;

/** The server of the only clan allowed on this site. */
export const REGION = "RU";

/** [MOZG] Zero Braincells. */
const ALLOWED_CLAN_ID = "2d959b5c-6954-4f61-9435-8447fe65f0b7";

export function isAllowedClan(clanId?: string): boolean {
  return clanId === ALLOWED_CLAN_ID;
}

const OFFICER_RANKS: ClanRank[] = ["OFFICER", "COLONEL", "LEADER"];

export function isOfficerRank(rank: ClanRank): boolean {
  return OFFICER_RANKS.includes(rank);
}

export const playerPath = (name: string) =>
  `/members/${encodeURIComponent(name)}`;

const ALLIANCE_LABELS = new Map([
  ["stalkers", "Сталкеры"],
  ["bandits", "Бандиты"],
  ["duty", "Долг"],
  ["freedom", "Свобода"],
  ["covenant", "Завет"],
  ["merc", "Наёмники"],
]);

export function allianceLabel(alliance?: string) {
  if (!alliance) return "—";
  return ALLIANCE_LABELS.get(alliance) ?? alliance;
}

type RankInfo = {
  id: ClanRank;
  label: string;
  color: string;
  /** Full class strings, so Tailwind can detect them. */
  badge: string;
};

/** In display order, highest rank first. */
export const CLAN_RANKS: RankInfo[] = [
  {
    id: "LEADER",
    label: "Лидер",
    color: "oklch(0.66 0.16 45)",
    badge:
      "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  },
  {
    id: "COLONEL",
    label: "Полковник",
    color: "var(--tone-purple-56)",
    badge:
      "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  },
  {
    id: "OFFICER",
    label: "Офицер",
    color: "var(--tone-blue-56)",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  },
  {
    id: "SERGEANT",
    label: "Сержант",
    color: "oklch(0.62 0.11 185)",
    badge: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
  },
  {
    id: "SOLDIER",
    label: "Боец",
    color: "oklch(0.62 0.13 145)",
    badge: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  },
  {
    id: "COMMONER",
    label: "Рядовой",
    color: "var(--muted)",
    badge: "bg-wash text-ink-soft",
  },
  {
    id: "RECRUIT",
    label: "Запасной",
    color: "var(--dim-190)",
    badge: "bg-alt-250 text-muted",
  },
];

export const RANK_BY_ID = Object.fromEntries(
  CLAN_RANKS.map((rank, order) => [rank.id, { ...rank, order }]),
) as Record<ClanRank, RankInfo & { order: number }>;
