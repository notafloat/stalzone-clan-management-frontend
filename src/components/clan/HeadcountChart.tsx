import type { HeadcountDay } from "@/lib/members/clan-stats";
import { Panel, PanelAsideText } from "./Panel";

const COLUMN_GAP = "gap-[clamp(3px,0.6vw,8px)]";
const HEADROOM = 1.1;

function dayTitle({ label, count, joined }: HeadcountDay) {
  const base = `${label} · ${count} в клане`;
  return joined > 0 ? `${base}, вступили ${joined}` : base;
}

export function HeadcountChart({ days }: { days: HeadcountDay[] }) {
  const peak = Math.max(1, ...days.map(({ count }) => count)) * HEADROOM;
  const lastIndex = days.length - 1;

  return (
    <Panel
      title="Численность по дням"
      aside={
        <PanelAsideText>
          {days[0]?.label} — {days[lastIndex]?.label}
        </PanelAsideText>
      }
      className="flex-[999_1_560px]"
    >
      <div className="px-4 pt-4.5 pb-3.5">
        <div className="overflow-x-auto">
          <div className="min-w-120">
            <div className={`flex h-50 items-end ${COLUMN_GAP}`}>
              {days.map((day, index) => {
                const isToday = index === lastIndex;
                return (
                  <div
                    key={day.label}
                    title={dayTitle(day)}
                    className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.25"
                  >
                    <span
                      className={`font-jetbrains-mono text-[10.5px] ${isToday ? "text-[rgb(23,25,30)]" : "text-[rgb(134,140,150)]"}`}
                    >
                      {day.count}
                    </span>
                    <div
                      className={`w-full rounded-t-xs ${isToday ? "bg-[oklch(0.86_0.15_122)]" : "bg-[rgb(207,211,218)]"}`}
                      style={{ height: `${(day.count / peak) * 100}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div
              className={`flex border-t border-solid border-[rgb(207,211,218)] pt-1.5 ${COLUMN_GAP}`}
            >
              {days.map((day) => (
                <div
                  key={day.label}
                  className="font-jetbrains-mono flex min-w-0 flex-1 flex-col items-center gap-0.5 text-[10.5px] leading-[1.25]"
                >
                  <span
                    className={
                      day.isWeekend
                        ? "font-bold text-[rgb(23,25,30)]"
                        : "text-[rgb(154,160,169)]"
                    }
                  >
                    {day.dayOfMonth}
                  </span>
                  <span className="text-[oklch(0.52_0.13_150)]">
                    {day.joined > 0 && `+${day.joined}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-[12.5px] text-[rgb(134,140,150)]">
          <span>
            <span className="font-jetbrains-mono text-[oklch(0.52_0.13_150)]">
              +n
            </span>{" "}
            вступили
          </span>
          <span>жирным — выходные</span>
          <span>по текущему составу, без ушедших</span>
        </div>
      </div>
    </Panel>
  );
}
