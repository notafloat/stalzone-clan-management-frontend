import Link from "next/link";
import { LocalTime } from "@/components/LocalTime";
import { playerPath, RANK_BY_ID, type MemberData } from "@/lib/members/members";
import { Panel } from "./Panel";

const VISIBLE_ROWS = 6;

export function RecentJoins({ members }: { members: MemberData[] }) {
  const rows = [...members]
    .sort((a, b) => b.joinTime.getTime() - a.joinTime.getTime())
    .slice(0, VISIBLE_ROWS);

  return (
    <Panel title="Последние вступления" className="flex-[1_1_420px]">
      <div className="-mt-px">
        {rows.map(({ name, rank, joinTime }) => (
          <div
            key={name}
            className="grid min-h-11 grid-cols-[92px_84px_minmax(0,1fr)] items-center gap-2.5 border-t border-solid border-line-soft px-4 py-2 text-sm"
          >
            <span className="font-jetbrains-mono text-[12px] text-muted">
              <LocalTime value={joinTime} format="dayMonthTime" />
            </span>
            <span className="font-semibold text-tone-green-52">Вступил</span>
            <span className="min-w-0 truncate">
              <Link
                href={playerPath(name)}
                className="font-semibold text-ink no-underline hover:underline"
              >
                {name}
              </Link>{" "}
              <span className="text-muted">
                сейчас {RANK_BY_ID[rank]?.label ?? rank}
              </span>
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
