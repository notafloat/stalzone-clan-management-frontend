import { dayKey } from "@/lib/dates";
import type { MemberData } from "./members";

const LONG_ABSENCE_DAYS = 14;
const NEWCOMER_DAYS = 7;
const ACTIVE_DAYS = 7;
const RECENT_JOIN_DAYS = 30;
const CHART_DAYS = 30;

export function summarizeMembers(members: MemberData[]) {
  const countWhere = (test: (member: MemberData) => boolean) =>
    members.filter(test).length;

  return {
    total: members.length,
    activeRecently: countWhere(
      ({ daysSinceLastLogin: days }) => days !== null && days < ACTIVE_DAYS,
    ),
    longAbsent: countWhere(
      ({ daysSinceLastLogin: days }) =>
        days !== null && days >= LONG_ABSENCE_DAYS,
    ),
    newcomers: countWhere(({ daysInClan }) => daysInClan < NEWCOMER_DAYS),
    joinedRecently: countWhere(
      ({ daysInClan }) => daysInClan < RECENT_JOIN_DAYS,
    ),
  };
}

// Influence needed to finish each level, seen as the point caps in the API's clan list.
const LEVEL_SIZES = [1_000_000, 3_500_000];

/** The API counts levels from 0 and points from the start of the level; the game shows totals. */
export function clanProgress(level: number, levelPoints: number) {
  const earlierLevels = LEVEL_SIZES.slice(0, level);
  return {
    level: level + 1,
    influence: earlierLevels.reduce((sum, size) => sum + size, levelPoints),
  };
}

export type HeadcountDay = {
  /** 14.10 */
  label: string;
  /** 14 */
  dayOfMonth: string;
  count: number;
  joined: number;
  isWeekend: boolean;
};

export function shiftDay(key: string, days: number) {
  const date = new Date(`${key}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Rebuilt from the join dates of the current members. The API keeps no history,
 * so anyone who has since left is not counted on the days they were in the clan.
 */
export function headcountByDay(
  members: MemberData[],
  founded: Date,
  now: Date,
): HeadcountDay[] {
  const today = dayKey(now);
  const earliest = shiftDay(today, 1 - CHART_DAYS);
  const foundedKey = dayKey(founded);
  const joinDays = members.map(({ joinTime }) => dayKey(joinTime));

  const days: HeadcountDay[] = [];
  let key = foundedKey > earliest ? foundedKey : earliest;
  while (key <= today) {
    const [, month, day] = key.split("-");
    const weekday = new Date(`${key}T00:00:00Z`).getUTCDay();
    const current = key;
    days.push({
      label: `${day}.${month}`,
      dayOfMonth: day,
      count: joinDays.filter((joined) => joined <= current).length,
      joined: joinDays.filter((joined) => joined === current).length,
      isWeekend: weekday === 0 || weekday === 6,
    });
    key = shiftDay(key, 1);
  }
  return days;
}
