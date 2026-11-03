import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { HeaderNav, HeaderNavLinks } from "./HeaderNav";

export function AppHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="font-golos sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-solid border-[rgb(227,229,233)] bg-white px-[clamp(14px,2vw,24px)] py-0 text-[rgb(23,25,30)] sm:gap-5">
      <Link
        href="/clan"
        className="hidden flex-none items-center gap-2.5 text-[rgb(23,25,30)] no-underline min-[420px]:flex"
      >
        <span className="font-jetbrains-mono line-clamp-1 rounded-sm bg-[oklch(0.93_0.13_120)] px-1.75 py-1.5 text-xs leading-none font-semibold tracking-[0.06em]">
          MOZG
        </span>
        <span className="hidden text-[15px] font-semibold whitespace-nowrap sm:inline">
          Zero Braincells
        </span>
      </Link>
      <Suspense fallback={<HeaderNavLinks />}>
        <HeaderNav />
      </Suspense>
      <div className="flex-1" />
      {children}
    </header>
  );
}
