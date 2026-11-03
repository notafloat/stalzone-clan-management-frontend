import { LocalTime } from "@/components/LocalTime";
import { StatCard, StatGrid } from "@/components/StatCard";
import { daysBetween } from "@/lib/dates";
import { clanProgress, summarizeMembers } from "@/lib/members/clan-stats";
import { allianceLabel, type MemberData } from "@/lib/members/members";
import { DAY_FORMS, pluralRu } from "@/lib/plural";
import type { ClanInfo } from "@/lib/stalzone/types";

const numberFormat = new Intl.NumberFormat("ru-RU");

export function ClanStats({
  clan,
  members,
  now,
}: {
  clan: ClanInfo;
  members: MemberData[];
  now: Date;
}) {
  const stats = summarizeMembers(members);
  const age = daysBetween(clan.registrationTime, now.getTime());
  const progress = clanProgress(clan.level, clan.levelPoints);

  return (
    <StatGrid>
      <StatCard
        label="Уровень"
        value={progress.level}
        hint={`${numberFormat.format(progress.influence)} влияния`}
      />
      <StatCard label="Лидер" value={clan.leader} />
      <StatCard label="Альянс" value={allianceLabel(clan.alliance)} />
      <StatCard
        label="Основан"
        value={<LocalTime value={clan.registrationTime} format="date" />}
        hint={
          age === null ? undefined : `${age} ${pluralRu(age, DAY_FORMS)} назад`
        }
      />
      <StatCard label="Участников" value={stats.total} />
      <StatCard
        label="Заходили за 7 дней"
        value={stats.activeRecently}
        hint={`из ${stats.total}`}
      />
      <StatCard label="Не заходили 14+ дней" value={stats.longAbsent} />
      <StatCard label="Новички (меньше 7 дней)" value={stats.newcomers} />
      <StatCard label="Вступили за 30 дней" value={stats.joinedRecently} />
    </StatGrid>
  );
}
