export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "theme";
export const SYSTEM_DARK_QUERY = "(prefers-color-scheme: dark)";

/** Uses the saved choice, or follows the device until one is made. */
export const THEME_SCRIPT = `(function () {
  var theme;
  try {
    theme = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
  } catch (error) {}
  if (theme !== "light" && theme !== "dark") {
    theme = matchMedia(${JSON.stringify(SYSTEM_DARK_QUERY)}).matches ? "dark" : "light";
  }
  document.documentElement.dataset.theme = theme;
})();`;
