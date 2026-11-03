"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LocalTime } from "@/components/LocalTime";
import {
  INACTIVE_DAYS,
  playerPath,
  RANK_BY_ID,
  type MemberData,
} from "@/lib/members/members";

type Row = MemberData & { pos: number };

type ColumnKey =
  | "pos"
  | "name"
  | "rank"
  | "joinTime"
  | "daysInClan"
  | "lastLogin"
  | "daysSinceLastLogin"
  | "note";

type Column = {
  key: ColumnKey;
  label: string;
  align?: "right";
  width?: string;
  /** Columns without it are not sortable. null means unknown, which always sorts last. */
  sortValue?: (row: Row) => string | number | null;
};

type SortState = { key: ColumnKey; dir: "asc" | "desc" };

const UNKNOWN_RANK_ORDER = 99;

const COLUMNS: Column[] = [
  { key: "pos", label: "#", width: "w-14", sortValue: (r) => r.pos },
  { key: "name", label: "Ник", width: "w-[22%]", sortValue: (r) => r.name },
  {
    key: "rank",
    label: "Звание",
    sortValue: (r) => RANK_BY_ID[r.rank]?.order ?? UNKNOWN_RANK_ORDER,
  },
  {
    key: "joinTime",
    label: "В клане с",
    sortValue: (r) => r.joinTime.getTime(),
  },
  {
    key: "daysInClan",
    label: "Дней в клане",
    align: "right",
    sortValue: (r) => r.daysInClan,
  },
  {
    key: "lastLogin",
    label: "Последний вход",
    sortValue: (r) => r.lastLogin?.getTime() ?? null,
  },
  {
    key: "daysSinceLastLogin",
    label: "Не заходил, дн.",
    align: "right",
    sortValue: (r) => r.daysSinceLastLogin,
  },
  { key: "note", label: "Заметка", width: "w-[20%]" },
];

function compareValues(a: string | number, b: string | number) {
  return typeof a === "string" && typeof b === "string"
    ? a.localeCompare(b, "ru", { sensitivity: "base" })
    : (a as number) - (b as number);
}

/** Ties keep roster order, and unknown values go last in both directions. */
function sortRows(rows: Row[], { key, dir }: SortState) {
  const sortValue = COLUMNS.find((column) => column.key === key)?.sortValue;
  if (!sortValue) return rows;
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

function daysAwayClass(days: number | null) {
  if (days === null) return "text-gray-400";
  if (days === 0) return "text-gray-300";
  if (days < 3) return "text-gray-600";
  if (days < INACTIVE_DAYS) return "text-amber-600 font-semibold";
  return "text-red-600 font-semibold";
}

export function MembersTable({
  members,
  emptyText = "В клане пока никого нет",
}: {
  members: MemberData[];
  emptyText?: string;
}) {
  const [sort, setSort] = useState<SortState>({ key: "pos", dir: "asc" });

  const rows = useMemo(() => {
    const numbered = members.map((member, i) => ({ ...member, pos: i + 1 }));
    return sortRows(numbered, sort);
  }, [members, sort]);

  function toggleSort(key: ColumnKey) {
    setSort((current) => ({
      key,
      dir: current.key === key && current.dir === "asc" ? "desc" : "asc",
    }));
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full min-w-250 border-collapse text-left text-sm">
        <thead className="border-b border-gray-200 bg-gray-100/80">
          <tr>
            {COLUMNS.map((column) => (
              <ColumnHeader
                key={column.key}
                column={column}
                sortDir={sort.key === column.key ? sort.dir : undefined}
                onSort={() => toggleSort(column.key)}
              />
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={COLUMNS.length}
                className="px-4 py-10 text-center text-gray-400"
              >
                {emptyText}
              </td>
            </tr>
          )}

          {rows.map((row) => (
            <MemberRow key={row.name} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ColumnHeader({
  column,
  sortDir,
  onSort,
}: {
  column: Column;
  sortDir?: SortState["dir"];
  onSort: () => void;
}) {
  const ariaSort = sortDir && (sortDir === "asc" ? "ascending" : "descending");

  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className={`px-4 py-3 text-[11px] font-bold tracking-[0.08em] whitespace-nowrap text-gray-700 uppercase ${
        column.align === "right" ? "text-right" : ""
      } ${column.width ?? ""}`}
    >
      {column.sortValue ? (
        <button
          type="button"
          onClick={onSort}
          className="group inline-flex cursor-pointer items-center gap-1 tracking-[inherit] uppercase hover:text-gray-950"
        >
          {column.label}
          <span
            aria-hidden
            className={
              sortDir ? "text-gray-900" : "opacity-0 group-hover:opacity-40"
            }
          >
            {sortDir === "desc" ? "↓" : "↑"}
          </span>
        </button>
      ) : (
        column.label
      )}
    </th>
  );
}

function MemberRow({ row }: { row: Row }) {
  const rank = RANK_BY_ID[row.rank];

  return (
    <tr className="border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50">
      <td className="px-4 py-2.5 text-xs text-gray-400 tabular-nums">
        {row.pos}
      </td>

      <td className="px-4 py-2.5 font-bold text-gray-900">
        <Link href={playerPath(row.name)} className="hover:underline">
          {row.name}
        </Link>
      </td>

      <td className="px-4 py-2.5">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[13px] font-medium whitespace-nowrap ${rank?.badge ?? "bg-gray-100 text-gray-600"}`}
        >
          <span
            className="size-1.5 rounded-full"
            style={{ backgroundColor: rank?.color ?? "rgb(134,140,150)" }}
          />
          {rank?.label ?? row.rank}
        </span>
      </td>

      <td className="px-4 py-2.5 font-mono text-[13px] whitespace-nowrap text-gray-600">
        <LocalTime value={row.joinTime} format="date" />
      </td>

      <td className="px-4 py-2.5 text-right font-semibold text-gray-900 tabular-nums">
        {row.daysInClan}
      </td>

      <td className="px-4 py-2.5 font-mono text-[13px] whitespace-nowrap text-gray-600">
        <LocalTime value={row.lastLogin} format="dateTime" />
      </td>

      <td
        className={`px-4 py-2.5 text-right font-mono text-[13px] ${daysAwayClass(row.daysSinceLastLogin)}`}
      >
        {row.daysSinceLastLogin ?? "—"}
      </td>

      <td className="px-4 py-2.5 text-[13px] text-gray-700">
        {row.note || <span className="text-gray-400">—</span>}
      </td>
    </tr>
  );
}
