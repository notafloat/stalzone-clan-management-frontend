import { useSyncExternalStore } from "react";
import { SYSTEM_DARK_QUERY, THEME_STORAGE_KEY, type Theme } from "./theme";

function readSavedTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

export function chooseTheme(theme: Theme) {
  applyTheme(theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Private windows can block storage: the theme still applies until the page closes.
  }
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributeFilter: ["data-theme"],
  });

  function followOtherTab(event: StorageEvent) {
    if (event.key !== THEME_STORAGE_KEY) return;
    if (event.newValue === "light" || event.newValue === "dark") {
      applyTheme(event.newValue);
    }
  }
  const system = window.matchMedia(SYSTEM_DARK_QUERY);
  function followDevice() {
    if (!readSavedTheme()) applyTheme(system.matches ? "dark" : "light");
  }

  window.addEventListener("storage", followOtherTab);
  system.addEventListener("change", followDevice);
  return () => {
    observer.disconnect();
    window.removeEventListener("storage", followOtherTab);
    system.removeEventListener("change", followDevice);
  };
}

/** Null on the server, which can't know the theme, so hydration matches. */
export const useTheme = () =>
  useSyncExternalStore(
    subscribe,
    () => (document.documentElement.dataset.theme as Theme) ?? null,
    () => null,
  );
