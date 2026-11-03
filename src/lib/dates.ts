import { DAY_FORMS, pluralRu } from "./plural";

/** STALCRAFT server time. Used until the browser's zone is known, and for grouping by day. */
export const SERVER_TIME_ZONE = "Europe/Moscow";

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_DAY = 24 * 60 * MS_PER_MINUTE;
const MISSING = "—";

const formatters = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string) {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("ru-RU", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

type DateInput = Date | string | null | undefined;

function toDate(input: DateInput) {
  if (!input) return null;
  const date = input instanceof Date ? input : new Date(input);
  return Number.isNaN(date.getTime()) ? null : date;
}

// formatToParts with our own separators gives identical output on Node and in every browser.
function dateParts(date: Date, timeZone: string) {
  const parts: Record<string, string> = {};
  for (const { type, value } of getFormatter(timeZone).formatToParts(date)) {
    parts[type] = value;
  }
  return parts;
}

const DATE_FORMATS = {
  /** 03.11.2026 */
  date: ({ day, month, year }: Record<string, string>) =>
    `${day}.${month}.${year}`,
  /** 03.11.2026 01:41 */
  dateTime: ({ day, month, year, hour, minute }: Record<string, string>) =>
    `${day}.${month}.${year} ${hour}:${minute}`,
  /** 03.11 01:41 */
  dayMonthTime: ({ day, month, hour, minute }: Record<string, string>) =>
    `${day}.${month} ${hour}:${minute}`,
  /** 01:41 */
  time: ({ hour, minute }: Record<string, string>) => `${hour}:${minute}`,
};

export type DateFormat = keyof typeof DATE_FORMATS;

export function formatInZone(
  input: DateInput,
  format: DateFormat,
  timeZone: string,
): string {
  const date = toDate(input);
  return date ? DATE_FORMATS[format](dateParts(date, timeZone)) : MISSING;
}

/** "ещё 12 дней", in the largest unit that fits. */
export function formatTimeLeft(ms: number): string {
  const minutes = Math.floor(ms / MS_PER_MINUTE);
  if (minutes < 1) return "меньше минуты";
  const hours = Math.floor(minutes / 60);
  if (hours < 1) {
    return `ещё ${minutes} ${pluralRu(minutes, ["минута", "минуты", "минут"])}`;
  }
  const days = Math.floor(hours / 24);
  if (days < 1)
    return `ещё ${hours} ${pluralRu(hours, ["час", "часа", "часов"])}`;
  return `ещё ${days} ${pluralRu(days, DAY_FORMS)}`;
}

/** 2026-11-03. Sorts chronologically as text. */
export function dayKey(
  date: Date,
  timeZone: string = SERVER_TIME_ZONE,
): string {
  const { day, month, year } = dateParts(date, timeZone);
  return `${year}-${month}-${day}`;
}

/** 31 октября, суббота */
export function formatDayHeading(date: Date, timeZone: string): string {
  const parts: Record<string, string> = {};
  const formatter = new Intl.DateTimeFormat("ru-RU", {
    timeZone,
    day: "numeric",
    month: "long",
    weekday: "long",
  });
  for (const { type, value } of formatter.formatToParts(date)) {
    parts[type] = value;
  }
  return `${parts.day} ${parts.month}, ${parts.weekday}`;
}

export function daysBetween(
  input: DateInput,
  now: number = Date.now(),
): number | null {
  const date = toDate(input);
  if (!date) return null;
  return Math.max(0, Math.floor((now - date.getTime()) / MS_PER_DAY));
}
