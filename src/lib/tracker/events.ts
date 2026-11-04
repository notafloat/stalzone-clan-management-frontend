import type { EventType } from "@/lib/db/schema";
import { RANK_BY_ID } from "@/lib/members/members";
import type { ClanRank } from "@/lib/stalzone/types";

export const EVENT_STYLES: Record<EventType, { label: string; color: string }> =
  {
    joined: { label: "Вступил", color: "var(--tone-green-52)" },
    left: { label: "Покинул", color: "var(--tone-red-55)" },
    promoted: { label: "Повышен", color: "var(--tone-blue-56)" },
    demoted: { label: "Понижен", color: "var(--tone-amber-58)" },
    renamed: { label: "Переименован", color: "var(--ink-soft)" },
  };

const EMPTY_VALUE_COLOR = "var(--dim-197)";

/** A rank, except for renames, where the value is a name. */
export function displayValue(type: EventType, value: string | null) {
  if (!value) return { text: "—", color: EMPTY_VALUE_COLOR };
  const rank = type === "renamed" ? undefined : RANK_BY_ID[value as ClanRank];
  return { text: rank?.label ?? value, color: rank?.color };
}
