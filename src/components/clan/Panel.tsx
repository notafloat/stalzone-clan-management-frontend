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
      className={`min-w-0 overflow-hidden rounded-md border border-solid border-[rgb(223,226,231)] bg-white ${className}`}
    >
      <div className="flex h-11 items-center justify-between gap-3 border-b border-solid border-[rgb(223,226,231)] bg-[rgb(243,244,246)] px-4">
        <span className="text-[11.5px] font-semibold tracking-[0.12em] text-[rgb(44,48,56)] uppercase">
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
    <span className="font-jetbrains-mono text-[12px] text-[rgb(134,140,150)]">
      {children}
    </span>
  );
}
