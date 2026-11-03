import Link from "next/link";
import { LocalTime } from "@/components/LocalTime";
import {
  needsAttention,
  playerPath,
  RANK_BY_ID,
  type MemberData,
} from "@/lib/members/members";
import { DAY_FORMS, pluralRu } from "@/lib/plural";
import { Panel } from "./Panel";

const VISIBLE_ROWS = 8;

function AttentionRow({ member }: { member: MemberData }) {
  const { name, daysSinceLastLogin: days, lastLogin } = member;
  const rank = RANK_BY_ID[member.rank];

  return (
    <Link
      href={playerPath(name)}
      className="grid min-h-11.5 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-t border-solid border-[rgb(238,240,243)] px-4 py-2 text-[rgb(23,25,30)] no-underline hover:bg-[rgb(250,251,252)]"
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{name}</span>
        <span className="font-jetbrains-mono mt-0.5 block text-[11.5px] text-[rgb(134,140,150)]">
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
        className={`inline-flex h-5.5 items-center gap-1.5 rounded-[11px] pr-2.25 pl-1.75 text-[12px] font-medium ${rank?.badge ?? "bg-gray-100 text-gray-600"}`}
      >
        <span
          className="size-1.5 rounded-full"
          style={{ backgroundColor: rank?.color ?? "rgb(134,140,150)" }}
        />
        {rank?.label ?? member.rank}
      </span>
      <span
        className={`font-jetbrains-mono rounded-sm px-2 py-0.5 text-[12px] font-semibold whitespace-nowrap ${
          days === null
            ? "bg-[rgb(241,242,244)] text-[rgb(134,140,150)]"
            : "bg-[oklch(0.955_0.035_25)] text-[oklch(0.52_0.19_25)]"
        }`}
      >
        {days === null ? "нет данных" : `${days} ${pluralRu(days, DAY_FORMS)}`}
      </span>
    </Link>
  );
}

export function AttentionList({ members }: { members: MemberData[] }) {
  const rows = members
    .filter(needsAttention)
    .sort((a, b) => (b.daysSinceLastLogin ?? -1) - (a.daysSinceLastLogin ?? -1))
    .slice(0, VISIBLE_ROWS);

  return (
    <Panel
      title="Требуют внимания"
      aside={
        <Link
          href="/members?filter=attention"
          className="text-[12.5px] text-[rgb(79,85,96)]"
        >
          в составе →
        </Link>
      }
      className="flex-[1_1_420px]"
    >
      <div className="-mt-px">
        {rows.length === 0 && (
          <div className="border-t border-solid border-[rgb(238,240,243)] px-4 py-3 text-sm text-[rgb(134,140,150)]">
            Все заходили недавно
          </div>
        )}
        {rows.map((member) => (
          <AttentionRow key={member.name} member={member} />
        ))}
      </div>
    </Panel>
  );
}
