import Link from "next/link";
import { LocalTime } from "@/components/LocalTime";
import {
  ABSENCE_STYLES,
  absenceFlag,
  needsAttention,
  playerPath,
  RANK_BY_ID,
  type MemberData,
} from "@/lib/members/members";
import { DAY_FORMS, pluralRu } from "@/lib/plural";
import type { AbsenceRules } from "@/lib/settings/settings";
import { Panel } from "./Panel";

const VISIBLE_ROWS = 8;

function AttentionRow({
  member,
  rules,
}: {
  member: MemberData;
  rules: AbsenceRules;
}) {
  const { name, daysSinceLastLogin: days, lastLogin } = member;
  const rank = RANK_BY_ID[member.rank];

  return (
    <Link
      href={playerPath(name)}
      className="grid min-h-11.5 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-t border-solid border-line-soft px-4 py-2 text-ink no-underline hover:bg-alt-250"
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{name}</span>
        <span className="mt-0.5 block font-jetbrains-mono text-[11.5px] text-muted">
          {lastLogin ? (
            <>
              последний вход <LocalTime value={lastLogin} format="dateTime" />
            </>
          ) : (
            "вход неизвестен"
          )}
        </span>
      </span>
      <span
        className={`inline-flex h-5.5 items-center gap-1.5 rounded-[11px] pr-2.25 pl-1.75 text-[12px] font-medium ${rank?.badge ?? "bg-wash text-ink-soft"}`}
      >
        <span
          className="size-1.5 rounded-full"
          style={{ backgroundColor: rank?.color ?? "var(--muted)" }}
        />
        {rank?.label ?? member.rank}
      </span>
      <span
        className={`rounded-sm px-2 py-0.5 font-jetbrains-mono text-[12px] font-semibold whitespace-nowrap ${
          days === null
            ? "bg-wash text-muted"
            : ABSENCE_STYLES[absenceFlag(member, rules) ?? "crit"].className
        }`}
      >
        {days === null ? "нет данных" : `${days} ${pluralRu(days, DAY_FORMS)}`}
      </span>
    </Link>
  );
}

export function AttentionList({
  members,
  rules,
}: {
  members: MemberData[];
  rules: AbsenceRules;
}) {
  const rows = members
    .filter((member) => needsAttention(member, rules))
    .sort((a, b) => (b.daysSinceLastLogin ?? -1) - (a.daysSinceLastLogin ?? -1))
    .slice(0, VISIBLE_ROWS);

  return (
    <Panel
      title="Требуют внимания"
      aside={
        <Link
          href="/members?filter=attention"
          className="text-[12.5px] text-ink-soft"
        >
          в составе →
        </Link>
      }
      className="flex-[1_1_420px]"
    >
      <div className="-mt-px">
        {rows.length === 0 && (
          <div className="border-t border-solid border-line-soft px-4 py-3 text-sm text-muted">
            Все заходили недавно
          </div>
        )}
        {rows.map((member) => (
          <AttentionRow key={member.name} member={member} rules={rules} />
        ))}
      </div>
    </Panel>
  );
}
