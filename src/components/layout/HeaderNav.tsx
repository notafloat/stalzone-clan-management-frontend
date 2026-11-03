"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/clan", label: "Клан" },
  { href: "/members", label: "Состав" },
  { href: "/journal", label: "Журнал" },
  { href: "/squads", label: "Отряды" },
];

export function HeaderNavLinks({ pathname }: { pathname?: string }) {
  return (
    <nav className="flex min-w-0 scrollbar-none gap-0.5 overflow-x-auto">
      {NAV_LINKS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={
            pathname?.startsWith(href)
              ? "flex h-8 flex-none items-center rounded-md bg-[oklch(0.93_0.13_120)] px-3 text-sm font-semibold text-[rgb(23,25,30)] no-underline"
              : "flex h-8 flex-none items-center rounded-md bg-transparent px-3 text-sm font-medium text-[rgb(79,85,96)] no-underline"
          }
        >
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

export function HeaderNav() {
  return <HeaderNavLinks pathname={usePathname()} />;
}
