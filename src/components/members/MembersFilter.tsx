"use client";

import { useMemo, type ReactNode } from "react";
import {
  CLAN_RANKS,
  needsAttention,
  type MemberData,
} from "@/lib/members/members";
import type { ClanRank } from "@/lib/stalzone/types";

export type RankFilter = ClanRank | "all";

const BUTTON_BASE =
  "flex-none h-8 inline-flex items-center gap-1.75 px-2.75 py-0 rounded-md border-solid border text-[13px] font-medium cursor-pointer";
const BUTTON_IDLE = "border-[rgb(217,220,225)] bg-white text-[rgb(23,25,30)]";
const COUNT_BASE = "font-jetbrains-mono text-[12px]";
const COUNT_IDLE = "text-[rgb(134,140,150)]";

const SELECTED_STYLES = {
  rank: {
    button: "border-[rgb(23,25,30)] bg-[rgb(23,25,30)] text-white",
    count: "text-white/62",
  },
  attention: {
    button:
      "border-[oklch(0.82_0.1_80)] bg-[oklch(0.96_0.06_90)] text-[oklch(0.52_0.12_65)]",
    count: "text-[oklch(0.52_0.12_65)]",
  },
};

function countMembers(members: MemberData[]) {
  const rankCounts: Partial<Record<ClanRank, number>> = {};
  let attentionCount = 0;
  for (const member of members) {
    rankCounts[member.rank] = (rankCounts[member.rank] ?? 0) + 1;
    if (needsAttention(member)) attentionCount++;
  }
  return { rankCounts, attentionCount };
}

export function MembersFilter({
  members,
  rank,
  onRankChange,
  attentionOnly,
  onAttentionOnlyChange,
}: {
  /** The full list rather than the filtered one, so the counts stay stable. */
  members: MemberData[];
  rank: RankFilter;
  onRankChange: (rank: RankFilter) => void;
  attentionOnly: boolean;
  onAttentionOnlyChange: (value: boolean) => void;
}) {
  const { rankCounts, attentionCount } = useMemo(
    () => countMembers(members),
    [members],
  );

  return (
    <div className="flex max-w-full scrollbar-none gap-1.5 overflow-x-auto p-px">
      <FilterButton
        selected={rank === "all"}
        count={members.length}
        onClick={() => onRankChange("all")}
      >
        <span>Все</span>
      </FilterButton>

      {CLAN_RANKS.map(({ id, label, color }) => (
        <FilterButton
          key={id}
          selected={rank === id}
          count={rankCounts[id] ?? 0}
          onClick={() => onRankChange(id)}
        >
          <span
            style={{ backgroundColor: color }}
            className="h-2 w-2 rounded-xs"
          />
          <span>{label}</span>
        </FilterButton>
      ))}

      <FilterButton
        variant="attention"
        selected={attentionOnly}
        count={attentionCount}
        onClick={() => onAttentionOnlyChange(!attentionOnly)}
      >
        <span>Требуют внимания</span>
      </FilterButton>
    </div>
  );
}

function FilterButton({
  variant = "rank",
  selected,
  count,
  onClick,
  children,
}: {
  variant?: keyof typeof SELECTED_STYLES;
  selected: boolean;
  count: number;
  onClick: () => void;
  children: ReactNode;
}) {
  const styles = SELECTED_STYLES[variant];
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`${BUTTON_BASE} ${selected ? styles.button : BUTTON_IDLE}`}
    >
      {children}
      <span className={`${COUNT_BASE} ${selected ? styles.count : COUNT_IDLE}`}>
        {count}
      </span>
    </button>
  );
}
