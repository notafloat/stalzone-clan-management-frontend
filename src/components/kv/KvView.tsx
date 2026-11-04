"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import {
  confirmKvWar,
  createKvWar,
  deleteKvWar,
  saveKvMarks,
} from "@/app/kv/actions";
import {
  ABSENCE_MARK_STYLES,
  shortDate,
  STAGE_STYLES,
  summarize,
  weekdayDate,
  weekdayOf,
  type KvMark,
  type KvWar,
} from "@/lib/kv/kv";
import type { KvPlayer } from "@/lib/kv/store";
import { playerPath } from "@/lib/members/members";
import { pluralRu } from "@/lib/plural";
import type { KvRules } from "@/lib/settings/settings";
import { useIsMobile } from "@/lib/use-is-mobile";
import { useSaveQueue } from "@/lib/use-save-queue";
import { KvWarDetail } from "./KvWarDetail";

const LAST_WARS = 4;
const BAD_NO_REASON_COUNT = 2;
const LOW_ATTENDANCE = 50;
const MID_ATTENDANCE = 75;
const ME_BACKGROUND = "var(--tone-lime-975)";
const TOOL_BUTTON =
  "h-8 cursor-pointer rounded-md border border-solid border-edge-217 bg-surface px-3 text-[13px] font-medium hover:bg-hover disabled:cursor-default disabled:opacity-45";

export type MarkUpdates = Record<string, KvMark>;
type AllMarks = Record<string, MarkUpdates>;
type SortKey = "idx" | "name" | "pct" | "no";

function MarkCell({
  mark,
  isMandatory,
}: {
  mark?: KvMark;
  isMandatory: boolean;
}) {
  if (!mark) return <div className="flex h-5.5 w-10" />;
  const { kind, marked } = summarize(mark);

  if (kind === "reason" || kind === "no") {
    if (!isMandatory) return <div className="flex h-5.5 w-10" />;
    const style = ABSENCE_MARK_STYLES[kind];
    return (
      <div className="flex h-5.5 w-10">
        <span
          className="grid flex-1 place-items-center rounded-[5px] font-jetbrains-mono text-[11.5px] font-semibold"
          style={{ backgroundColor: style.soft, color: style.text }}
        >
          {kind === "reason" ? "П" : "✕"}
        </span>
      </div>
    );
  }
  if (marked === 0) {
    return (
      <div className="flex h-5.5 w-10">
        <span className="flex-1 rounded-[5px] border border-dashed border-dim-197 bg-surface" />
      </div>
    );
  }
  return (
    <div className="flex h-5.5 w-10 gap-0.5" data-stage-strip>
      {mark.stages.map((stage, i) =>
        stage ? (
          <span
            key={i}
            className="flex-1 rounded-[3px]"
            style={{ backgroundColor: STAGE_STYLES[stage].solid }}
          />
        ) : (
          <span
            key={i}
            className="flex-1 rounded-[3px] border border-dashed border-dim-197 bg-surface"
          />
        ),
      )}
    </div>
  );
}

function describe(mark: KvMark | undefined, isMandatory: boolean) {
  if (!mark) return "ещё не в клане";
  const { kind, played, left, marked } = summarize(mark);
  if ((kind === "reason" || kind === "no") && !isMandatory) {
    return "Не был · КВ по желанию";
  }
  if (kind === "reason") {
    return `Не пришёл · ${mark.reason || "причина не указана"}`;
  }
  if (kind === "no") return "Не пришёл без причины";
  if (kind === "came") {
    const leftText = left ? ` · вышел${mark.why ? `: ${mark.why}` : ""}` : "";
    return `Был на ${played} из 3 этапов${leftText}`;
  }
  if (marked) return `Отмечено ${marked} из 3 этапов`;
  return mark.plan
    ? `В составе: ${mark.plan} · явка не отмечена`
    : "Не отмечен";
}

export function KvView({
  wars: initialWars,
  marks: initialMarks,
  players,
  rules,
  planOrder,
  me,
  canEdit,
  today,
  initialWar,
}: {
  wars: KvWar[];
  marks: AllMarks;
  players: KvPlayer[];
  rules: KvRules;
  planOrder: string[];
  me: string;
  canEdit: boolean;
  today: string;
  initialWar?: string;
}) {
  const [marks, setMarks] = useState(initialMarks);
  const [wars, setWars] = useState(initialWars);
  const [openWar, setOpenWar] = useState(
    initialWars.some(({ date }) => date === initialWar)
      ? initialWar
      : undefined,
  );
  const [focusUuid, setFocusUuid] = useState<string>();
  const [lastFour, setLastFour] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({
    key: "idx",
    dir: 1,
  });
  const [sheetUuid, setSheetUuid] = useState<string>();
  const [newDate, setNewDate] = useState(today);
  const [message, setMessage] = useState<string>();
  const [isBusy, setIsBusy] = useState(false);
  const isMobile = useIsMobile();
  const router = useRouter();

  const saveBatch = useCallback(
    ({ date, updates }: { date: string; updates: MarkUpdates }) =>
      saveKvMarks(date, updates),
    [],
  );
  const combineBatches = useCallback(
    (
      older: { date: string; updates: MarkUpdates },
      newer: { date: string; updates: MarkUpdates },
    ) =>
      older.date === newer.date
        ? {
            date: newer.date,
            updates: { ...older.updates, ...newer.updates },
          }
        : newer,
    [],
  );
  const { enqueue, whenIdle, status } = useSaveQueue(saveBatch, combineBatches);

  const isMandatory = useCallback(
    (date: string) => wars.some((war) => war.date === date && war.mandatory),
    [wars],
  );

  function updateMarks(date: string, updates: MarkUpdates) {
    setMarks((current) => ({
      ...current,
      [date]: { ...current[date], ...updates },
    }));
    enqueue({ date, updates });
  }

  async function confirm(date: string) {
    setIsBusy(true);
    const result =
      (await whenIdle()) && (await confirmKvWar(date).catch(() => null));
    setIsBusy(false);
    if (!result) {
      setMessage("Не удалось подтвердить явку. Обновите страницу");
      return;
    }
    const { marks: confirmed, filled } = result;
    const came = Object.values(confirmed).filter(
      (mark) => summarize(mark).kind === "came",
    ).length;
    setMarks((current) => ({ ...current, [date]: confirmed }));
    setWars((current) =>
      current.map((war) =>
        war.date === date ? { ...war, confirmed: true } : war,
      ),
    );
    setMessage(
      `Явка за ${shortDate(date)} подтверждена · пришли ${came}${filled ? ` · «Не был» без отметки: ${filled}` : ""}`,
    );
  }

  async function addWar() {
    setIsBusy(true);
    const result = await createKvWar(newDate).catch(() => "failed");
    setIsBusy(false);
    if (result === "created") {
      router.push(`/kv?war=${newDate}`);
      router.refresh();
      return;
    }
    setMessage(
      result === "exists" ? "На эту дату КВ уже есть" : "Не удалось создать КВ",
    );
  }

  async function removeWar(date: string) {
    if (!window.confirm(`Удалить КВ ${shortDate(date)} со всеми отметками?`)) {
      return;
    }
    setIsBusy(true);
    const ok = (await whenIdle()) && (await deleteKvWar(date));
    setIsBusy(false);
    if (ok) {
      router.push("/kv");
      router.refresh();
    } else {
      setMessage("Не удалось удалить КВ");
    }
  }

  const visibleWars = useMemo(
    () => (lastFour ? wars.slice(-LAST_WARS) : wars),
    [wars, lastFour],
  );

  const stats = useMemo(
    () =>
      players.map((player, idx) => {
        let total = 0;
        let played = 0;
        let noReason = 0;
        for (const { date } of visibleWars) {
          const mark = marks[date]?.[player.uuid];
          if (!mark || !isMandatory(date)) continue;
          const { kind } = summarize(mark);
          if (kind === "reason" || kind === "no") {
            total += 3;
            if (kind === "no") noReason++;
          } else {
            for (const stage of mark.stages) {
              if (!stage) continue;
              total++;
              if (stage !== "off") played++;
            }
          }
        }
        return {
          player,
          idx,
          total,
          played,
          noReason,
          pct: total ? Math.round((played / total) * 100) : null,
        };
      }),
    [players, visibleWars, marks, isMandatory],
  );

  const rows = useMemo(() => {
    const search = query.trim().toLowerCase();
    const value = (row: (typeof stats)[number]) =>
      sort.key === "name"
        ? row.player.name.toLowerCase()
        : sort.key === "pct"
          ? (row.pct ?? (sort.dir > 0 ? 101 : -1))
          : sort.key === "no"
            ? row.noReason
            : row.idx;
    return stats
      .filter(
        ({ player }) => !search || player.name.toLowerCase().includes(search),
      )
      .sort((a, b) => {
        const x = value(a);
        const y = value(b);
        const order = x < y ? -1 : x > y ? 1 : 0;
        return order ? order * sort.dir : a.idx - b.idx;
      });
  }, [stats, query, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((current) => ({
      key,
      dir:
        current.key === key
          ? current.dir === 1
            ? -1
            : 1
          : key === "no"
            ? -1
            : 1,
    }));
  const arrow = (key: SortKey) =>
    sort.key === key ? (sort.dir > 0 ? "↑" : "↓") : "";

  const saveState = status !== "idle" && (
    <div
      role="status"
      className={`fixed left-1/2 z-70 -translate-x-1/2 rounded-lg px-4 py-2.75 text-[13.5px] text-on-ink shadow-[0_10px_30px_rgba(23,25,30,0.25)] ${isMobile ? "bottom-21" : "bottom-6"} ${status === "failed" ? "bg-tone-red-52" : "bg-ink"}`}
    >
      {status === "failed"
        ? "Не удалось сохранить. Обновите страницу"
        : "Сохранение…"}
    </div>
  );
  const notice = message && (
    <div className="rounded-md border border-solid border-line bg-surface px-3.5 py-2.5 text-[13.5px]">
      {message}
    </div>
  );

  if (openWar) {
    return (
      <>
        {notice}
        <KvWarDetail
          date={openWar}
          wars={wars}
          marks={marks[openWar] ?? {}}
          players={players}
          planOrder={planOrder}
          me={me}
          canEdit={canEdit}
          isMandatory={isMandatory(openWar)}
          isConfirmed={
            wars.find(({ date }) => date === openWar)?.confirmed ?? false
          }
          focusUuid={focusUuid}
          isBusy={isBusy}
          isMobile={isMobile}
          onBack={() => {
            setOpenWar(undefined);
            setFocusUuid(undefined);
            setMessage(undefined);
          }}
          onNavigate={(date) => {
            setOpenWar(date);
            setFocusUuid(undefined);
          }}
          onUpdate={(updates) => updateMarks(openWar, updates)}
          onConfirm={() => confirm(openWar)}
          onDelete={() => removeWar(openWar)}
          onMessage={setMessage}
        />
        {saveState}
      </>
    );
  }

  const open = (date: string, uuid?: string) => {
    setOpenWar(date);
    setFocusUuid(uuid);
    setSheetUuid(undefined);
    setMessage(undefined);
  };

  const lastWar = wars[wars.length - 1];
  const pendingWar = lastWar && !lastWar.confirmed ? lastWar : undefined;
  const pendingMarked = pendingWar
    ? players.filter(({ uuid }) => {
        const mark = marks[pendingWar.date]?.[uuid];
        return mark && summarize(mark).kind !== "unknown";
      }).length
    : 0;
  const pendingTotal = pendingWar
    ? players.filter(({ uuid }) => marks[pendingWar.date]?.[uuid]).length
    : 0;

  let allTotal = 0;
  let allPlayed = 0;
  for (const { total, played } of stats) {
    allTotal += total;
    allPlayed += played;
  }
  const mandatoryLabel =
    rules.mandatory.length === 7
      ? "все дни"
      : rules.mandatory
          .map((day) => ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"][day])
          .join(", ");
  const summaryParts = [
    lastFour
      ? "Последние 4 КВ"
      : wars.length
        ? `${wars.length} КВ с ${shortDate(wars[0].date)}`
        : "КВ пока нет",
    `обязательные: ${mandatoryLabel}`,
    ...(allTotal
      ? [`средняя явка ${Math.round((allPlayed / allTotal) * 100)}%`]
      : []),
  ];

  const count = visibleWars.length;
  const cellWidth = count > 8 ? 54 : 62;
  const columns = `minmax(180px,1.4fr) repeat(${count},${cellWidth}px) 84px 100px`;
  const sheetRow = sheetUuid
    ? stats.find(({ player }) => player.uuid === sheetUuid)
    : undefined;
  const segment = (isActive: boolean) =>
    `h-7 cursor-pointer whitespace-nowrap rounded-[5px] border-0 px-3 text-[13px] font-medium ${
      isActive
        ? "bg-surface text-ink shadow-[0_1px_2px_rgba(23,25,30,0.14)]"
        : "bg-transparent text-ink-soft"
    }`;
  const pctColor = (pct: number | null) =>
    pct === null
      ? "var(--dim-179)"
      : pct < LOW_ATTENDANCE
        ? ABSENCE_MARK_STYLES.no.text
        : pct < MID_ATTENDANCE
          ? ABSENCE_MARK_STYLES.reason.text
          : "var(--ink)";
  const headerButton =
    "flex h-12 cursor-pointer items-center gap-1 border-0 bg-transparent text-[11px] font-semibold tracking-[0.1em] whitespace-nowrap text-ink-soft uppercase";

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-solid border-line pb-4">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
            Клановые войны
          </div>
          <h1 className="mt-1.5 text-[clamp(22px,3vw,28px)] leading-[1.15] font-semibold tracking-[-0.01em]">
            Активность на КВ
          </h1>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[13.5px] text-ink-soft">
            <span>{summaryParts.join(" · ")}</span>
            {canEdit && (
              <Link
                href="/admin?tab=kv"
                className="text-[13px] text-muted underline"
              >
                настроить дни
              </Link>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-0.5 rounded-[7px] bg-track p-0.75">
            <button
              type="button"
              aria-pressed={!lastFour}
              onClick={() => setLastFour(false)}
              className={segment(!lastFour)}
            >
              Все КВ
            </button>
            <button
              type="button"
              aria-pressed={lastFour}
              onClick={() => setLastFour(true)}
              className={segment(lastFour)}
            >
              Последние 4
            </button>
          </div>
          {isMobile && (
            <select
              value={sort.key}
              aria-label="Сортировка"
              onChange={(event) => {
                const key = event.target.value as SortKey;
                setSort({ key, dir: key === "no" ? -1 : 1 });
              }}
              className="h-9 rounded-md border border-solid border-edge-213 bg-surface px-2 text-[13.5px]"
            >
              <option value="idx">По порядку</option>
              <option value="pct">Худшая явка</option>
              <option value="no">Больше без причины</option>
              <option value="name">По нику</option>
            </select>
          )}
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск по нику"
            aria-label="Поиск по нику"
            className="h-8.5 w-55 max-w-full rounded-md border border-solid border-edge-213 bg-surface px-2.5 text-[13.5px] outline-none placeholder:text-dim-179 focus:border-ink"
          />
        </div>
      </div>

      {notice}

      {canEdit && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={newDate}
            aria-label="Дата новой КВ"
            onChange={(event) => setNewDate(event.target.value)}
            className="h-8 rounded-md border border-solid border-edge-217 bg-surface px-2 font-jetbrains-mono text-[13px]"
          />
          <button
            type="button"
            disabled={isBusy || !newDate}
            onClick={addWar}
            className={TOOL_BUTTON}
          >
            + Новая КВ
          </button>
          <span className="text-[12.5px] text-muted">
            Отряды и отсутствующие копируются из текущего сбора
          </span>
        </div>
      )}

      {pendingWar && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-solid border-tone-yellow-87 bg-tone-yellow-975 py-2 pr-2 pl-3.5">
          <span className="text-[13.5px] text-ink-strong">
            <span className="font-semibold">
              КВ {weekdayDate(pendingWar.date)} ждёт отметки
            </span>{" "}
            ·{" "}
            {canEdit
              ? `отмечено ${pendingMarked} из ${pendingTotal}`
              : "офицеры отмечают явку"}
          </span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => open(pendingWar.date)}
            className="h-8 cursor-pointer rounded-md border border-solid border-ink bg-ink px-3.5 text-[13px] font-semibold text-on-ink hover:bg-ink-strong"
          >
            {canEdit ? "Отметить явку" : "Открыть"}
          </button>
        </div>
      )}

      {wars.length === 0 ? (
        <div className="rounded-md border border-solid border-line bg-surface p-10 text-center text-sm text-muted">
          КВ пока нет.
          {canEdit && " Добавьте первую кнопкой выше."}
        </div>
      ) : isMobile ? (
        <div className="overflow-hidden rounded-md border border-solid border-line bg-surface">
          {rows.map((row) => {
            const isMe = row.player.name === me;
            return (
              <button
                key={row.player.uuid}
                type="button"
                data-player={row.player.name}
                onClick={() => setSheetUuid(row.player.uuid)}
                className="-mt-px flex w-full cursor-pointer flex-col gap-2 border-0 border-t border-solid border-line-soft px-3.5 py-3 text-left"
                style={{
                  backgroundColor: isMe ? ME_BACKGROUND : "var(--surface)",
                }}
              >
                <span className="flex w-full items-center gap-2">
                  <span
                    className={`min-w-0 flex-1 truncate text-[15px] ${isMe ? "font-bold" : "font-semibold"}`}
                  >
                    {row.player.name}
                  </span>
                  <span
                    className="flex-none font-jetbrains-mono text-sm font-semibold"
                    style={{ color: pctColor(row.pct) }}
                  >
                    {row.pct === null ? "—" : `${row.pct}%`}
                  </span>
                </span>
                <span className="flex w-full scrollbar-none gap-0.75 overflow-x-auto">
                  {visibleWars.map(({ date }) => (
                    <span key={date} className="flex-none">
                      <MarkCell
                        mark={marks[date]?.[row.player.uuid]}
                        isMandatory={isMandatory(date)}
                      />
                    </span>
                  ))}
                </span>
              </button>
            );
          })}
          {rows.length === 0 && (
            <div className="p-8 text-center text-sm text-muted">
              Никого не нашли
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-solid border-line bg-surface">
          <div style={{ minWidth: 364 + cellWidth * count }}>
            <div
              className="grid border-b border-solid border-line bg-head"
              style={{ gridTemplateColumns: columns }}
            >
              <button
                type="button"
                onClick={() => toggleSort("name")}
                className={`${headerButton} sticky left-0 z-2 bg-head px-4 shadow-[1px_0_0_var(--line-227)]`}
              >
                Ник<span className="text-ink">{arrow("name")}</span>
              </button>
              {visibleWars.map(({ date }) => {
                const mandatory = isMandatory(date);
                return (
                  <button
                    key={date}
                    type="button"
                    data-war={date}
                    title={`КВ ${weekdayDate(date)}${mandatory ? "" : " · по желанию"}`}
                    onClick={() => open(date)}
                    className="flex h-12 cursor-pointer flex-col items-center justify-center gap-0.5 border-0 border-l border-solid border-line-227 p-0 hover:bg-fill-230"
                    style={{
                      backgroundColor: mandatory
                        ? "var(--head)"
                        : "var(--alt-248)",
                    }}
                  >
                    <span
                      className="text-[10.5px] font-semibold tracking-[0.1em] uppercase"
                      style={{
                        color: mandatory ? "var(--muted)" : "var(--dim-179)",
                      }}
                    >
                      {
                        ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"][
                          weekdayOf(date)
                        ]
                      }
                    </span>
                    <span
                      className="font-jetbrains-mono text-[12px] font-semibold"
                      style={{
                        color: mandatory ? "var(--ink)" : "var(--dim-163)",
                      }}
                    >
                      {shortDate(date)}
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                title="Доля этапов обязательных КВ, на которых игрок был"
                onClick={() => toggleSort("pct")}
                className={`${headerButton} justify-end border-l border-solid border-line-227 px-3.5`}
              >
                Явка<span className="text-ink">{arrow("pct")}</span>
              </button>
              <button
                type="button"
                title="Не пришёл на обязательную КВ без причины"
                onClick={() => toggleSort("no")}
                className={`${headerButton} justify-end px-4`}
              >
                Без прич.
                <span className="text-ink">{arrow("no")}</span>
              </button>
            </div>

            {rows.map((row) => {
              const isMe = row.player.name === me;
              const isBad = row.noReason >= BAD_NO_REASON_COUNT;
              return (
                <div
                  key={row.player.uuid}
                  data-player={row.player.name}
                  className="grid min-h-10 items-stretch border-t border-solid border-line-soft text-sm"
                  style={{
                    gridTemplateColumns: columns,
                    backgroundColor: isMe ? ME_BACKGROUND : "var(--surface)",
                  }}
                >
                  <div className="sticky left-0 z-1 flex min-w-0 items-center bg-inherit px-4 shadow-[1px_0_0_var(--line-soft)]">
                    <Link
                      href={playerPath(row.player.name)}
                      className={`min-w-0 truncate text-ink no-underline ${isMe ? "font-bold" : "font-semibold"}`}
                    >
                      {row.player.name}
                    </Link>
                  </div>
                  {visibleWars.map(({ date }) => {
                    const mark = marks[date]?.[row.player.uuid];
                    const mandatory = isMandatory(date);
                    return (
                      <div
                        key={date}
                        className="grid place-items-center border-l border-solid border-line-240"
                        style={{
                          backgroundColor: mandatory
                            ? "transparent"
                            : "var(--alt-248)",
                        }}
                      >
                        <button
                          type="button"
                          disabled={!mark}
                          title={`${row.player.name} · ${weekdayDate(date)} · ${describe(mark, mandatory)}`}
                          onClick={() => open(date, row.player.uuid)}
                          className="cursor-pointer border-0 bg-transparent p-0 disabled:cursor-default"
                        >
                          <MarkCell mark={mark} isMandatory={mandatory} />
                        </button>
                      </div>
                    );
                  })}
                  <div
                    className="flex items-center justify-end border-l border-solid border-line-240 px-3.5 font-jetbrains-mono text-[13px] font-semibold"
                    style={{ color: pctColor(row.pct) }}
                  >
                    {row.pct === null ? "—" : `${row.pct}%`}
                  </div>
                  <div className="flex items-center justify-end px-4">
                    <span
                      className={`min-w-7 rounded-sm px-1.75 py-0.5 text-center font-jetbrains-mono text-[12.5px] ${isBad ? "font-semibold" : ""}`}
                      style={{
                        backgroundColor: isBad
                          ? ABSENCE_MARK_STYLES.no.soft
                          : "transparent",
                        color: isBad
                          ? ABSENCE_MARK_STYLES.no.text
                          : row.noReason
                            ? "var(--ink-soft)"
                            : "var(--dim-179)",
                      }}
                    >
                      {row.noReason}
                    </span>
                  </div>
                </div>
              );
            })}
            {rows.length === 0 && (
              <div className="border-t border-solid border-line-soft p-10 text-center text-sm text-muted">
                Никого не нашли
              </div>
            )}

            <div
              className="grid min-h-9 items-stretch border-t border-solid border-line-227 bg-alt-250 text-[12.5px]"
              style={{ gridTemplateColumns: columns }}
            >
              <div className="sticky left-0 z-1 flex items-center bg-alt-250 px-4 text-ink-soft shadow-[1px_0_0_var(--line-soft)]">
                Пришли
              </div>
              {visibleWars.map(({ date }) => {
                const came = players.filter(({ uuid }) => {
                  const mark = marks[date]?.[uuid];
                  return mark && summarize(mark).kind === "came";
                }).length;
                return (
                  <div
                    key={date}
                    className="grid place-items-center border-l border-solid border-line-soft font-jetbrains-mono text-[12.5px] font-semibold"
                    style={{
                      color: came ? "var(--ink)" : "var(--dim-197)",
                    }}
                  >
                    {came || "—"}
                  </div>
                );
              })}
              <div className="border-l border-solid border-line-soft" />
              <div />
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-muted">
        <span className="text-ink-soft">Ячейка — 3 этапа:</span>
        {(["in", "left", "off"] as const).map((stage) => (
          <span key={stage} className="inline-flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-xs"
              style={{ backgroundColor: STAGE_STYLES[stage].solid }}
            />
            {STAGE_STYLES[stage].label.toLowerCase()}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span
            className="grid h-3.5 w-4 place-items-center rounded-[3px] font-jetbrains-mono text-[9.5px] font-semibold"
            style={{
              backgroundColor: ABSENCE_MARK_STYLES.reason.soft,
              color: ABSENCE_MARK_STYLES.reason.text,
            }}
          >
            П
          </span>
          не пришёл по причине
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="grid h-3.5 w-4 place-items-center rounded-[3px] font-jetbrains-mono text-[9.5px] font-semibold"
            style={{
              backgroundColor: ABSENCE_MARK_STYLES.no.soft,
              color: ABSENCE_MARK_STYLES.no.text,
            }}
          >
            ✕
          </span>
          без причины
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3.5 w-4 rounded-[3px] bg-alt-248 shadow-[inset_0_0_0_1px_var(--line-227)]" />
          КВ по желанию
        </span>
        <span className="flex-1" />
        <span>
          {isMobile
            ? "Нажмите на игрока — все его КВ"
            : canEdit
              ? "Клик по дате — отметить явку"
              : "Клик по дате — подробнее"}
        </span>
      </div>

      {sheetRow && isMobile && (
        <>
          <div
            onClick={() => setSheetUuid(undefined)}
            className="fixed inset-0 z-50 bg-[rgba(23,25,30,0.32)]"
          />
          <div
            role="dialog"
            aria-label={sheetRow.player.name}
            className="fixed inset-x-0 bottom-0 z-51 max-h-[84vh] overflow-auto rounded-t-[14px] bg-surface px-3.5 pt-2 pb-[calc(14px+env(safe-area-inset-bottom))] shadow-[0_-10px_30px_rgba(23,25,30,0.15)]"
          >
            <div className="mx-auto mt-1 mb-3 h-1 w-9 rounded-xs bg-edge-213" />
            <div className="flex items-baseline justify-between gap-2.5">
              <span className="min-w-0 truncate text-[19px] font-semibold">
                {sheetRow.player.name}
              </span>
              <span className="flex-none font-jetbrains-mono text-sm font-semibold text-ink-soft">
                {sheetRow.pct === null ? "—" : `${sheetRow.pct}%`}
              </span>
            </div>
            <div className="mt-0.5 text-[12.5px] text-muted">
              без причины {sheetRow.noReason}{" "}
              {pluralRu(sheetRow.noReason, ["раз", "раза", "раз"])}
            </div>
            <div className="mt-2.5">
              {[...visibleWars].reverse().map(({ date, confirmed }) => {
                const mark = marks[date]?.[sheetRow.player.uuid];
                const mandatory = isMandatory(date);
                return (
                  <button
                    key={date}
                    type="button"
                    disabled={!mark}
                    onClick={() => open(date, sheetRow.player.uuid)}
                    className="flex min-h-13.5 w-full items-center gap-3 border-0 border-t border-solid border-line-soft bg-transparent py-1.5 text-left"
                  >
                    <span className="flex-none">
                      <MarkCell mark={mark} isMandatory={mandatory} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-jetbrains-mono text-[12px] text-muted">
                        {weekdayDate(date)}
                        {mandatory ? "" : " · по желанию"}
                        {confirmed ? "" : " · не подтверждена"}
                      </span>
                      <span className="mt-0.5 block text-sm leading-[1.35]">
                        {describe(mark, mandatory)}
                      </span>
                    </span>
                    <span className="w-3.5 flex-none text-base text-dim-163">
                      {mark ? "›" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-1.5 text-[12.5px] text-muted">
              {canEdit
                ? "Нажмите на КВ, чтобы отметить этапы."
                : "Нажмите на КВ, чтобы посмотреть этапы."}
            </div>
            <div className="mt-2.5 flex gap-2">
              <Link
                href={playerPath(sheetRow.player.name)}
                className="grid h-12 flex-1 place-items-center rounded-lg border border-solid border-edge-217 text-[15px] font-medium text-ink no-underline"
              >
                Профиль
              </Link>
              <button
                type="button"
                onClick={() => setSheetUuid(undefined)}
                className="h-12 flex-1 rounded-lg border border-solid border-ink bg-ink text-[15px] font-semibold text-on-ink"
              >
                Закрыть
              </button>
            </div>
          </div>
        </>
      )}

      {saveState}
    </>
  );
}
