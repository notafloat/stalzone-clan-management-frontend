"use client";

import { useMemo, type ReactNode } from "react";
import {
  CLAN_RANKS,
  needsAttention,
  type MemberData,
} from "@/lib/members/members";
import {
  sortBy,
  type SortKey,
  type SortState,
} from "@/lib/members/roster-sort";
import type { AbsenceRules } from "@/lib/settings/settings";
import type { ClanRank } from "@/lib/stalzone/types";

export type RankFilter = ClanRank | "all";

const BUTTON_BASE =
  "flex-none h-8 inline-flex items-center gap-1.75 px-2.75 py-0 rounded-md border-solid border text-[13px] font-medium cursor-pointer";
const BUTTON_IDLE = "border-edge-217 bg-surface text-ink";
const COUNT_BASE = "font-jetbrains-mono text-[12px]";
const COUNT_IDLE = "text-muted";
const FIELD =
  "rounded-md border border-solid border-edge-213 bg-surface text-[13.5px]";

const SELECTED_STYLES = {
  rank: {
    button: "border-ink bg-ink text-on-ink",
    count: "text-on-ink/62",
  },
  attention: {
    button: "border-[oklch(0.82_0.1_80)] bg-tone-yellow-96 text-tone-amber-52",
    count: "text-tone-amber-52",
  },
};

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "pos", label: "По порядку" },
  { key: "rank", label: "По званию" },
  { key: "name", label: "По нику" },
  { key: "joinTime", label: "По дате вступления" },
  { key: "lastLogin", label: "По последнему входу" },
  { key: "daysSinceLastLogin", label: "Дольше не заходили" },
];

function countMembers(members: MemberData[], rules: AbsenceRules) {
  const rankCounts: Partial<Record<ClanRank, number>> = {};
  let attentionCount = 0;
  for (const member of members) {
    rankCounts[member.rank] = (rankCounts[member.rank] ?? 0) + 1;
    if (needsAttention(member, rules)) attentionCount++;
  }
  return { rankCounts, attentionCount };
}

export function MembersFilter({
  members,
  rules,
  rank,
  onRankChange,
  attentionOnly,
  onAttentionOnlyChange,
  query,
  onQueryChange,
  sort,
  onSortChange,
  isMobile,
}: {
  /** The full list rather than the filtered one, so the counts stay stable. */
  members: MemberData[];
  rules: AbsenceRules;
  rank: RankFilter;
  onRankChange: (rank: RankFilter) => void;
  attentionOnly: boolean;
  onAttentionOnlyChange: (value: boolean) => void;
  query: string;
  onQueryChange: (value: string) => void;
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  isMobile: boolean;
}) {
  const { rankCounts, attentionCount } = useMemo(
    () => countMembers(members, rules),
    [members, rules],
  );

  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
      <div className="flex max-w-full scrollbar-none gap-1.5 overflow-x-auto p-px">
        <FilterButton
          selected={rank === "all"}
          count={members.length}
          onClick={() => onRankChange("all")}
        >
          <span>Все</span>
        </FilterButton>

        {CLAN_RANKS.map(({ id, label, color }) => {
          const count = rankCounts[id] ?? 0;
          return (
            <FilterButton
              key={id}
              selected={rank === id}
              count={count}
              isMuted={count === 0}
              onClick={() => onRankChange(id)}
            >
              <span
                style={{ backgroundColor: color }}
                className="h-2 w-2 rounded-xs"
              />
              <span>{label}</span>
            </FilterButton>
          );
        })}
      </div>

      <FilterButton
        variant="attention"
        selected={attentionOnly}
        count={attentionCount}
        onClick={() => onAttentionOnlyChange(!attentionOnly)}
      >
        <span>Требуют внимания</span>
      </FilterButton>

      <div className="flex-1" />

      {isMobile && (
        <select
          value={sort.key}
          aria-label="Сортировка"
          onChange={(event) =>
            onSortChange(sortBy(event.target.value as SortKey))
          }
          className={`${FIELD} h-9 px-2`}
        >
          {/* Sorting by a column only the table has still needs a matching option. */}
          {!SORT_OPTIONS.some(({ key }) => key === sort.key) && (
            <option value={sort.key}>По порядку</option>
          )}
          {SORT_OPTIONS.map(({ key, label }) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      )}

      <input
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Поиск по нику"
        aria-label="Поиск по нику"
        className={`${FIELD} h-8.5 max-w-70 flex-[1_1_180px] px-2.5 outline-none placeholder:text-dim-179 focus:border-ink`}
      />
    </div>
  );
}

function FilterButton({
  variant = "rank",
  selected,
  count,
  isMuted = false,
  onClick,
  children,
}: {
  variant?: keyof typeof SELECTED_STYLES;
  selected: boolean;
  count: number;
  isMuted?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const styles = SELECTED_STYLES[variant];
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`${BUTTON_BASE} ${selected ? styles.button : BUTTON_IDLE} ${isMuted ? "opacity-55" : ""}`}
    >
      {children}
      <span className={`${COUNT_BASE} ${selected ? styles.count : COUNT_IDLE}`}>
        {count}
      </span>
    </button>
  );
}
