"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveMemberNote } from "@/app/members/actions";
import { LocalTime } from "@/components/LocalTime";
import { NoteField } from "@/components/NoteField";
import {
  ABSENCE_STYLES,
  absenceFlag,
  playerPath,
  RANK_BY_ID,
} from "@/lib/members/members";
import type { AbsenceRules } from "@/lib/settings/settings";
import {
  toggleSort,
  type RosterRow,
  type SortKey,
  type SortState,
} from "@/lib/members/roster-sort";

const WIDE_ONLY = "hidden min-[1100px]:table-cell";
const MONO_CELL =
  "font-jetbrains-mono px-3.5 text-[12.5px] whitespace-nowrap text-ink-soft";
const HEADER_TEXT =
  "text-[11px] font-semibold tracking-[0.1em] whitespace-nowrap text-ink-soft uppercase";

type Column = {
  key: SortKey;
  label: string;
  align?: "right";
  className?: string;
};

const COLUMNS: Column[] = [
  { key: "pos", label: "#", className: "w-13" },
  { key: "name", label: "Ник", className: "w-[22%]" },
  { key: "rank", label: "Звание" },
  { key: "joinTime", label: "В клане с", className: WIDE_ONLY },
  { key: "daysInClan", label: "Дней в клане", align: "right" },
  { key: "lastLogin", label: "Последний вход" },
  { key: "daysSinceLastLogin", label: "Не заходил, дн.", align: "right" },
];

export function MembersTable({
  rows,
  emptyText,
  sort,
  onSortChange,
  canEditNotes,
  rules,
}: {
  rows: RosterRow[];
  emptyText: string;
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  canEditNotes: boolean;
  rules: AbsenceRules;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-solid border-line bg-surface">
      <table className="w-full min-w-217.5 border-collapse text-left text-sm min-[1100px]:min-w-255">
        <thead className="border-b border-solid border-line bg-head">
          <tr>
            {COLUMNS.map((column) => (
              <ColumnHeader
                key={column.key}
                column={column}
                sortDir={sort.key === column.key ? sort.dir : undefined}
                onSort={() => onSortChange(toggleSort(sort, column.key))}
              />
            ))}
            {canEditNotes && (
              <th scope="col" className={`${HEADER_TEXT} w-[20%] px-4`}>
                Заметка
              </th>
            )}
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={COLUMNS.length + 1}
                className="p-10 text-center text-sm text-muted"
              >
                {emptyText}
              </td>
            </tr>
          )}

          {rows.map((row) => (
            <MemberRow
              key={row.name}
              row={row}
              canEditNotes={canEditNotes}
              rules={rules}
            />
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
      className={`${column.align === "right" ? "text-right" : ""} ${column.className ?? ""}`}
    >
      <button
        type="button"
        onClick={onSort}
        className={`${HEADER_TEXT} inline-flex h-10 cursor-pointer items-center gap-1 border-0 bg-transparent px-3.5`}
      >
        {column.label}
        {sortDir && (
          <span aria-hidden className="text-ink">
            {sortDir === "desc" ? "↓" : "↑"}
          </span>
        )}
      </button>
    </th>
  );
}

function MemberRow({
  row,
  canEditNotes,
  rules,
}: {
  row: RosterRow;
  canEditNotes: boolean;
  rules: AbsenceRules;
}) {
  const router = useRouter();
  const rank = RANK_BY_ID[row.rank];
  const flag = absenceFlag(row, rules);
  const href = playerPath(row.name);
  const days = row.daysSinceLastLogin;

  return (
    <tr
      onClick={() => router.push(href)}
      className="h-10.5 cursor-pointer border-t border-solid border-line-soft hover:bg-alt-250"
    >
      <td className="px-3.5 font-jetbrains-mono text-[12px] text-dim-179">
        {row.pos}
      </td>

      <td className="max-w-0 truncate px-3.5">
        <Link
          href={href}
          onClick={(event) => event.stopPropagation()}
          className="font-semibold text-ink no-underline"
        >
          {row.name}
        </Link>
      </td>

      <td className="px-3.5">
        <span
          className={`inline-flex h-5.5 items-center gap-1.5 rounded-[11px] pr-2.25 pl-1.75 text-[12.5px] font-medium whitespace-nowrap ${rank?.badge ?? "bg-wash text-ink-soft"}`}
        >
          <span
            className="size-1.5 rounded-full"
            style={{ backgroundColor: rank?.color ?? "var(--muted)" }}
          />
          {rank?.label ?? row.rank}
        </span>
      </td>

      <td className={`${MONO_CELL} ${WIDE_ONLY}`}>
        <LocalTime value={row.joinTime} format="date" />
      </td>

      <td className="px-3.5 text-right font-jetbrains-mono text-[12.5px]">
        {row.daysInClan}
      </td>

      <td className={MONO_CELL}>
        <LocalTime value={row.lastLogin} format="dateTime" />
      </td>

      <td className="px-3.5 text-right">
        <span
          title={flag ? ABSENCE_STYLES[flag].label : undefined}
          className={`inline-block min-w-7.5 rounded-sm px-1.75 py-0.5 text-center font-jetbrains-mono text-[12.5px] ${
            flag
              ? `font-semibold ${ABSENCE_STYLES[flag].className}`
              : days
                ? "text-ink-soft"
                : "text-dim-179"
          }`}
        >
          {days ?? "—"}
        </span>
      </td>

      {canEditNotes && (
        <td className="px-2" onClick={(event) => event.stopPropagation()}>
          <NoteField
            initialValue={row.note ?? ""}
            label={`Заметка: ${row.name}`}
            updatedBy={row.noteUpdatedBy}
            onSave={(value) => saveMemberNote(row.name, value)}
          />
        </td>
      )}
    </tr>
  );
}
