import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { HeaderNavLinks, MobilePageTitle } from "./HeaderNav";
import { RankedHeaderNav } from "./RankedNav";
import { ThemeToggle } from "./ThemeToggle";

export function AppHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-solid border-line-227 bg-surface px-[clamp(14px,2vw,24px)] py-0 font-golos text-ink sm:gap-5">
      <Link
        href="/clan"
        className="flex flex-none items-center gap-2.5 text-ink no-underline"
      >
        <span className="line-clamp-1 rounded-sm bg-tone-lime-93 px-1.75 py-1.5 font-jetbrains-mono text-xs leading-none font-semibold tracking-[0.06em]">
          MOZG
        </span>
        <span className="hidden text-[15px] font-semibold whitespace-nowrap min-[1180px]:inline">
          Zero Braincells
        </span>
      </Link>
      <Suspense fallback={<HeaderNavLinks />}>
        <RankedHeaderNav />
      </Suspense>
      <Suspense fallback={null}>
        <MobilePageTitle />
      </Suspense>
      <div className="flex-1" />
      <ThemeToggle />
      {children}
    </header>
  );
}
