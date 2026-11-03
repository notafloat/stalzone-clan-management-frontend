import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  hint,
  valueClassName = "",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-1.5 px-4 pt-3.5 pb-4 shadow-[inset_-1px_0_0_rgb(223,226,231),inset_0_-1px_0_rgb(223,226,231)]">
      <div className="text-[12.5px] text-[rgb(134,140,150)]">{label}</div>
      <div
        className={`text-[clamp(18px,1.7vw,22px)] leading-[1.2] font-semibold tracking-[-0.01em] wrap-anywhere ${valueClassName}`}
      >
        {value}
      </div>
      <div className="font-jetbrains-mono min-h-3.75 text-[11.5px] text-[rgb(134,140,150)]">
        {hint}
      </div>
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap overflow-hidden rounded-md border-t border-l border-solid border-[rgb(223,226,231)] bg-white">
      {children}
    </div>
  );
}
