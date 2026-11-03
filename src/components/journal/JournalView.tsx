"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { saveEventNote } from "@/app/journal/actions";
import { LocalTime, useTimeZone } from "@/components/LocalTime";
import { dayKey, formatDayHeading } from "@/lib/dates";
import type { EventType } from "@/lib/db/schema";
import { playerPath, RANK_BY_ID } from "@/lib/members/members";
import { pluralRu } from "@/lib/plural";
import type { ClanRank } from "@/lib/stalzone/types";
import type { JournalEvent } from "@/lib/tracker/journal";

const EVENT_STYLES: Record<EventType, { label: string; color: string }> = {
  joined: { label: "Вступил", color: "oklch(0.52 0.13 150)" },
  left: { label: "Покинул", color: "oklch(0.55 0.19 25)" },
  promoted: { label: "Повышен", color: "oklch(0.56 0.14 255)" },
  demoted: { label: "Понижен", color: "oklch(0.58 0.13 60)" },
  renamed: { label: "Переименован", color: "rgb(79,85,96)" },
};
const EVENT_TYPES = Object.keys(EVENT_STYLES) as EventType[];

const EVENT_FORMS: [string, string, string] = ["событие", "события", "событий"];
const formatEventCount = (count: number) =>
  `${count} ${pluralRu(count, EVENT_FORMS)}`;

const EMPTY_VALUE_COLOR = "rgb(197,201,208)";
const COLUMNS_WITH_NOTES =
  "grid-cols-[88px_128px_minmax(170px,1.2fr)_136px_136px_minmax(180px,1.6fr)]";
const COLUMNS_WITHOUT_NOTES =
  "grid-cols-[88px_128px_minmax(170px,1.2fr)_136px_136px]";
const HEADER_CELL =
  "flex h-10 items-center px-3 text-[11px] font-semibold tracking-[0.1em] text-[rgb(79,85,96)] uppercase first:pl-4";

type DayGroup = { key: string; heading: string; events: JournalEvent[] };

function groupByDay(events: JournalEvent[], timeZone: string): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const event of events) {
    const key = dayKey(event.occurredAt, timeZone);
    const last = groups[groups.length - 1];
    if (last?.key === key) {
      last.events.push(event);
    } else {
      groups.push({
        key,
        heading: formatDayHeading(event.occurredAt, timeZone),
        events: [event],
      });
    }
  }
  return groups;
}

/** A rank, except for renames, where the value is a name. */
function displayValue(type: EventType, value: string | null) {
  if (!value) return { text: "—", color: EMPTY_VALUE_COLOR };
  const rank = type === "renamed" ? undefined : RANK_BY_ID[value as ClanRank];
  return { text: rank?.label ?? value, color: rank?.color };
}

export function JournalView({
  events,
  canEditNotes,
}: {
  events: JournalEvent[];
  canEditNotes: boolean;
}) {
  const timeZone = useTimeZone();
  const [type, setType] = useState<EventType | "all">("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const byType = new Map<EventType, number>();
    for (const event of events) {
      byType.set(event.type, (byType.get(event.type) ?? 0) + 1);
    }
    return byType;
  }, [events]);

  const groups = useMemo(() => {
    const search = query.trim().toLowerCase();
    const visible = events.filter(
      (event) =>
        (type === "all" || event.type === type) &&
        (!search ||
          event.name.toLowerCase().includes(search) ||
          event.currentName.toLowerCase().includes(search)),
    );
    return groupByDay(visible, timeZone);
  }, [events, type, query, timeZone]);

  const oldest = events[events.length - 1]?.occurredAt;
  const columns = canEditNotes ? COLUMNS_WITH_NOTES : COLUMNS_WITHOUT_NOTES;
  const emptyText =
    events.length === 0
      ? "Событий пока нет. Они появятся, когда начнётся запись."
      : "Событий не найдено";

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2.5 border-b border-solid border-[rgb(223,226,231)] pb-4">
        <div>
          <div className="text-[11px] font-semibold tracking-[0.14em] text-[rgb(134,140,150)] uppercase">
            Журнал
          </div>
          <h1 className="mt-1.5 text-[clamp(22px,3vw,28px)] leading-[1.15] font-semibold tracking-[-0.01em]">
            События клана
          </h1>
        </div>
        <div className="font-jetbrains-mono text-[12.5px] text-[rgb(134,140,150)]">
          {formatEventCount(events.length)}
          {oldest && (
            <>
              {" "}
              с <LocalTime value={oldest} format="date" />
            </>
          )}{" "}
          · проверка каждые 15 мин
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
        <div className="flex max-w-full scrollbar-none gap-1.5 overflow-x-auto p-px">
          <TypeChip
            label="Все"
            count={events.length}
            selected={type === "all"}
            onClick={() => setType("all")}
          />
          {EVENT_TYPES.map((id) => (
            <TypeChip
              key={id}
              label={EVENT_STYLES[id].label}
              dot={EVENT_STYLES[id].color}
              count={counts.get(id) ?? 0}
              selected={type === id}
              onClick={() => setType(id)}
            />
          ))}
        </div>
        <div className="flex-1" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Поиск по нику"
          aria-label="Поиск по нику"
          className="h-8.5 max-w-70 flex-[1_1_180px] rounded-md border border-solid border-[rgb(213,216,222)] bg-white px-2.5 text-[13.5px] outline-none placeholder:text-[rgb(179,184,192)] focus:border-[rgb(23,25,30)]"
        />
      </div>

      <div className="hidden overflow-x-auto rounded-md border border-solid border-[rgb(223,226,231)] bg-white min-[760px]:block">
        <div className="min-w-210">
          <div
            className={`grid border-b border-solid border-[rgb(223,226,231)] bg-[rgb(243,244,246)] ${columns}`}
          >
            <div className={HEADER_CELL}>Время</div>
            <div className={HEADER_CELL}>Событие</div>
            <div className={HEADER_CELL}>Ник</div>
            <div className={HEADER_CELL}>Было</div>
            <div className={HEADER_CELL}>Стало</div>
            {canEditNotes && <div className={HEADER_CELL}>Заметка</div>}
          </div>
          {groups.map((group) => (
            <div key={group.key}>
              <DayHeading heading={group.heading} count={group.events.length} />
              {group.events.map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  columns={columns}
                  canEditNotes={canEditNotes}
                />
              ))}
            </div>
          ))}
          {groups.length === 0 && (
            <div className="p-10 text-center text-sm text-[rgb(134,140,150)]">
              {emptyText}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-solid border-[rgb(223,226,231)] bg-white min-[760px]:hidden">
        {groups.map((group) => (
          <div key={group.key}>
            <DayHeading heading={group.heading} count={group.events.length} />
            {group.events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ))}
        {groups.length === 0 && (
          <div className="p-8 text-center text-sm text-[rgb(134,140,150)]">
            {emptyText}
          </div>
        )}
      </div>
    </>
  );
}

function TypeChip({
  label,
  count,
  dot,
  selected,
  onClick,
}: {
  label: string;
  count: number;
  dot?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`inline-flex h-8 flex-none cursor-pointer items-center gap-1.75 rounded-md border border-solid px-2.75 text-[13px] font-medium ${
        selected
          ? "border-[rgb(23,25,30)] bg-[rgb(23,25,30)] text-white"
          : "border-[rgb(217,220,225)] bg-white text-[rgb(23,25,30)]"
      }`}
    >
      {dot && (
        <span
          className="size-2 rounded-full"
          style={{ backgroundColor: dot }}
        />
      )}
      <span>{label}</span>
      <span
        className={`font-jetbrains-mono text-[12px] ${selected ? "text-white/62" : "text-[rgb(134,140,150)]"}`}
      >
        {count}
      </span>
    </button>
  );
}

function DayHeading({ heading, count }: { heading: string; count: number }) {
  return (
    <div className="flex h-9 items-center justify-between gap-3 border-t border-b border-solid border-t-[rgb(227,229,233)] border-b-[rgb(238,240,243)] bg-[rgb(250,251,252)] px-4">
      <span className="text-[13px] font-semibold">{heading}</span>
      <span className="font-jetbrains-mono text-[11.5px] text-[rgb(134,140,150)]">
        {formatEventCount(count)}
      </span>
    </div>
  );
}

function PlayerName({ event }: { event: JournalEvent }) {
  if (!event.inClan) {
    return (
      <>
        <span className="font-semibold text-[rgb(79,85,96)]">{event.name}</span>{" "}
        <span className="text-[12px] text-[rgb(163,169,178)]">не в клане</span>
      </>
    );
  }
  return (
    <Link
      href={playerPath(event.currentName)}
      className="font-semibold text-[rgb(23,25,30)] no-underline hover:underline"
    >
      {event.name}
    </Link>
  );
}

function EventRow({
  event,
  columns,
  canEditNotes,
}: {
  event: JournalEvent;
  columns: string;
  canEditNotes: boolean;
}) {
  const style = EVENT_STYLES[event.type];
  const from = displayValue(event.type, event.fromValue);
  const to = displayValue(event.type, event.toValue);

  return (
    <div
      className={`grid min-h-10 items-center border-t border-solid border-[rgb(240,241,244)] text-sm ${columns}`}
    >
      <div className="font-jetbrains-mono px-4 text-[12.5px] text-[rgb(134,140,150)]">
        <LocalTime value={event.occurredAt} format="time" />
      </div>
      <div className="px-3 font-semibold" style={{ color: style.color }}>
        {style.label}
      </div>
      <div className="min-w-0 truncate px-3">
        <PlayerName event={event} />
      </div>
      <div className="truncate px-3" style={{ color: from.color }}>
        {from.text}
      </div>
      <div className="truncate px-3" style={{ color: to.color }}>
        {to.text}
      </div>
      {canEditNotes && (
        <div className="min-w-0 px-2">
          <NoteInput event={event} />
        </div>
      )}
    </div>
  );
}

function NoteInput({ event }: { event: JournalEvent }) {
  const [value, setValue] = useState(event.note ?? "");
  const [saved, setSaved] = useState(event.note ?? "");
  const [hasFailed, setHasFailed] = useState(false);
  const [isSaving, startSaving] = useTransition();

  function save() {
    if (value === saved) return;
    startSaving(async () => {
      const ok = await saveEventNote(event.id, value).catch(() => false);
      setHasFailed(!ok);
      if (ok) setSaved(value);
    });
  }

  return (
    <input
      value={value}
      maxLength={500}
      placeholder="—"
      aria-label={`Заметка к событию: ${event.name}`}
      title={
        hasFailed
          ? "Не удалось сохранить"
          : event.noteUpdatedBy && `Изменил: ${event.noteUpdatedBy}`
      }
      aria-invalid={hasFailed}
      disabled={isSaving}
      onChange={(change) => setValue(change.target.value)}
      onBlur={save}
      onKeyDown={(key) => {
        if (key.key === "Enter") key.currentTarget.blur();
      }}
      className={`h-7.5 w-full rounded-sm border border-solid bg-transparent px-2 text-[13px] text-[rgb(79,85,96)] outline-none hover:border-[rgb(227,229,233)] hover:bg-white focus:border-[rgb(23,25,30)] focus:bg-white disabled:opacity-60 ${
        hasFailed ? "border-[oklch(0.55_0.19_25)]" : "border-transparent"
      }`}
    />
  );
}

function EventCard({ event }: { event: JournalEvent }) {
  const style = EVENT_STYLES[event.type];
  const from = displayValue(event.type, event.fromValue);
  const to = displayValue(event.type, event.toValue);

  return (
    <div className="grid grid-cols-[44px_minmax(0,1fr)] gap-2.5 border-t border-solid border-[rgb(238,240,243)] px-3.5 py-2.75">
      <span className="font-jetbrains-mono pt-0.5 text-[12px] text-[rgb(134,140,150)]">
        <LocalTime value={event.occurredAt} format="time" />
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-2 text-[15px] wrap-anywhere">
          <span className="font-semibold" style={{ color: style.color }}>
            {style.label}
          </span>
          <span>
            <PlayerName event={event} />
          </span>
        </div>
        <div className="mt-0.75 text-[13px] text-[rgb(134,140,150)]">
          {from.text} → {to.text}
        </div>
        {event.note && (
          <div className="mt-1 text-[13px] text-[rgb(79,85,96)]">
            {event.note}
          </div>
        )}
      </div>
    </div>
  );
}
