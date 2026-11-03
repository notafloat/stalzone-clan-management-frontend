// Shared with client components: must not import server-only modules (lib/auth, lib/env, lib/stalzone/client, roster).
import type { ClanRank } from "@/lib/stalzone/types";

export interface MemberData {
  name: string;
  rank: ClanRank;
  joinTime: Date;
  /** null when the public profile was not found. */
  lastLogin: Date | null;
  daysInClan: number;
  daysSinceLastLogin: number | null;
  note?: string;
}

/** No login for this many days (or an unknown last login) means "Требуют внимания". */
export const INACTIVE_DAYS = 7;

export function needsAttention(member: MemberData): boolean {
  return (
    member.daysSinceLastLogin === null ||
    member.daysSinceLastLogin >= INACTIVE_DAYS
  );
}

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
    badge: "bg-orange-100 text-orange-700",
  },
  {
    id: "COLONEL",
    label: "Полковник",
    color: "oklch(0.56 0.16 300)",
    badge: "bg-purple-100 text-purple-700",
  },
  {
    id: "OFFICER",
    label: "Офицер",
    color: "oklch(0.56 0.14 255)",
    badge: "bg-blue-100 text-blue-700",
  },
  {
    id: "SERGEANT",
    label: "Сержант",
    color: "oklch(0.62 0.11 185)",
    badge: "bg-teal-100 text-teal-700",
  },
  {
    id: "SOLDIER",
    label: "Боец",
    color: "oklch(0.62 0.13 145)",
    badge: "bg-green-100 text-green-700",
  },
  {
    id: "COMMONER",
    label: "Рядовой",
    color: "rgb(134,140,150)",
    badge: "bg-gray-100 text-gray-600",
  },
  {
    id: "RECRUIT",
    label: "Запасной",
    color: "rgb(190,195,202)",
    badge: "bg-gray-50 text-gray-500",
  },
];

export const RANK_BY_ID = Object.fromEntries(
  CLAN_RANKS.map((rank, order) => [rank.id, { ...rank, order }]),
) as Record<ClanRank, RankInfo & { order: number }>;
