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
    <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-1.5 px-4 pt-3.5 pb-4 shadow-[inset_-1px_0_0_var(--line),inset_0_-1px_0_var(--line)]">
      <div className="text-[12.5px] text-muted">{label}</div>
      <div
        className={`text-[clamp(18px,1.7vw,22px)] leading-[1.2] font-semibold tracking-[-0.01em] wrap-anywhere ${valueClassName}`}
      >
        {value}
      </div>
      <div className="min-h-3.75 font-jetbrains-mono text-[11.5px] text-muted">
        {hint}
      </div>
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap overflow-hidden rounded-md border-t border-l border-solid border-line bg-surface">
      {children}
    </div>
  );
}
