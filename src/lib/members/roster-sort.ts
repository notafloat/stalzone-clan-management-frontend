import { RANK_BY_ID, type MemberData } from "./members";

/** `pos` is the place in the full roster, so it doesn't change when filtering. */
export type RosterRow = MemberData & { pos: number };

export type SortKey =
  | "pos"
  | "name"
  | "rank"
  | "joinTime"
  | "daysInClan"
  | "lastLogin"
  | "daysSinceLastLogin";

export type SortState = { key: SortKey; dir: "asc" | "desc" };

const UNKNOWN_RANK_ORDER = 99;

/** null means unknown, which always sorts last. */
const SORT_VALUES: Record<SortKey, (row: RosterRow) => string | number | null> =
  {
    pos: (row) => row.pos,
    name: (row) => row.name,
    rank: (row) => RANK_BY_ID[row.rank]?.order ?? UNKNOWN_RANK_ORDER,
    joinTime: (row) => row.joinTime.getTime(),
    daysInClan: (row) => row.daysInClan,
    lastLogin: (row) => row.lastLogin?.getTime() ?? null,
    daysSinceLastLogin: (row) => row.daysSinceLastLogin,
  };

/** On these columns the largest or latest value is the useful one to see first. */
const DESCENDING_FIRST: SortKey[] = [
  "daysInClan",
  "lastLogin",
  "daysSinceLastLogin",
];

export const INITIAL_SORT: SortState = { key: "pos", dir: "asc" };

export const sortBy = (key: SortKey): SortState => ({
  key,
  dir: DESCENDING_FIRST.includes(key) ? "desc" : "asc",
});

export function toggleSort(current: SortState, key: SortKey): SortState {
  if (current.key !== key) return sortBy(key);
  return { key, dir: current.dir === "asc" ? "desc" : "asc" };
}

function compareValues(a: string | number, b: string | number) {
  return typeof a === "string" && typeof b === "string"
    ? a.localeCompare(b, "ru", { sensitivity: "base" })
    : (a as number) - (b as number);
}

/** Ties keep roster order, and unknown values go last in both directions. */
export function sortRows(rows: RosterRow[], { key, dir }: SortState) {
  const sortValue = SORT_VALUES[key];
  const sign = dir === "asc" ? 1 : -1;

  return [...rows].sort((a, b) => {
    const x = sortValue(a);
    const y = sortValue(b);
    if (x === null || y === null) {
      return (x === null ? 1 : 0) - (y === null ? 1 : 0) || a.pos - b.pos;
    }
    return compareValues(x, y) * sign || a.pos - b.pos;
  });
}
