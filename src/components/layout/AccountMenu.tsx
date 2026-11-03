"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const MENU_ITEM =
  "block w-full cursor-pointer border-0 bg-transparent px-4 py-2.25 text-left text-sm text-[rgb(23,25,30)] no-underline hover:bg-[rgb(245,246,248)]";

export function AccountMenu({
  name,
  rankLabel,
  rankBadge,
  clanLabel,
  sessionTimeLeft,
}: {
  name: string;
  rankLabel: string;
  rankBadge: string;
  clanLabel: string;
  sessionTimeLeft: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function closeOnOutsideClick(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} className="relative flex-none">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-label={`Аккаунт: ${name}`}
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-9.5 cursor-pointer items-center gap-2.25 rounded-md border border-solid border-transparent bg-transparent pr-2.5 pl-1.25 text-left text-[rgb(23,25,30)]"
      >
        <span
          className={`grid size-7 place-items-center rounded-[5px] text-[13px] font-bold ${rankBadge}`}
        >
          {name.charAt(0).toUpperCase()}
        </span>
        <span className="hidden flex-col leading-[1.2] sm:flex">
          <span className="text-[13.5px] font-semibold">{name}</span>
          <span className="text-[11.5px] text-[rgb(134,140,150)]">
            {rankLabel}
          </span>
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 z-40 mt-2 w-[min(290px,calc(100vw-28px))] overflow-hidden rounded-xl border border-solid border-[rgb(227,229,233)] bg-white shadow-[0_8px_24px_rgba(23,25,30,0.12)]">
          <div className="p-4">
            <div className="truncate text-[15px] font-semibold">{name}</div>
            <div className="mt-0.5 text-[12.5px] text-[rgb(134,140,150)]">
              {rankLabel} · {clanLabel}
            </div>
          </div>
          <div className="border-t border-solid border-[rgb(238,240,243)] p-4">
            <div className="mb-2 text-[11px] font-semibold tracking-[0.12em] text-[rgb(134,140,150)] uppercase">
              Сессия
            </div>
            <div className="font-jetbrains-mono text-[12px] leading-[1.6] text-[rgb(79,85,96)]">
              <div>вход через EXBO · JWT</div>
              <div>до выхода из сайта: {sessionTimeLeft}</div>
            </div>
          </div>
          <div className="border-t border-solid border-[rgb(238,240,243)] py-1.5">
            <Link
              href="/characters"
              onClick={() => setIsOpen(false)}
              className={MENU_ITEM}
            >
              Сменить персонажа
            </Link>
            <form action="/api/auth/logout" method="post">
              <button className={MENU_ITEM}>Выйти</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
