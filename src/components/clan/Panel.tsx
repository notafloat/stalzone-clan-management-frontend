import type { ReactNode } from "react";

export function Panel({
  title,
  aside,
  className,
  children,
}: {
  title: string;
  aside?: ReactNode;
  className: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`min-w-0 overflow-hidden rounded-md border border-solid border-line bg-surface ${className}`}
    >
      <div className="flex h-11 items-center justify-between gap-3 border-b border-solid border-line bg-head px-4">
        <span className="text-[11.5px] font-semibold tracking-[0.12em] text-ink-strong uppercase">
          {title}
        </span>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function PanelAsideText({ children }: { children: ReactNode }) {
  return (
    <span className="font-jetbrains-mono text-[12px] text-muted">
      {children}
    </span>
  );
}
