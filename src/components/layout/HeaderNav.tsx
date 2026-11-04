"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/clan", label: "Клан" },
  { href: "/members", label: "Состав" },
  { href: "/journal", label: "Журнал" },
  { href: "/squads", label: "Отряды" },
  { href: "/kv", label: "КВ" },
];
const ADMIN_LINK = { href: "/admin", label: "Админ" };

const PAGE_TITLES: Record<string, string> = {
  "/clan": "Клан",
  "/members": "Состав",
  "/journal": "Журнал",
  "/squads": "Отряды",
  "/kv": "Активность на КВ",
  "/admin": "Настройки клана",
};

export function HeaderNavLinks({
  pathname,
  showAdmin = false,
}: {
  pathname?: string;
  showAdmin?: boolean;
}) {
  const links = showAdmin ? [...NAV_LINKS, ADMIN_LINK] : NAV_LINKS;
  return (
    <nav className="hidden min-w-0 scrollbar-none gap-0.5 overflow-x-auto min-[760px]:flex">
      {links.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={
            pathname?.startsWith(href)
              ? "flex h-8 flex-none items-center rounded-md bg-tone-lime-93 px-3 text-sm font-semibold text-ink no-underline"
              : "flex h-8 flex-none items-center rounded-md bg-transparent px-3 text-sm font-medium text-ink-soft no-underline"
          }
        >
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

export function HeaderNav({ showAdmin }: { showAdmin: boolean }) {
  return <HeaderNavLinks pathname={usePathname()} showAdmin={showAdmin} />;
}

export function MobilePageTitle() {
  const pathname = usePathname();
  const section = `/${pathname.split("/")[1]}`;
  return (
    <span className="min-w-0 truncate text-[15px] font-semibold min-[760px]:hidden">
      {PAGE_TITLES[section]}
    </span>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      data-bottom-nav
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-solid border-line-227 bg-surface pb-[env(safe-area-inset-bottom)] font-golos min-[760px]:hidden"
    >
      {NAV_LINKS.map(({ href, label }) => {
        const isActive = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={`flex h-14 flex-col items-center justify-center gap-1 text-[12px] no-underline ${
              isActive ? "font-semibold text-ink" : "font-medium text-muted"
            }`}
          >
            <span
              className={`h-1 w-6 rounded-xs ${isActive ? "bg-[oklch(0.75_0.17_120)]" : "bg-transparent"}`}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
