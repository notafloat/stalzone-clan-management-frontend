/** Picks the Russian form for a count, e.g. ["день", "дня", "дней"]. */
export function pluralRu(
  count: number,
  [one, few, many]: [string, string, string],
): string {
  const lastTwo = Math.abs(count) % 100;
  const last = lastTwo % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return many;
  if (last === 1) return one;
  return last >= 2 && last <= 4 ? few : many;
}

export const DAY_FORMS: [string, string, string] = ["день", "дня", "дней"];
