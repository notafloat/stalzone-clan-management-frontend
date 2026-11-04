"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ABSENCE_STYLES,
  needsAttention,
  type AbsenceFlag,
  type MemberData,
} from "@/lib/members/members";
import {
  INITIAL_SORT,
  sortRows,
  type RosterRow,
  type SortState,
} from "@/lib/members/roster-sort";
import { pluralRu } from "@/lib/plural";
import type { AbsenceRules } from "@/lib/settings/settings";
import { useIsMobile } from "@/lib/use-is-mobile";
import { MembersCards } from "./MembersCards";
import { MembersFilter, type RankFilter } from "./MembersFilter";
import { MembersTable } from "./MembersTable";

export function MembersView({
  members,
  initialAttentionOnly = false,
  canEditNotes,
  rules,
}: {
  members: MemberData[];
  initialAttentionOnly?: boolean;
  canEditNotes: boolean;
  rules: AbsenceRules;
}) {
  const [rank, setRank] = useState<RankFilter>("all");
  const [attentionOnly, setAttentionOnly] = useState(initialAttentionOnly);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState>(INITIAL_SORT);
  const isMobile = useIsMobile();

  const rows = useMemo(() => {
    const search = query.trim().toLowerCase();
    const numbered: RosterRow[] = members.map((member, i) => ({
      ...member,
      pos: i + 1,
    }));
    const visible = numbered.filter(
      (row) =>
        (rank === "all" || row.rank === rank) &&
        (!attentionOnly || needsAttention(row, rules)) &&
        (!search || row.name.toLowerCase().includes(search)),
    );
    return sortRows(visible, sort);
  }, [members, rank, attentionOnly, query, sort, rules]);

  const emptyText =
    members.length === 0 ? "В клане пока никого нет" : "Никого не нашли";

  return (
    <div className="flex flex-col gap-3">
      <MembersFilter
        members={members}
        rules={rules}
        rank={rank}
        onRankChange={setRank}
        attentionOnly={attentionOnly}
        onAttentionOnlyChange={setAttentionOnly}
        query={query}
        onQueryChange={setQuery}
        sort={sort}
        onSortChange={setSort}
        isMobile={isMobile}
      />
      {isMobile ? (
        <MembersCards rows={rows} emptyText={emptyText} rules={rules} />
      ) : (
        <MembersTable
          rows={rows}
          emptyText={emptyText}
          sort={sort}
          onSortChange={setSort}
          canEditNotes={canEditNotes}
          rules={rules}
        />
      )}
      <AbsenceLegend rules={rules} canEditRules={canEditNotes} />
    </div>
  );
}

function AbsenceLegend({
  rules,
  canEditRules,
}: {
  rules: AbsenceRules;
  canEditRules: boolean;
}) {
  const swatch = (flag: AbsenceFlag) => (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`size-2.5 rounded-xs border border-solid border-current ${ABSENCE_STYLES[flag].className}`}
      />
      {ABSENCE_STYLES[flag].label}
    </span>
  );

  return (
    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 text-[12.5px] text-muted">
      <span>Не заходил:</span>
      {swatch("warn")}
      {swatch("crit")}
      <span>
        от {rules.warn} {pluralRu(rules.warn, ["дня", "дней", "дней"])} —
        внимание, от {rules.crit} — неактивен
      </span>
      {canEditRules && (
        <Link href="/admin?tab=inactivity" className="text-ink-soft underline">
          Изменить правила
        </Link>
      )}
    </div>
  );
}
