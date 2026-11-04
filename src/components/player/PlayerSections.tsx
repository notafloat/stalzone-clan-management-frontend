import { Panel, PanelAsideText } from "@/components/clan/Panel";
import { LocalTime } from "@/components/LocalTime";
import { shiftDay } from "@/lib/members/clan-stats";
import { dayKey } from "@/lib/dates";
import type { EventType } from "@/lib/db/schema";
import { pluralRu } from "@/lib/plural";
import { displayValue, EVENT_STYLES } from "@/lib/tracker/events";

const GRID_DAYS = 18;
const LABEL_EVERY_DAYS = 7;

const DAY_STYLES = {
  on: { className: "bg-[oklch(0.62_0.13_150)]", title: "заходил" },
  off: { className: "bg-fill-228", title: "не заходил" },
  before: {
    className: "border border-dashed border-dim-197",
    title: "ещё не в клане",
  },
  unknown: {
    className: "border border-dotted border-dim-197",
    title: "ещё не записывалось",
  },
};

export function ActivityGrid({
  activeDays,
  joinedAt,
  trackingStart,
  now,
}: {
  activeDays: Set<string>;
  joinedAt: Date;
  trackingStart: Date | null;
  now: Date;
}) {
  const today = dayKey(now);
  const joinDay = dayKey(joinedAt);
  const startDay = trackingStart ? dayKey(trackingStart) : today;

  const days = Array.from({ length: GRID_DAYS }, (_, i) => {
    const day = shiftDay(today, i + 1 - GRID_DAYS);
    const status: keyof typeof DAY_STYLES = activeDays.has(day)
      ? "on"
      : day < joinDay
        ? "before"
        : day < startDay
          ? "unknown"
          : "off";
    return { day, status };
  });
  const on = days.filter(({ status }) => status === "on").length;
  const possible = on + days.filter(({ status }) => status === "off").length;

  return (
    <Panel
      title="Активность"
      aside={
        <PanelAsideText>
          заходил {on} из {possible}{" "}
          {pluralRu(possible, ["дня", "дней", "дней"])}
        </PanelAsideText>
      }
      className=""
    >
      <div className="p-4">
        <div className="grid grid-cols-[repeat(18,minmax(0,1fr))] gap-1">
          {days.map(({ day, status }, i) => {
            const [, month, date] = day.split("-");
            const showLabel =
              i === 0 ||
              i === days.length - 1 ||
              Number(date) % LABEL_EVERY_DAYS === 0;
            return (
              <div
                key={day}
                title={`${date}.${month} · ${DAY_STYLES[status].title}`}
                className="flex flex-col items-center gap-1.25"
              >
                <div
                  data-day-status={status}
                  className={`aspect-square w-full rounded-[3px] ${DAY_STYLES[status].className}`}
                />
                <span className="h-3 font-jetbrains-mono text-[10px] text-muted">
                  {showLabel ? Number(date) : ""}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-2.5 flex flex-wrap gap-3.5 text-[12.5px] text-muted">
          {Object.values(DAY_STYLES).map(({ className, title }) => (
            <span key={title} className="inline-flex items-center gap-1.5">
              <span className={`size-2.5 rounded-xs ${className}`} />
              {title}
            </span>
          ))}
        </div>
      </div>
    </Panel>
  );
}

export type HistoryEvent = {
  id: number;
  type: EventType;
  fromValue: string | null;
  toValue: string | null;
  occurredAt: Date;
};

export function RankHistory({
  events,
  title = "История званий",
}: {
  events: HistoryEvent[];
  title?: string;
}) {
  return (
    <Panel
      title={title}
      aside={<PanelAsideText>{events.length}</PanelAsideText>}
      className=""
    >
      <div className="px-4 pt-1.5 pb-2.5">
        {events.map((event) => {
          const style = EVENT_STYLES[event.type];
          return (
            <div
              key={event.id}
              className="grid grid-cols-[14px_minmax(0,1fr)] gap-3 py-2.5"
            >
              <span
                className="mt-1.25 size-2.25 rounded-full"
                style={{ backgroundColor: style.color }}
              />
              <div>
                <div className="text-sm">
                  <span
                    className="font-semibold"
                    style={{ color: style.color }}
                  >
                    {style.label}
                  </span>{" "}
                  <span className="text-ink-soft">
                    {[event.fromValue, event.toValue]
                      .filter((value) => value !== null)
                      .map((value) => displayValue(event.type, value).text)
                      .join(" → ")}
                  </span>
                </div>
                <div className="mt-0.5 font-jetbrains-mono text-[11.5px] text-muted">
                  <LocalTime value={event.occurredAt} format="dateTime" />
                </div>
              </div>
            </div>
          );
        })}
        {events.length === 0 && (
          <div className="py-2.5 text-sm text-muted">Записей пока нет</div>
        )}
      </div>
    </Panel>
  );
}
