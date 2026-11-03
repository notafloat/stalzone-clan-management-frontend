"use client";

import { useEffect, useMemo, useState, type DragEvent } from "react";
import { CLAN_RANKS, RANK_BY_ID } from "@/lib/members/members";
import {
  movePlayer,
  placedPlayers,
  sameLocation,
  type Lineup,
  type LineupLocation,
} from "@/lib/squads/lineup";
import type { ClanRank } from "@/lib/stalzone/types";

const POOL: LineupLocation = { kind: "pool" };
const REASON: LineupLocation = { kind: "reason" };
const NO_REASON: LineupLocation = { kind: "no" };

const INPUT =
  "rounded-md border border-solid border-[rgb(217,220,225)] bg-white text-[13px] outline-none focus:border-[rgb(23,25,30)]";
const EMPTY_SLOT =
  "grid h-8.5 place-items-center rounded-[5px] border border-dashed border-[rgb(213,216,222)] text-[12.5px] text-[rgb(163,169,178)]";
const COUNT_PILL =
  "font-jetbrains-mono rounded-[10px] px-1.75 py-0.5 text-[12px] font-semibold";

const HELP =
  "Перетаскивайте ники мышью. Без мыши: кликните ник, затем кликните отряд. Двойной клик по нику вернёт его в состав. Название отряда можно переименовать. Чтобы поменять игроков местами, перетащите ник прямо на игрока в полном отряде.";

type Selection = { name: string; from: LineupLocation };

export function SquadEditor({
  lineup,
  members,
  rankOf,
  me,
  isMobile,
  onCommit,
  onDraft,
  onBeforeTyping,
  onToast,
}: {
  lineup: Lineup;
  members: { name: string; rank: ClanRank }[];
  rankOf: (name: string) => ClanRank | undefined;
  me: string;
  isMobile: boolean;
  /** A finished change: can be undone. */
  onCommit: (next: Lineup) => void;
  /** A change while typing: `onBeforeTyping` already saved the undo point. */
  onDraft: (update: (current: Lineup) => Lineup) => void;
  onBeforeTyping: () => void;
  onToast: (message: string) => void;
}) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [poolQuery, setPoolQuery] = useState("");
  const [guestName, setGuestName] = useState("");
  const [dragged, setDragged] = useState<Selection | null>(null);

  useEffect(() => {
    function clearOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setSelection(null);
    }
    window.addEventListener("keydown", clearOnEscape);
    return () => window.removeEventListener("keydown", clearOnEscape);
  }, []);

  const poolNames = useMemo(() => {
    const placed = placedPlayers(lineup);
    const rosterNames = new Set(members.map(({ name }) => name));
    const order = (name: string) => {
      const rank = rankOf(name);
      return rank ? (RANK_BY_ID[rank]?.order ?? 99) : 100;
    };
    return [
      ...members.map(({ name }) => name),
      ...lineup.guests.filter((guest) => !rosterNames.has(guest)),
    ]
      .filter((name) => !placed.has(name))
      .sort((a, b) => order(a) - order(b));
  }, [lineup, members, rankOf]);

  const search = poolQuery.trim().toLowerCase();
  const visiblePool = poolNames.filter(
    (name) => !search || name.toLowerCase().includes(search),
  );

  function move(
    name: string,
    from: LineupLocation,
    target: LineupLocation,
    swapWith?: string,
  ) {
    const result = movePlayer(lineup, name, from, target, swapWith);
    setSelection(null);
    setDropTarget(null);
    if (result.message) onToast(result.message);
    if (result.lineup) onCommit(result.lineup);
  }

  function chipClick(name: string, from: LineupLocation) {
    if (selection?.name === name && sameLocation(selection.from, from)) {
      setSelection(null);
    } else if (selection && !isMobile && !sameLocation(selection.from, from)) {
      move(selection.name, selection.from, from, name);
    } else {
      setSelection({ name, from });
    }
  }

  function dropZone(key: string, location: LineupLocation) {
    return {
      isActive: dropTarget === key,
      handlers: {
        onDragOver(event: DragEvent) {
          if (!dragged) return;
          event.preventDefault();
          if (dropTarget !== key) setDropTarget(key);
        },
        onDrop(event: DragEvent) {
          event.preventDefault();
          setDragged(null);
          if (dragged) move(dragged.name, dragged.from, location);
          else setDropTarget(null);
        },
        onClick() {
          if (selection && !isMobile) {
            move(selection.name, selection.from, location);
          }
        },
      },
    };
  }

  const zoneShadow = (isActive: boolean) =>
    isActive
      ? "border-[rgb(23,25,30)] shadow-[0_0_0_3px_oklch(0.93_0.13_120)]"
      : selection && !isMobile
        ? "shadow-[0_0_0_2px_oklch(0.93_0.13_120)]"
        : "";

  function renderChip(name: string, from: LineupLocation) {
    const rank = rankOf(name);
    const isGuest = !rank;
    const isSelected =
      selection?.name === name && sameLocation(selection.from, from);
    return (
      <div
        key={name}
        draggable={!isMobile}
        title={rank ? RANK_BY_ID[rank]?.label : "Не в клане"}
        data-player={name}
        onDragStart={(event) => {
          setDragged({ name, from });
          event.dataTransfer.setData("text/plain", name);
          event.dataTransfer.effectAllowed = "move";
        }}
        onDragEnd={() => {
          setDragged(null);
          setDropTarget(null);
        }}
        onDragOver={(event) => {
          if (dragged) event.preventDefault();
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setDragged(null);
          if (dragged && dragged.name !== name) {
            move(dragged.name, dragged.from, from, name);
          } else {
            setDropTarget(null);
          }
        }}
        onClick={(event) => {
          event.stopPropagation();
          chipClick(name, from);
        }}
        onDoubleClick={(event) => {
          event.stopPropagation();
          if (from.kind !== "pool") move(name, from, POOL);
        }}
        className={`flex h-8.5 min-w-0 cursor-pointer items-center overflow-hidden rounded-[5px] border text-[13.5px] select-none ${
          isGuest
            ? "border-dashed border-[rgb(163,169,178)]"
            : "border-solid border-[rgb(223,226,231)]"
        } ${name === me ? "bg-[oklch(0.965_0.06_120)] font-bold" : "bg-white font-medium"} ${
          isSelected ? "shadow-[0_0_0_2px_rgb(23,25,30)]" : ""
        }`}
      >
        <span
          className="w-1 flex-none self-stretch"
          style={{
            backgroundColor: rank ? RANK_BY_ID[rank]?.color : "transparent",
          }}
        />
        <span className="min-w-0 flex-1 truncate pr-2 pl-2.25">{name}</span>
      </div>
    );
  }

  function addGuest() {
    const name = guestName.trim();
    if (!name) return;
    if (lineup.guests.includes(name) || rankOf(name)) {
      onToast(`«${name}» уже есть в списке`);
      return;
    }
    onCommit({ ...lineup, guests: [...lineup.guests, name] });
    setGuestName("");
  }

  const pool = dropZone("pool", POOL);
  const reasonBox = dropZone("reason", REASON);
  const noBox = dropZone("no", NO_REASON);

  return (
    <>
      <div
        className={`grid items-start gap-4 ${isMobile ? "grid-cols-[minmax(0,1fr)]" : "grid-cols-[236px_minmax(0,1fr)]"}`}
      >
        <aside
          {...pool.handlers}
          data-zone="pool"
          className={`top-18 flex flex-col rounded-md border border-solid border-[rgb(223,226,231)] bg-white ${
            isMobile ? "static" : "sticky max-h-[calc(100vh-96px)]"
          } ${zoneShadow(pool.isActive)}`}
        >
          <div className="flex h-11 items-center justify-between border-b border-solid border-[rgb(238,240,243)] px-3">
            <span className="text-sm font-semibold">Состав клана</span>
            <span
              className={`${COUNT_PILL} min-w-6 bg-[rgb(241,242,244)] text-center`}
            >
              {poolNames.length}
            </span>
          </div>
          <div className="px-2.5 pt-2.5 pb-1.5">
            <input
              value={poolQuery}
              onChange={(event) => setPoolQuery(event.target.value)}
              onClick={(event) => event.stopPropagation()}
              placeholder="Поиск по нику"
              aria-label="Поиск по нику"
              className={`${INPUT} h-8 w-full px-2.5`}
            />
          </div>
          <div
            className={`grid min-h-15 flex-1 content-start gap-1.5 overflow-auto px-2.5 pt-1 pb-2.5 ${isMobile ? "grid-cols-2" : "grid-cols-[minmax(0,1fr)]"}`}
          >
            {visiblePool.map((name) => renderChip(name, POOL))}
            {visiblePool.length === 0 && (
              <div className="col-span-full px-1 py-3.5 text-center text-[12.5px] text-[rgb(163,169,178)]">
                {poolNames.length === 0
                  ? "Все распределены"
                  : "Никого не найдено"}
              </div>
            )}
          </div>
          <div className="flex gap-1.5 border-t border-solid border-[rgb(238,240,243)] p-2.5">
            <input
              value={guestName}
              maxLength={40}
              onChange={(event) => setGuestName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addGuest();
                }
              }}
              onClick={(event) => event.stopPropagation()}
              placeholder="Игрок не из клана"
              aria-label="Игрок не из клана"
              className={`${INPUT} h-8 min-w-0 flex-1 px-2.5`}
            />
            <button
              type="button"
              title="Добавить гостя"
              onClick={(event) => {
                event.stopPropagation();
                addGuest();
              }}
              className="size-8 flex-none cursor-pointer rounded-md border border-solid border-[rgb(217,220,225)] bg-white text-base hover:bg-[rgb(245,246,248)]"
            >
              +
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-3.5">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-3">
            {lineup.squads.map((squad) => {
              const location: LineupLocation = { kind: "squad", id: squad.id };
              const zone = dropZone(`squad:${squad.id}`, location);
              const count = squad.players.length;
              const isFull = count >= squad.size;
              return (
                <div
                  key={squad.id}
                  {...zone.handlers}
                  data-zone={`squad:${squad.id}`}
                  className={`flex min-h-59 flex-col rounded-md border border-solid border-[rgb(223,226,231)] bg-white ${zoneShadow(zone.isActive)}`}
                >
                  <div className="flex h-11 items-center gap-1.5 border-b border-solid border-[rgb(238,240,243)] pr-1.5 pl-3">
                    <input
                      value={squad.name}
                      maxLength={40}
                      aria-label="Название отряда"
                      onFocus={onBeforeTyping}
                      onChange={(event) => {
                        const name = event.target.value;
                        onDraft((current) => ({
                          ...current,
                          squads: current.squads.map((other) =>
                            other.id === squad.id ? { ...other, name } : other,
                          ),
                        }));
                      }}
                      onClick={(event) => event.stopPropagation()}
                      className="h-7.5 min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-semibold outline-none"
                    />
                    <span
                      className={`${COUNT_PILL} flex-none ${
                        isFull
                          ? "bg-[oklch(0.94_0.06_150)] text-[oklch(0.42_0.12_150)]"
                          : "bg-[rgb(241,242,244)] text-[rgb(79,85,96)]"
                      }`}
                    >
                      {count}/{squad.size}
                    </span>
                    <button
                      type="button"
                      title="Удалить отряд"
                      onClick={(event) => {
                        event.stopPropagation();
                        onCommit({
                          ...lineup,
                          squads: lineup.squads.filter(
                            (other) => other.id !== squad.id,
                          ),
                        });
                        onToast(
                          `Отряд «${squad.name}» удалён · игроки вернулись в состав`,
                        );
                      }}
                      className="size-7 flex-none cursor-pointer rounded-sm border-0 bg-transparent text-[17px] leading-none text-[rgb(134,140,150)] hover:bg-[rgb(241,242,244)] hover:text-[rgb(23,25,30)]"
                    >
                      ×
                    </button>
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5 p-2">
                    {squad.players.map((name) => renderChip(name, location))}
                    {!isFull && (
                      <div className={EMPTY_SLOT}>
                        {count > 0
                          ? `свободно ${squad.size - count}`
                          : "Перетащите сюда"}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] items-start gap-3">
            <div
              {...reasonBox.handlers}
              data-zone="reason"
              className={`overflow-hidden rounded-md border border-solid border-[oklch(0.88_0.05_150)] bg-white ${zoneShadow(reasonBox.isActive)}`}
            >
              <div className="flex h-10.5 items-center justify-center gap-2 border-b border-solid border-[oklch(0.9_0.04_150)] bg-[oklch(0.97_0.025_150)] text-[13.5px] font-semibold">
                Отсутствуют по причине
                <span className={`${COUNT_PILL} bg-white font-normal`}>
                  {lineup.absentReason.length}
                </span>
              </div>
              <div className="flex min-h-15 flex-col gap-1.5 p-2">
                {lineup.absentReason.map(({ name, reason }) => (
                  <div
                    key={name}
                    className="grid grid-cols-[minmax(0,190px)_minmax(0,1fr)] items-center gap-2"
                  >
                    {renderChip(name, REASON)}
                    <input
                      value={reason}
                      maxLength={200}
                      placeholder="причина…"
                      aria-label={`Причина: ${name}`}
                      onFocus={onBeforeTyping}
                      onChange={(event) => {
                        const text = event.target.value;
                        onDraft((current) => ({
                          ...current,
                          absentReason: current.absentReason.map((entry) =>
                            entry.name === name
                              ? { ...entry, reason: text }
                              : entry,
                          ),
                        }));
                      }}
                      onClick={(event) => event.stopPropagation()}
                      className="h-8.5 min-w-0 rounded-[5px] border border-solid border-[rgb(227,229,233)] bg-[rgb(250,251,252)] px-2.5 text-[13px] outline-none focus:border-[rgb(23,25,30)] focus:bg-white"
                    />
                  </div>
                ))}
                {lineup.absentReason.length === 0 && (
                  <div className={EMPTY_SLOT}>Перетащите сюда</div>
                )}
              </div>
            </div>

            <div
              {...noBox.handlers}
              data-zone="no"
              className={`overflow-hidden rounded-md border border-solid border-[oklch(0.88_0.05_25)] bg-white ${zoneShadow(noBox.isActive)}`}
            >
              <div className="flex h-10.5 items-center justify-center gap-2 border-b border-solid border-[oklch(0.9_0.04_25)] bg-[oklch(0.97_0.025_25)] text-[13.5px] font-semibold">
                Отсутствуют без причины
                <span className={`${COUNT_PILL} bg-white font-normal`}>
                  {lineup.absentNo.length}
                </span>
              </div>
              <div className="grid min-h-15 grid-cols-[repeat(auto-fill,minmax(150px,1fr))] content-start gap-1.5 p-2">
                {lineup.absentNo.map((name) => renderChip(name, NO_REASON))}
                {lineup.absentNo.length === 0 && (
                  <div className={`${EMPTY_SLOT} col-span-full`}>
                    Перетащите сюда
                  </div>
                )}
              </div>
            </div>
          </div>

          <p className="max-w-245 text-[12.5px] leading-[1.55] text-[rgb(134,140,150)]">
            {HELP}
          </p>
          <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-[12.5px] text-[rgb(79,85,96)]">
            {CLAN_RANKS.map(({ id, label, color }) => (
              <span key={id} className="inline-flex items-center gap-1.5">
                <span
                  className="size-2.5 rounded-xs"
                  style={{ backgroundColor: color }}
                />
                {label}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full border border-dashed border-[rgb(134,140,150)]" />
              не в клане
            </span>
          </div>
        </div>
      </div>

      {selection && !isMobile && (
        <div className="fixed bottom-6 left-1/2 z-45 flex -translate-x-1/2 items-center gap-3 rounded-lg bg-[rgb(23,25,30)] py-2 pr-2 pl-4 text-[13.5px] whitespace-nowrap text-white shadow-[0_10px_30px_rgba(23,25,30,0.25)]">
          <span>
            Выбран <b>{selection.name}</b> — кликните отряд или список
          </span>
          <button
            type="button"
            onClick={() => setSelection(null)}
            className="h-7.5 cursor-pointer rounded-[5px] border-0 bg-white/12 px-3 text-[13px] text-white"
          >
            Отмена
          </button>
        </div>
      )}

      {selection && isMobile && (
        <MoveSheet
          selection={selection}
          lineup={lineup}
          onMove={(target) => move(selection.name, selection.from, target)}
          onClose={() => setSelection(null)}
        />
      )}
    </>
  );
}

function MoveSheet({
  selection,
  lineup,
  onMove,
  onClose,
}: {
  selection: Selection;
  lineup: Lineup;
  onMove: (target: LineupLocation) => void;
  onClose: () => void;
}) {
  const targets: {
    label: string;
    count: string;
    location: LineupLocation;
    isFull?: boolean;
  }[] = [
    ...lineup.squads.map((squad) => ({
      label: squad.name,
      count: `${squad.players.length}/${squad.size}`,
      location: { kind: "squad", id: squad.id } as LineupLocation,
      isFull: squad.players.length >= squad.size,
    })),
    {
      label: "По причине",
      count: String(lineup.absentReason.length),
      location: REASON,
    },
    {
      label: "Без причины",
      count: String(lineup.absentNo.length),
      location: NO_REASON,
    },
    { label: "В состав клана", count: "", location: POOL },
  ];
  const { from } = selection;
  const whereNow =
    from.kind === "squad"
      ? lineup.squads.find(({ id }) => id === from.id)?.name
      : { pool: "в составе", reason: "по причине", no: "без причины" }[
          from.kind
        ];

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 bg-[rgba(23,25,30,0.32)]"
      />
      <div
        role="dialog"
        aria-label={`Переместить ${selection.name}`}
        className="fixed inset-x-0 bottom-0 z-51 max-h-[78vh] overflow-auto rounded-t-[14px] bg-white px-3.5 pt-2 pb-[calc(16px+env(safe-area-inset-bottom))] shadow-[0_-10px_30px_rgba(23,25,30,0.15)]"
      >
        <div className="mx-auto mt-1 mb-3 h-1 w-9 rounded-xs bg-[rgb(213,216,222)]" />
        <div className="text-[12.5px] text-[rgb(134,140,150)]">
          Переместить · сейчас: {whereNow}
        </div>
        <div className="mt-0.5 mb-3.5 text-[19px] font-semibold">
          {selection.name}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {targets.map(({ label, count, location, isFull }) => {
            const isCurrent = sameLocation(location, selection.from);
            return (
              <button
                key={label + count}
                type="button"
                disabled={isCurrent || isFull}
                onClick={() => onMove(location)}
                className={`flex h-12.5 items-center justify-between gap-2 rounded-lg border border-solid px-3 text-left text-[14.5px] font-medium ${
                  isCurrent
                    ? "border-[oklch(0.8_0.12_120)] bg-[oklch(0.93_0.13_120)]"
                    : "border-[rgb(217,220,225)] bg-white"
                } ${isFull && !isCurrent ? "opacity-45" : ""}`}
              >
                <span className="truncate">{label}</span>
                <span className="font-jetbrains-mono text-[12.5px] text-[rgb(134,140,150)]">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-2.5 h-12 w-full rounded-lg border border-solid border-[rgb(217,220,225)] bg-white text-[15px] font-medium"
        >
          Отмена
        </button>
      </div>
    </>
  );
}
