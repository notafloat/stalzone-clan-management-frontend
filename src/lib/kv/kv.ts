export type StageMark = "in" | "left" | "off" | null;
export type AbsenceKind = "" | "reason" | "no";

/** One player's attendance at one clan war, which has three stages. */
export type KvMark = {
  /** The squad they were in when the war was created. */
  plan: string;
  stages: StageMark[];
  absence: AbsenceKind;
  reason: string;
  /** Why they left partway through. */
  why: string;
};

export type KvWar = { date: string; confirmed: boolean; mandatory: boolean };

export type SummaryKind = "came" | "reason" | "no" | "unknown";

const MAX_TEXT = 200;
const STAGE_COUNT = 3;
const STAGE_MARKS: StageMark[] = ["in", "left", "off", null];
const NEXT_MARK: Record<string, StageMark> = {
  null: "in",
  in: "left",
  left: "off",
  off: null,
};

export const STAGE_STYLES: Record<
  "in" | "left" | "off",
  { label: string; solid: string; soft: string; text: string }
> = {
  in: {
    label: "Был",
    solid: "oklch(0.66 0.14 150)",
    soft: "var(--tone-green-95)",
    text: "var(--tone-green-42)",
  },
  left: {
    label: "Вышел",
    solid: "oklch(0.74 0.15 55)",
    soft: "var(--tone-amber-95)",
    text: "var(--tone-orange-5)",
  },
  off: {
    label: "Не был",
    solid: "var(--edge-213)",
    soft: "var(--wash)",
    text: "var(--ink-soft)",
  },
};

export const ABSENCE_MARK_STYLES = {
  reason: { soft: "var(--tone-yellow-96)", text: "var(--tone-amber-5)" },
  no: { soft: "var(--tone-red-955)", text: "var(--tone-red-52)" },
};

export const WEEKDAYS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

/** 0 is Monday. Works on the date itself, so the viewer's time zone can't shift it. */
export function weekdayOf(date: string) {
  const sundayFirst = new Date(`${date}T00:00:00Z`).getUTCDay();
  return (sundayFirst + 6) % 7;
}

/** 15.10 */
export const shortDate = (date: string) => {
  const [, month, day] = date.split("-");
  return `${day}.${month}`;
};

/** Пт 15.10 */
export const weekdayDate = (date: string) =>
  `${WEEKDAYS_SHORT[weekdayOf(date)]} ${shortDate(date)}`;

export function summarize(mark: KvMark) {
  const marked = mark.stages.filter(Boolean).length;
  const played = mark.stages.filter((s) => s === "in" || s === "left").length;
  const left = mark.stages.includes("left");
  const kind: SummaryKind = mark.absence
    ? mark.absence
    : played > 0
      ? "came"
      : "unknown";
  return { kind, marked, played, left };
}

const absenceKind = (mark: KvMark): AbsenceKind =>
  mark.reason.trim() ? "reason" : "no";

export function cycleStage(mark: KvMark, stage: number): KvMark {
  const stages = [...mark.stages];
  stages[stage] = NEXT_MARK[String(stages[stage])];
  return stages.every((s) => s === "off")
    ? { ...mark, stages, absence: absenceKind(mark), why: "" }
    : { ...mark, stages };
}

export function toggleAbsent(mark: KvMark): KvMark {
  return mark.absence
    ? { ...mark, absence: "", stages: [null, null, null] }
    : {
        ...mark,
        absence: absenceKind(mark),
        stages: ["off", "off", "off"],
        why: "",
      };
}

export const withReason = (mark: KvMark, reason: string): KvMark => ({
  ...mark,
  reason,
  absence: reason.trim() ? "reason" : "no",
});

export const withWhy = (mark: KvMark, why: string): KvMark => ({
  ...mark,
  why,
});

/** Whoever is still unmarked when a war is confirmed didn't play. */
export function withUnmarkedAsOff(mark: KvMark): KvMark {
  if (mark.absence || mark.stages.every(Boolean)) return mark;
  const stages = mark.stages.map((s) => s ?? "off");
  return stages.every((s) => s === "off")
    ? { ...mark, stages, absence: absenceKind(mark) }
    : { ...mark, stages };
}

const isText = (value: unknown): value is string =>
  typeof value === "string" && value.length <= MAX_TEXT;

/** Checks a mark from the browser. The squad can't be changed after a war is created. */
export function parseMarkUpdate(value: unknown): Omit<KvMark, "plan"> | null {
  const { stages, absence, reason, why } = (value ?? {}) as KvMark;
  if (!Array.isArray(stages) || stages.length !== STAGE_COUNT) return null;
  if (!stages.every((stage) => STAGE_MARKS.includes(stage))) return null;
  if (absence !== "" && absence !== "reason" && absence !== "no") return null;
  if (!isText(reason) || !isText(why)) return null;
  return { stages, absence, reason, why };
}

export const isWarDate = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
