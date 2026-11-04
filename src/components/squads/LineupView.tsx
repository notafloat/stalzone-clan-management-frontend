import { RANK_BY_ID } from "@/lib/members/members";
import type { Lineup, Squad } from "@/lib/squads/lineup";
import type { ClanRank } from "@/lib/stalzone/types";

const ME_HEAD = "bg-tone-lime-93";
const ME_ROW = "bg-tone-lime-965";

type Props = {
  lineup: Lineup;
  me: string;
  rankOf: (name: string) => ClanRank | undefined;
};

const hasPlayer = (squad: Squad, name: string) => squad.players.includes(name);
const squadCount = ({ players, size }: Squad) => `${players.length}/${size}`;

const CARD =
  "overflow-hidden rounded-md border border-solid border-line bg-surface";
const CARD_HEAD =
  "flex h-9 items-center justify-between gap-2 border-b border-solid border-line px-3";
const CARD_TITLE = "text-[11.5px] font-semibold tracking-[0.1em] uppercase";
const CARD_COUNT = "font-jetbrains-mono text-[12px] text-muted";
const CARD_ROW =
  "-mt-px flex h-8 min-w-0 items-center gap-2 border-t border-solid border-line-233 px-3 text-sm";

export function LineupDesktop({ lineup, me }: Props) {
  const filled = lineup.squads.filter(({ players }) => players.length > 0);
  const empty = lineup.squads.filter(({ players }) => players.length === 0);
  const { absentReason, absentNo } = lineup;

  return (
    <div className="flex flex-col gap-3">
      {filled.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filled.map((squad) => (
            <section
              key={squad.id}
              data-squad={squad.name}
              className={`${CARD} min-w-0 flex-[1_1_170px]`}
            >
              <div
                className={`${CARD_HEAD} ${hasPlayer(squad, me) ? ME_HEAD : "bg-head"}`}
              >
                <span className={`${CARD_TITLE} truncate`}>{squad.name}</span>
                <span className={`${CARD_COUNT} flex-none`}>
                  {squadCount(squad)}
                </span>
              </div>
              {squad.players.map((player, i) => (
                <div
                  key={player}
                  className={`${CARD_ROW} ${player === me ? `${ME_ROW} font-bold` : ""}`}
                >
                  <span className="w-3.5 flex-none text-[12px] font-normal text-dim-179">
                    {i + 1}
                  </span>
                  <span className="truncate">{player}</span>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}

      {empty.length > 0 && (
        <div className="text-[13px] text-muted">
          {filled.length > 0 ? "Пустые" : "Все отряды пока пустые"}:{" "}
          {empty.map(({ name }) => name).join(", ")}
        </div>
      )}

      {(absentReason.length > 0 || absentNo.length > 0) && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] items-start gap-2">
          {absentReason.length > 0 && (
            <section className={CARD}>
              <div className={`${CARD_HEAD} bg-head`}>
                <span className={CARD_TITLE}>Отсутствуют по причине</span>
                <span className={CARD_COUNT}>{absentReason.length}</span>
              </div>
              {absentReason.map(({ name, reason }) => (
                <div key={name} className={CARD_ROW}>
                  <span className="max-w-[45%] flex-none truncate">{name}</span>
                  <span
                    title={reason}
                    className={`min-w-0 truncate text-[13px] ${reason ? "text-ink-soft" : "text-dim-197"}`}
                  >
                    {reason || "—"}
                  </span>
                </div>
              ))}
            </section>
          )}
          {absentNo.length > 0 && (
            <section className={CARD}>
              <div className={`${CARD_HEAD} bg-head`}>
                <span className={CARD_TITLE}>Отсутствуют без причины</span>
                <span className={CARD_COUNT}>{absentNo.length}</span>
              </div>
              <div className="grid grid-cols-2">
                {absentNo.map((name) => (
                  <span key={name} className={CARD_ROW}>
                    <span className="truncate">{name}</span>
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
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
    <section className="overflow-hidden rounded-lg border border-solid border-line bg-surface">
      <div
        className={`flex h-11 items-center justify-between border-b border-solid border-line-227 px-3.5 ${headClass}`}
      >
        <span className="text-[13px] font-semibold tracking-[0.12em] uppercase">
          {title}
        </span>
        <span className="font-jetbrains-mono text-[12.5px] text-muted">
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
    <section className="overflow-hidden rounded-lg border border-solid border-line bg-surface">
      <div className={`px-4 py-3.5 ${squad ? ME_HEAD : "bg-head"}`}>
        <div className="text-[11px] font-semibold tracking-[0.14em] text-ink-soft uppercase">
          Ваш отряд
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-2.5">
          <span className="text-[22px] font-semibold">{title}</span>
          {squad && (
            <span className="font-jetbrains-mono text-[13px] text-ink-soft">
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
            className="flex h-11.5 items-center gap-3 border-t border-solid border-line-soft px-4"
          >
            <span className="w-3 text-[13px] text-dim-179">{i + 1}</span>
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
            <span className="text-[12px] font-semibold text-ink-soft">
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
    "-mt-px flex h-10 min-w-0 items-center gap-2 border-t border-solid border-line-240 px-3.5 text-sm shadow-[inset_-1px_0_0_var(--line-240)]";

  return (
    <>
      <MySquad {...props} />
      <div className="mt-1.5 text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
        Все отряды
      </div>
      {filled.map((squad) => (
        <MobileSection
          key={squad.id}
          title={squad.name}
          count={squadCount(squad)}
          headClass={hasPlayer(squad, me) ? ME_HEAD : "bg-head"}
        >
          <div className="grid grid-cols-2">
            {squad.players.map((player, i) => (
              <span
                key={player}
                className={`${NAME_CELL} ${player === me ? "font-bold" : ""}`}
              >
                <span className="text-[12px] font-normal text-dim-179">
                  {i + 1}
                </span>
                <span className="truncate">{player}</span>
              </span>
            ))}
          </div>
        </MobileSection>
      ))}
      {empty.length > 0 && (
        <div className="text-[13px] text-muted">
          Пустые: {empty.map(({ name }) => name).join(", ")}
        </div>
      )}
      <MobileSection
        title="По причине"
        count={lineup.absentReason.length}
        headClass="bg-tone-green-97"
      >
        {lineup.absentReason.map(({ name, reason }) => (
          <div
            key={name}
            className="-mt-px flex justify-between gap-3 border-t border-solid border-line-240 px-3.5 py-2.75 text-[14.5px]"
          >
            <span>{name}</span>
            <span className={reason ? "text-ink-soft" : "text-dim-197"}>
              {reason || "—"}
            </span>
          </div>
        ))}
      </MobileSection>
      <MobileSection
        title="Без причины"
        count={lineup.absentNo.length}
        headClass="bg-tone-red-97"
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
