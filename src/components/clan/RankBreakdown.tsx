import Link from "next/link";
import { CLAN_RANKS, type MemberData } from "@/lib/members/members";
import { Panel, PanelAsideText } from "./Panel";

export function RankBreakdown({ members }: { members: MemberData[] }) {
  return (
    <Panel
      title="Звания"
      aside={<PanelAsideText>{members.length}</PanelAsideText>}
      className="flex-[1_1_320px]"
    >
      <div className="-mt-px">
        {CLAN_RANKS.map(({ id, label, color }) => {
          const count = members.filter(({ rank }) => rank === id).length;
          const share = members.length ? (count / members.length) * 100 : 0;
          return (
            <Link
              key={id}
              href="/members"
              className={`grid h-10.5 grid-cols-[120px_minmax(0,1fr)_32px] items-center gap-3 border-t border-solid border-line-soft px-4 no-underline ${count > 0 ? "text-ink" : "text-dim-163"}`}
            >
              <span className="flex items-center gap-2 text-sm">
                <span
                  className="size-2 rounded-xs"
                  style={{ backgroundColor: color }}
                />
                {label}
              </span>
              <span className="h-1.5 overflow-hidden rounded-[3px] bg-wash">
                <span
                  className="block h-full"
                  style={{ width: `${share}%`, backgroundColor: color }}
                />
              </span>
              <span
                className={`text-right font-jetbrains-mono text-[13px] font-semibold ${count > 0 ? "text-ink" : "text-dim-179"}`}
              >
                {count}
              </span>
            </Link>
          );
        })}
      </div>
    </Panel>
  );
}
