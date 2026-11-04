import Link from "next/link";
import {
  ABSENCE_STYLES,
  absenceFlag,
  formatLastSeen,
  playerPath,
  RANK_BY_ID,
} from "@/lib/members/members";
import type { RosterRow } from "@/lib/members/roster-sort";
import type { AbsenceRules } from "@/lib/settings/settings";

export function MembersCards({
  rows,
  emptyText,
  rules,
}: {
  rows: RosterRow[];
  emptyText: string;
  rules: AbsenceRules;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-solid border-line bg-surface">
      {rows.map((row) => {
        const rank = RANK_BY_ID[row.rank];
        const flag = absenceFlag(row, rules);
        return (
          <Link
            key={row.name}
            href={playerPath(row.name)}
            className="-mt-px grid grid-cols-[26px_minmax(0,1fr)_auto] items-center gap-2.5 border-t border-solid border-line-soft px-3.5 py-2.75 text-ink no-underline"
          >
            <span className="font-jetbrains-mono text-[11.5px] text-dim-179">
              {row.pos}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold">
                {row.name}
              </span>
              <span className="mt-0.75 block font-jetbrains-mono text-[11.5px] text-muted">
                {formatLastSeen(row.daysSinceLastLogin)}
              </span>
            </span>
            <span className="flex flex-col items-end gap-1.25">
              <span
                className={`inline-flex h-5.5 items-center gap-1.5 rounded-[11px] pr-2.25 pl-1.75 text-[12px] font-medium ${rank?.badge ?? "bg-wash text-ink-soft"}`}
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: rank?.color ?? "var(--muted)" }}
                />
                {rank?.label ?? row.rank}
              </span>
              {flag && (
                <span
                  className={`rounded-sm px-1.75 py-px text-[11.5px] font-semibold ${ABSENCE_STYLES[flag].className}`}
                >
                  {ABSENCE_STYLES[flag].label}
                </span>
              )}
            </span>
          </Link>
        );
      })}
      {rows.length === 0 && (
        <div className="p-8 text-center text-sm text-muted">{emptyText}</div>
      )}
    </div>
  );
}
