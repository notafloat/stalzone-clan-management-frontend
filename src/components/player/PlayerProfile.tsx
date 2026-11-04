import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Panel, PanelAsideText } from "@/components/clan/Panel";
import { LocalTime } from "@/components/LocalTime";
import { StatCard, StatGrid } from "@/components/StatCard";
import { daysBetween } from "@/lib/dates";
import { getDb } from "@/lib/db/client";
import { getGameStats } from "@/lib/members/game-stats";
import {
  allianceLabel,
  ABSENCE_STYLES,
  absenceFlag,
  isOfficerRank,
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
import {
  findPlayerByName,
  getActivityDays,
  getMemberNotes,
  getPlayerEvents,
} from "@/lib/members/store";
import { DAY_FORMS, pluralRu } from "@/lib/plural";
import { getAbsenceRules, getTrackingStart } from "@/lib/settings/store";
import type { Lineup } from "@/lib/squads/lineup";
import { getLineup } from "@/lib/squads/store";
import { MemberNoteBox } from "./MemberNoteBox";
import { ActivityGrid, RankHistory } from "./PlayerSections";

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

function logFailure(what: string) {
  return (error: unknown) => {
    console.error(`Could not load ${what}:`, error);
    return null;
  };
}

function lineupPlace(lineup: Lineup, name: string) {
  const squad = lineup.squads.find(({ players }) => players.includes(name));
  if (squad) {
    return {
      value: squad.name,
      hint: `${squad.players.length}/${squad.size} в отряде`,
    };
  }
  const absence = lineup.absentReason.find((entry) => entry.name === name);
  if (absence) return { value: "отсутствует", hint: "по причине" };
  if (lineup.absentNo.includes(name)) {
    return { value: "отсутствует", hint: "без причины" };
  }
  return { value: "не распределён", hint: "в общем составе" };
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
    <div className="border-b border-solid border-line pb-4.5">
      <div className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
        Профиль игрока
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-2.5">
        <h1 className="text-[clamp(26px,4vw,34px)] leading-[1.1] font-semibold tracking-[-0.015em] wrap-anywhere">
          {name}
        </h1>
        {badge}
      </div>
      <div className="mt-2 text-sm text-ink-soft">{subline}</div>
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
      className="flex h-8 max-w-[38vw] min-w-0 items-center gap-1.5 overflow-hidden rounded-md border border-solid border-edge-217 bg-surface px-2.5 text-[13px] whitespace-nowrap text-ink-soft no-underline hover:bg-hover"
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
      className="flex-none text-[13.5px] text-ink-soft no-underline"
    >
      ← Состав клана
    </Link>
  );

  const db = getDb();
  const record = db
    ? await findPlayerByName(db, name).catch(logFailure("the player"))
    : null;
  const events =
    db && record
      ? await getPlayerEvents(db, record.uuid).catch(logFailure("the events"))
      : null;

  const index = members.findIndex((member) => member.name === name);
  if (index === -1) {
    return (
      <>
        {backLink}
        <PlayerHeading
          name={name}
          badge={
            <span className="inline-flex h-6.5 items-center gap-1.75 rounded-[13px] border border-solid border-line bg-surface pr-2.75 pl-2.25 text-[13.5px] font-medium text-muted">
              <span className="size-1.75 rounded-full bg-edge-213" />
              не в клане
            </span>
          }
          subline={`Сейчас не состоит в ${clanLabel}`}
        />
        {record && (
          <RankHistory events={events ?? []} title="История в клане" />
        )}
      </>
    );
  }

  const previous = members[(index - 1 + members.length) % members.length];
  const next = members[(index + 1) % members.length];
  const member = await withLastLogin(members[index]);
  const rank = RANK_BY_ID[member.rank];
  const { daysSinceLastLogin: daysAway, daysInClan } = member;
  const rules = await getAbsenceRules();
  const flag = absenceFlag(member, rules);

  const canSeeNote = isOfficerRank(clan.member.rank);
  const [activeDays, trackingStart, saved, notes] = await Promise.all([
    db && record
      ? getActivityDays(db, record.uuid).catch(logFailure("the activity"))
      : null,
    getTrackingStart(),
    db ? getLineup(db).catch(logFailure("the lineup")) : null,
    // Fetched only after the rank check, so that notes never reach anyone else's browser.
    db && canSeeNote ? getMemberNotes(db).catch(logFailure("the notes")) : null,
  ]);
  const place = saved && lineupPlace(saved.lineup, name);

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
              className={`inline-flex h-6.5 items-center gap-1.75 rounded-[13px] pr-2.75 pl-2.25 text-[13.5px] font-medium ${rank?.badge ?? "bg-wash text-ink-soft"}`}
            >
              <span
                className="size-1.75 rounded-full"
                style={{ backgroundColor: rank?.color ?? "var(--muted)" }}
              />
              {rank?.label ?? member.rank}
            </span>
            {flag && (
              <span
                className={`inline-flex h-6.5 items-center rounded-sm px-2.5 text-[13px] font-semibold ${ABSENCE_STYLES[flag].className}`}
              >
                {ABSENCE_STYLES[flag].label}
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
          hint={
            !flag
              ? "в норме"
              : daysAway === null
                ? "вход неизвестен"
                : `порог: ${flag === "crit" ? rules.crit : rules.warn} дн.`
          }
          valueClassName={
            flag === "crit"
              ? "text-tone-red-52"
              : flag === "warn"
                ? "text-tone-amber-52"
                : ""
          }
        />
        {place && saved && (
          <StatCard
            label={
              saved.lineup.event === "Сбор"
                ? "Сбор"
                : `Сбор · ${saved.lineup.event}`
            }
            value={place.value}
            hint={place.hint}
          />
        )}
      </StatGrid>

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[1.5_1_460px] flex-col gap-4">
          {activeDays && (
            <ActivityGrid
              activeDays={activeDays}
              joinedAt={member.joinTime}
              trackingStart={trackingStart}
              now={new Date()}
            />
          )}
          <Panel
            title="Статистика из игры"
            aside={<PanelAsideText>STALZONE API</PanelAsideText>}
            className=""
          >
            <Suspense
              fallback={<div className="h-21.5 animate-pulse bg-alt-250" />}
            >
              <GameStats name={name} />
            </Suspense>
          </Panel>
        </div>
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
          {events && <RankHistory events={events} />}
          {notes && (
            <Panel
              title="Заметка офицеров"
              aside={<PanelAsideText>видят офицеры и выше</PanelAsideText>}
              className=""
            >
              <MemberNoteBox
                name={name}
                initialValue={notes.get(name)?.note ?? ""}
              />
            </Panel>
          )}
        </div>
      </div>
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
      <div className="px-4 py-3.5 text-sm text-muted">
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
    <div className="px-4 pt-3.5 pb-4 shadow-[inset_-1px_0_0_var(--line-soft),inset_0_-1px_0_var(--line-soft)]">
      <div className="text-[12.5px] text-muted">{label}</div>
      <div className="mt-1.5 font-jetbrains-mono text-[22px] font-semibold tracking-[-0.02em]">
        {value}
      </div>
    </div>
  );
}
