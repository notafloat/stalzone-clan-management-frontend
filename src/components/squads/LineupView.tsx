import { RANK_BY_ID } from "@/lib/members/members";
import type { Lineup, Squad } from "@/lib/squads/lineup";
import type { ClanRank } from "@/lib/stalzone/types";

const ME_HEAD = "bg-[oklch(0.93_0.13_120)]";
const ME_ROW = "bg-[oklch(0.965_0.06_120)]";
const SQUADS_ALWAYS_SHOWN = 3;

type Props = {
  lineup: Lineup;
  clanLabel: string;
  me: string;
  rankOf: (name: string) => ClanRank | undefined;
};

const hasPlayer = (squad: Squad, name: string) => squad.players.includes(name);
const squadCount = ({ players, size }: Squad) => `${players.length}/${size}`;

const TABLE_HEAD =
  "flex h-13 items-center justify-between border-b border-solid border-[rgb(213,216,222)] bg-[rgb(243,244,246)] px-4";
const TABLE_TITLE = "text-sm font-semibold tracking-[0.12em] uppercase";

export function LineupDesktop({ lineup, clanLabel, me }: Props) {
  const squads = lineup.squads.filter(
    ({ players }, i) => players.length > 0 || i < SQUADS_ALWAYS_SHOWN,
  );

  return (
    <div className="rounded-md border border-solid border-[rgb(223,226,231)] bg-white px-[clamp(18px,3vw,44px)] pt-[clamp(18px,3vw,36px)] pb-[clamp(22px,3vw,40px)]">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-solid border-[rgb(213,216,222)] pb-3.5">
        <div>
          <div className="text-[12.5px] font-medium tracking-[0.2em] text-[rgb(134,140,150)] uppercase">
            Состав отрядов
          </div>
          <div className="mt-2 text-[clamp(24px,2.6vw,32px)] font-semibold tracking-[-0.01em]">
            {clanLabel}
          </div>
        </div>
        <div className="text-base text-[rgb(134,140,150)]">{lineup.event}</div>
      </div>

      <div className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] border-t border-l border-solid border-[rgb(213,216,222)]">
        {squads.map((squad) => (
          <div
            key={squad.id}
            className="pb-px shadow-[inset_-1px_0_0_rgb(213,216,222),inset_0_-1px_0_rgb(213,216,222)]"
          >
            <div
              className={`flex h-13 items-center justify-between gap-2 border-b border-solid border-[rgb(213,216,222)] px-4 ${hasPlayer(squad, me) ? ME_HEAD : "bg-[rgb(243,244,246)]"}`}
            >
              <span className={`${TABLE_TITLE} whitespace-nowrap`}>
                {squad.name}
              </span>
              <span className="text-sm text-[rgb(134,140,150)]">
                {squadCount(squad)}
              </span>
            </div>
            {Array.from({ length: squad.size }, (_, i) => {
              const player = squad.players[i];
              return (
                <div
                  key={i}
                  className={`-mt-px flex h-11 items-center gap-3.5 border-t border-solid border-[rgb(233,235,238)] px-4 ${player === me ? ME_ROW : "bg-white"}`}
                >
                  <span className="w-2.5 flex-none text-[13px] text-[rgb(179,184,192)]">
                    {i + 1}
                  </span>
                  <span
                    className={`min-w-0 truncate text-base ${player ? "text-[rgb(23,25,30)]" : "text-[rgb(197,201,208)]"} ${player === me ? "font-bold" : ""}`}
                  >
                    {player ?? "—"}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-9 grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] items-start gap-6">
        <div className="border border-solid border-[rgb(213,216,222)]">
          <div className={TABLE_HEAD}>
            <span className={TABLE_TITLE}>Отсутствуют по причине</span>
            <span className="text-sm text-[rgb(134,140,150)]">
              {lineup.absentReason.length}
            </span>
          </div>
          {lineup.absentReason.map(({ name, reason }) => (
            <div
              key={name}
              className="-mt-px grid grid-cols-[minmax(120px,0.8fr)_minmax(0,1.2fr)] border-t border-solid border-[rgb(233,235,238)]"
            >
              <span className="truncate border-r border-solid border-[rgb(233,235,238)] px-4 py-3 text-base">
                {name}
              </span>
              <span
                className={`px-4 py-3 text-[15px] ${reason ? "text-[rgb(79,85,96)]" : "text-[rgb(197,201,208)]"}`}
              >
                {reason || "—"}
              </span>
            </div>
          ))}
        </div>
        <div className="border border-solid border-[rgb(213,216,222)]">
          <div className={TABLE_HEAD}>
            <span className={TABLE_TITLE}>Отсутствуют без причины</span>
            <span className="text-sm text-[rgb(134,140,150)]">
              {lineup.absentNo.length}
            </span>
          </div>
          <div className="-mt-px grid grid-cols-2">
            {lineup.absentNo.map((name) => (
              <span
                key={name}
                className="truncate border-t border-solid border-[rgb(233,235,238)] px-4 py-3 text-base shadow-[inset_-1px_0_0_rgb(233,235,238)]"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileSection({
  title,
  count,
  headClass,
  children,
}: {
  title: string;
  count: string | number;
  headClass: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-solid border-[rgb(223,226,231)] bg-white">
      <div
        className={`flex h-11 items-center justify-between border-b border-solid border-[rgb(227,229,233)] px-3.5 ${headClass}`}
      >
        <span className="text-[13px] font-semibold tracking-[0.12em] uppercase">
          {title}
        </span>
        <span className="font-jetbrains-mono text-[12.5px] text-[rgb(134,140,150)]">
          {count}
        </span>
      </div>
      {children}
    </section>
  );
}

function MySquad({ lineup, me, rankOf }: Props) {
  const squad = lineup.squads.find((candidate) => hasPlayer(candidate, me));
  const title = squad
    ? squad.name
    : lineup.absentReason.some(({ name }) => name === me)
      ? "Отсутствуете по причине"
      : lineup.absentNo.includes(me)
        ? "Отсутствуете без причины"
        : "Вы не в отряде";

  return (
    <section className="overflow-hidden rounded-lg border border-solid border-[rgb(223,226,231)] bg-white">
      <div
        className={`px-4 py-3.5 ${squad ? ME_HEAD : "bg-[rgb(243,244,246)]"}`}
      >
        <div className="text-[11px] font-semibold tracking-[0.14em] text-[rgb(79,85,96)] uppercase">
          Ваш отряд
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-2.5">
          <span className="text-[22px] font-semibold">{title}</span>
          {squad && (
            <span className="font-jetbrains-mono text-[13px] text-[rgb(79,85,96)]">
              {squad.players.length} из {squad.size}
            </span>
          )}
        </div>
      </div>
      {squad?.players.map((player, i) => {
        const rank = rankOf(player);
        return (
          <div
            key={player}
            className="flex h-11.5 items-center gap-3 border-t border-solid border-[rgb(238,240,243)] px-4"
          >
            <span className="w-3 text-[13px] text-[rgb(179,184,192)]">
              {i + 1}
            </span>
            <span
              className="h-4.5 w-1 rounded-xs"
              style={{
                backgroundColor: rank ? RANK_BY_ID[rank]?.color : "transparent",
              }}
            />
            <span
              className={`min-w-0 flex-1 truncate text-[15.5px] ${player === me ? "font-bold" : "font-medium"}`}
            >
              {player}
            </span>
            <span className="text-[12px] font-semibold text-[rgb(79,85,96)]">
              {player === me ? "вы" : rank ? "" : "гость"}
            </span>
          </div>
        );
      })}
    </section>
  );
}

export function LineupMobile(props: Props) {
  const { lineup, me } = props;
  const filled = lineup.squads.filter(({ players }) => players.length > 0);
  const empty = lineup.squads.filter(({ players }) => players.length === 0);
  const NAME_CELL =
    "-mt-px flex h-10 min-w-0 items-center gap-2 border-t border-solid border-[rgb(240,241,244)] px-3.5 text-sm shadow-[inset_-1px_0_0_rgb(240,241,244)]";

  return (
    <>
      <MySquad {...props} />
      <div className="mt-1.5 text-[11px] font-semibold tracking-[0.14em] text-[rgb(134,140,150)] uppercase">
        Все отряды
      </div>
      {filled.map((squad) => (
        <MobileSection
          key={squad.id}
          title={squad.name}
          count={squadCount(squad)}
          headClass={hasPlayer(squad, me) ? ME_HEAD : "bg-[rgb(243,244,246)]"}
        >
          <div className="grid grid-cols-2">
            {squad.players.map((player, i) => (
              <span
                key={player}
                className={`${NAME_CELL} ${player === me ? "font-bold" : ""}`}
              >
                <span className="text-[12px] font-normal text-[rgb(179,184,192)]">
                  {i + 1}
                </span>
                <span className="truncate">{player}</span>
              </span>
            ))}
          </div>
        </MobileSection>
      ))}
      {empty.length > 0 && (
        <div className="text-[13px] text-[rgb(134,140,150)]">
          Пустые: {empty.map(({ name }) => name).join(", ")}
        </div>
      )}
      <MobileSection
        title="По причине"
        count={lineup.absentReason.length}
        headClass="bg-[oklch(0.97_0.02_150)]"
      >
        {lineup.absentReason.map(({ name, reason }) => (
          <div
            key={name}
            className="-mt-px flex justify-between gap-3 border-t border-solid border-[rgb(240,241,244)] px-3.5 py-2.75 text-[14.5px]"
          >
            <span>{name}</span>
            <span
              className={
                reason ? "text-[rgb(79,85,96)]" : "text-[rgb(197,201,208)]"
              }
            >
              {reason || "—"}
            </span>
          </div>
        ))}
      </MobileSection>
      <MobileSection
        title="Без причины"
        count={lineup.absentNo.length}
        headClass="bg-[oklch(0.97_0.02_25)]"
      >
        <div className="grid grid-cols-2">
          {lineup.absentNo.map((name) => (
            <span key={name} className={NAME_CELL}>
              <span className="truncate">{name}</span>
            </span>
          ))}
        </div>
      </MobileSection>
    </>
  );
}
