import { connection } from "next/server";
import { LocalTime } from "@/components/LocalTime";
import { headcountByDay } from "@/lib/members/clan-stats";
import { REGION } from "@/lib/members/members";
import {
  getCurrentMembership,
  getDataUpdatedAt,
  getRoster,
} from "@/lib/members/roster";
import { getAbsenceRules } from "@/lib/settings/store";
import { AttentionList } from "./AttentionList";
import { ClanStats } from "./ClanStats";
import { HeadcountChart } from "./HeadcountChart";
import { RankBreakdown } from "./RankBreakdown";
import { RecentJoins } from "./RecentJoins";

const CLAN_PATH = "/clan";

export async function ClanOverview() {
  await connection();
  const [{ clan }, members, updatedAt, rules] = await Promise.all([
    getCurrentMembership(CLAN_PATH),
    getRoster(CLAN_PATH),
    getDataUpdatedAt(),
    getAbsenceRules(),
  ]);
  const now = new Date();

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2.5 border-b border-solid border-line pb-4">
        <div>
          <div className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
            Клан · {REGION}
          </div>
          <h1 className="mt-1.5 text-[clamp(22px,3vw,28px)] leading-[1.15] font-semibold tracking-[-0.01em]">
            [{clan.info.tag}] {clan.info.name}
          </h1>
          {clan.info.description && (
            <div className="mt-1.5 text-sm text-ink-soft">
              {clan.info.description}
            </div>
          )}
        </div>
        <div className="font-jetbrains-mono text-[12.5px] text-muted">
          STALZONE API · обновлено{" "}
          <LocalTime value={updatedAt} format="dateTime" />
        </div>
      </div>
      <ClanStats clan={clan.info} members={members} now={now} />
      <div className="flex flex-wrap items-start gap-5">
        <HeadcountChart
          days={headcountByDay(
            members,
            new Date(clan.info.registrationTime),
            now,
          )}
        />
        <RankBreakdown members={members} />
      </div>
      <div className="flex flex-wrap items-start gap-5">
        <AttentionList members={members} rules={rules} />
        <RecentJoins members={members} />
      </div>
    </>
  );
}
