import type { ReactNode } from "react";

export function StatusPage({
  eyebrow,
  title,
  message,
  children,
}: {
  eyebrow: string;
  title: string;
  message: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-110 flex-col justify-center gap-5 px-4 font-golos">
      <div>
        <div className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
          {eyebrow}
        </div>
        <h1 className="mt-2 text-[clamp(26px,3.4vw,34px)] leading-[1.15] font-semibold tracking-[-0.015em]">
          {title}
        </h1>
        <p className="mt-3 text-[15px] leading-[1.55] text-ink-soft">
          {message}
        </p>
      </div>
      {children}
    </main>
  );
}

export const STATUS_ACTION =
  "flex h-12.5 cursor-pointer items-center justify-center rounded-lg border-0 bg-ink text-[15.5px] font-semibold text-on-ink no-underline";
