import { LocalTime } from "@/components/LocalTime";
import { pluralRu } from "@/lib/plural";
import type { ClanInfo } from "@/lib/stalzone/types";

export function MembersHeader({
  clan,
  memberCount,
  updatedAt,
}: {
  clan: ClanInfo;
  memberCount: number;
  updatedAt: Date;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-2.5 gap-y-6 border-b border-solid border-line pb-4">
      <div>
        <div className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
          Состав клана
        </div>
        <h1 className="mt-1.5 text-[clamp(22px,3vw,28px)] leading-[1.15] font-semibold tracking-[-0.01em]">
          [{clan.tag}] {clan.name}
        </h1>
      </div>
      <div className="font-jetbrains-mono text-[12.5px] leading-snug text-muted antialiased">
        <span className="inline-flex flex-wrap items-center gap-x-1.5">
          <span>
            {memberCount}{" "}
            {pluralRu(memberCount, ["участник", "участника", "участников"])}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            обновлено <LocalTime value={updatedAt} format="dateTime" />
          </span>
        </span>
      </div>
    </div>
  );
}
