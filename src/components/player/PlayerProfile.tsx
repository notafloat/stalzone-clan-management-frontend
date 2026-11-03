import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Panel, PanelAsideText } from "@/components/clan/Panel";
import { LocalTime } from "@/components/LocalTime";
import { StatCard, StatGrid } from "@/components/StatCard";
import { daysBetween } from "@/lib/dates";
import { getGameStats } from "@/lib/members/game-stats";
import {
  allianceLabel,
  INACTIVE_DAYS,
  needsAttention,
  playerPath,
  RANK_BY_ID,
  REGION,
  type MemberData,
} from "@/lib/members/members";
import {
  getCurrentMembership,
  getPublicProfile,
  getRoster,
} from "@/lib/members/roster";
import { DAY_FORMS, pluralRu } from "@/lib/plural";

export type PlayerParams = Promise<{ name: string }>;

const numberFormat = new Intl.NumberFormat("ru-RU");
const ratioFormat = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatDays = (days: number) => `${days} ${pluralRu(days, DAY_FORMS)}`;

function decodeName(raw: string) {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function PlayerHeading({
  name,
  badge,
  subline,
}: {
  name: string;
  badge: React.ReactNode;
  subline: string;
}) {
  return (
    <div className="border-b border-solid border-[rgb(223,226,231)] pb-4.5">
      <div className="text-[11px] font-semibold tracking-[0.14em] text-[rgb(134,140,150)] uppercase">
        Профиль игрока
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-2.5">
        <h1 className="text-[clamp(26px,4vw,34px)] leading-[1.1] font-semibold tracking-[-0.015em] wrap-anywhere">
          {name}
        </h1>
        {badge}
      </div>
      <div className="mt-2 text-sm text-[rgb(79,85,96)]">{subline}</div>
    </div>
  );
}

function NeighbourLink({
  member,
  direction,
}: {
  member: MemberData;
  direction: "prev" | "next";
}) {
  const isPrev = direction === "prev";
  return (
    <Link
      href={playerPath(member.name)}
      title={isPrev ? "Предыдущий" : "Следующий"}
      className="flex h-8 max-w-[38vw] min-w-0 items-center gap-1.5 overflow-hidden rounded-md border border-solid border-[rgb(217,220,225)] bg-white px-2.5 text-[13px] whitespace-nowrap text-[rgb(79,85,96)] no-underline hover:bg-[rgb(245,246,248)]"
    >
      {isPrev && "← "}
      <span className="truncate">{member.name}</span>
      {!isPrev && " →"}
    </Link>
  );
}

export async function PlayerProfile({ params }: { params: PlayerParams }) {
  await connection();
  const name = decodeName((await params).name);
  const path = playerPath(name);

  const [{ clan }, members] = await Promise.all([
    getCurrentMembership(path),
    getRoster(path, { lastLogins: false }),
  ]);
  const clanLabel = `[${clan.info.tag}] ${clan.info.name}`;
  const backLink = (
    <Link
      href="/members"
      className="flex-none text-[13.5px] text-[rgb(79,85,96)] no-underline"
    >
      ← Состав клана
    </Link>
  );

  const index = members.findIndex((member) => member.name === name);
  if (index === -1) {
    return (
      <>
        {backLink}
        <PlayerHeading
          name={name}
          badge={
            <span className="inline-flex h-6.5 items-center gap-1.75 rounded-[13px] border border-solid border-[rgb(223,226,231)] bg-white pr-2.75 pl-2.25 text-[13.5px] font-medium text-[rgb(134,140,150)]">
              <span className="size-1.75 rounded-full bg-[rgb(213,216,222)]" />
              не в клане
            </span>
          }
          subline={`Сейчас не состоит в ${clanLabel}`}
        />
      </>
    );
  }

  const previous = members[(index - 1 + members.length) % members.length];
  const next = members[(index + 1) % members.length];
  const member = await withLastLogin(members[index]);
  const rank = RANK_BY_ID[member.rank];
  const { daysSinceLastLogin: daysAway, daysInClan } = member;
  const isFlagged = needsAttention(member);

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        {backLink}
        {members.length > 1 && (
          <div className="flex min-w-0 gap-1.5">
            <NeighbourLink member={previous} direction="prev" />
            <NeighbourLink member={next} direction="next" />
          </div>
        )}
      </div>

      <PlayerHeading
        name={name}
        badge={
          <>
            <span
              className={`inline-flex h-6.5 items-center gap-1.75 rounded-[13px] pr-2.75 pl-2.25 text-[13.5px] font-medium ${rank?.badge ?? "bg-gray-100 text-gray-600"}`}
            >
              <span
                className="size-1.75 rounded-full"
                style={{ backgroundColor: rank?.color ?? "rgb(134,140,150)" }}
              />
              {rank?.label ?? member.rank}
            </span>
            {isFlagged && (
              <span className="inline-flex h-6.5 items-center rounded-sm bg-[oklch(0.955_0.035_25)] px-2.5 text-[13px] font-semibold text-[oklch(0.52_0.19_25)]">
                Требует внимания
              </span>
            )}
          </>
        }
        subline={`${clanLabel} · ${allianceLabel(clan.info.alliance)} · ${REGION}`}
      />

      <StatGrid>
        <StatCard
          label="В клане с"
          value={<LocalTime value={member.joinTime} format="date" />}
          hint={formatDays(daysInClan)}
        />
        <StatCard
          label="Последний вход"
          value={<LocalTime value={member.lastLogin} format="dateTime" />}
          hint={
            daysAway === null
              ? "нет данных"
              : daysAway === 0
                ? "менее суток назад"
                : `${formatDays(daysAway)} назад`
          }
        />
        <StatCard
          label="Не заходил"
          value={daysAway === null ? "—" : formatDays(daysAway)}
          hint={isFlagged ? `порог: ${INACTIVE_DAYS} дн.` : "в норме"}
          valueClassName={isFlagged ? "text-[oklch(0.52_0.19_25)]" : ""}
        />
      </StatGrid>

      <Panel
        title="Статистика из игры"
        aside={<PanelAsideText>STALZONE API</PanelAsideText>}
        className=""
      >
        <Suspense
          fallback={
            <div className="h-21.5 animate-pulse bg-[rgb(250,251,252)]" />
          }
        >
          <GameStats name={name} />
        </Suspense>
      </Panel>
    </>
  );
}

/** Tracker data has every login; only a roster straight from the API needs this lookup. */
async function withLastLogin(member: MemberData): Promise<MemberData> {
  if (member.lastLogin) return member;
  const profile = await getPublicProfile(member.name).catch(() => null);
  if (!profile?.lastLogin) return member;
  return {
    ...member,
    lastLogin: new Date(profile.lastLogin),
    daysSinceLastLogin: daysBetween(profile.lastLogin),
  };
}

/** Stats aren't tracked, so they load on their own and don't hold up the page. */
async function GameStats({ name }: { name: string }) {
  const profile = await getPublicProfile(name).catch(() => null);
  const stats = profile && getGameStats(profile);

  if (!stats) {
    return (
      <div className="px-4 py-3.5 text-sm text-[rgb(134,140,150)]">
        Статистика недоступна
      </div>
    );
  }
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))]">
      <GameStat label="Убийства" value={formatCount(stats.kills)} />
      <GameStat label="Смерти" value={formatCount(stats.deaths)} />
      <GameStat
        label="K/D"
        value={
          stats.killDeathRatio === null
            ? "—"
            : ratioFormat.format(stats.killDeathRatio)
        }
      />
      <GameStat
        label="Время в игре"
        value={
          stats.hoursPlayed === null
            ? "—"
            : `${numberFormat.format(stats.hoursPlayed)} ч`
        }
      />
    </div>
  );
}

function formatCount(value: number | null) {
  return value === null ? "—" : numberFormat.format(value);
}

function GameStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 pt-3.5 pb-4 shadow-[inset_-1px_0_0_rgb(238,240,243),inset_0_-1px_0_rgb(238,240,243)]">
      <div className="text-[12.5px] text-[rgb(134,140,150)]">{label}</div>
      <div className="font-jetbrains-mono mt-1.5 text-[22px] font-semibold tracking-[-0.02em]">
        {value}
      </div>
    </div>
  );
}
