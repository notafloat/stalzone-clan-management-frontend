"use client";

import { chooseTheme, useTheme } from "@/lib/use-theme";

export function ThemeToggle() {
  const theme = useTheme();
  const isDark = theme === "dark";
  const label = isDark ? "Включить светлую тему" : "Включить тёмную тему";

  return (
    <button
      type="button"
      data-theme-toggle
      title={label}
      aria-label={label}
      onClick={() => chooseTheme(isDark ? "light" : "dark")}
      className="grid size-8 flex-none cursor-pointer place-items-center rounded-md border border-solid border-line-227 bg-surface text-ink-soft hover:bg-hover hover:text-ink"
    >
      {theme && (
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {isDark ? (
            <>
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </>
          ) : (
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
          )}
        </svg>
      )}
    </button>
  );
}
