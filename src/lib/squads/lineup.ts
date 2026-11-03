import { pluralRu } from "@/lib/plural";

export type Squad = {
  id: string;
  name: string;
  size: number;
  players: string[];
};

export type Lineup = {
  event: string;
  squads: Squad[];
  absentReason: { name: string; reason: string }[];
  absentNo: string[];
  /** Players from outside the clan, added by name. */
  guests: string[];
};

export type LineupLocation =
  | { kind: "pool" }
  | { kind: "reason" }
  | { kind: "no" }
  | { kind: "squad"; id: string };

const DEFAULT_SQUAD_SIZE = 5;
const DEFAULT_EVENT = "Сбор";

const LIMITS = {
  event: 80,
  squadName: 40,
  playerName: 40,
  reason: 200,
  squads: 30,
  squadSize: 20,
  guests: 100,
  absent: 200,
};

const numberedSquads = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    name: `Отряд ${i + 1}`,
    size: DEFAULT_SQUAD_SIZE,
  }));

export const TEMPLATES = [3, 5, 7].map((count) => ({
  id: String(count),
  name: `${count} ${pluralRu(count, ["отряд", "отряда", "отрядов"])}`,
  squads: numberedSquads(count),
}));

export type LineupTemplate = (typeof TEMPLATES)[number];

export function defaultLineup(): Lineup {
  return {
    event: DEFAULT_EVENT,
    squads: numberedSquads(5).map((squad, i) => ({
      ...squad,
      id: `s${i + 1}`,
      players: [],
    })),
    absentReason: [],
    absentNo: [],
    guests: [],
  };
}

export function sameLocation(a: LineupLocation, b: LineupLocation) {
  if (a.kind !== b.kind) return false;
  return a.kind !== "squad" || a.id === (b as { id: string }).id;
}

export function newSquad(): Squad {
  return {
    id: `s${Date.now()}`,
    name: "Новый отряд",
    size: DEFAULT_SQUAD_SIZE,
    players: [],
  };
}

export function placedPlayers(lineup: Lineup) {
  return new Set([
    ...lineup.squads.flatMap(({ players }) => players),
    ...lineup.absentReason.map(({ name }) => name),
    ...lineup.absentNo,
  ]);
}

export type MoveResult = { lineup?: Lineup; message?: string };

/** With `swapWith` set, the player was dropped onto that player rather than onto the list. */
export function movePlayer(
  lineup: Lineup,
  name: string,
  from: LineupLocation,
  target: LineupLocation,
  swapWith?: string,
): MoveResult {
  const squads = lineup.squads.map((squad) => ({
    ...squad,
    players: [...squad.players],
  }));
  let absentReason = lineup.absentReason.map((entry) => ({ ...entry }));
  let absentNo = [...lineup.absentNo];
  const squadAt = (location: LineupLocation) =>
    location.kind === "squad"
      ? squads.find(({ id }) => id === location.id)
      : undefined;

  if (sameLocation(from, target)) {
    const squad = squadAt(target);
    if (!squad || !swapWith || swapWith === name) return {};
    const i = squad.players.indexOf(name);
    const j = squad.players.indexOf(swapWith);
    if (i < 0 || j < 0) return {};
    squad.players[i] = swapWith;
    squad.players[j] = name;
    return { lineup: { ...lineup, squads } };
  }

  const removeFromSource = () => {
    const source = squadAt(from);
    if (source) source.players = source.players.filter((n) => n !== name);
    if (from.kind === "reason") {
      absentReason = absentReason.filter((entry) => entry.name !== name);
    }
    if (from.kind === "no") absentNo = absentNo.filter((n) => n !== name);
  };

  if (target.kind === "squad") {
    const squad = squadAt(target);
    if (!squad || squad.players.includes(name)) return {};

    if (squad.players.length >= squad.size) {
      if (!swapWith) {
        return {
          message: `В отряде «${squad.name}» уже ${squad.size} из ${squad.size}. Перетащите ник прямо на игрока, чтобы поменять местами`,
        };
      }
      removeFromSource();
      squad.players[squad.players.indexOf(swapWith)] = name;
      squadAt(from)?.players.push(swapWith);
      if (from.kind === "reason") {
        absentReason.push({ name: swapWith, reason: "" });
      }
      if (from.kind === "no") absentNo.push(swapWith);
    } else {
      removeFromSource();
      const index = swapWith ? squad.players.indexOf(swapWith) : -1;
      if (index >= 0) squad.players.splice(index, 0, name);
      else squad.players.push(name);
    }
  } else if (target.kind === "reason") {
    if (absentReason.some((entry) => entry.name === name)) return {};
    removeFromSource();
    absentReason.push({ name, reason: "" });
  } else if (target.kind === "no") {
    if (absentNo.includes(name)) return {};
    removeFromSource();
    absentNo.push(name);
  } else {
    removeFromSource();
  }

  return { lineup: { ...lineup, squads, absentReason, absentNo } };
}

/** Squads with the same name keep their players; everyone else returns to the pool. */
export function applyTemplate(
  lineup: Lineup,
  template: LineupTemplate,
): Lineup {
  const stamp = Date.now();
  return {
    ...lineup,
    squads: template.squads.map(({ name, size }, i) => {
      const existing = lineup.squads.find((squad) => squad.name === name);
      return {
        id: existing?.id ?? `s${stamp}${i}`,
        name,
        size,
        players: existing?.players.slice(0, size) ?? [],
      };
    }),
  };
}

const isText = (value: unknown, max: number): value is string =>
  typeof value === "string" && value.length <= max;

const isPlayerName = (value: unknown): value is string =>
  isText(value, LIMITS.playerName) && value.trim().length > 0;

/** Checks data from the browser or the database. Returns null if it is not a valid lineup. */
export function parseLineup(value: unknown): Lineup | null {
  if (typeof value !== "object" || value === null) return null;
  const { event, squads, absentReason, absentNo, guests } = value as Lineup;

  if (!isText(event, LIMITS.event)) return null;
  if (!Array.isArray(squads) || squads.length > LIMITS.squads) return null;
  if (!Array.isArray(absentReason) || !Array.isArray(absentNo)) return null;
  if (!Array.isArray(guests) || guests.length > LIMITS.guests) return null;
  if (absentReason.length + absentNo.length > LIMITS.absent) return null;
  if (!guests.every(isPlayerName) || !absentNo.every(isPlayerName)) return null;

  const cleanSquads: Squad[] = [];
  for (const squad of squads) {
    const { id, name, size, players } = squad ?? {};
    if (!isText(id, LIMITS.squadName) || !id) return null;
    if (!isText(name, LIMITS.squadName)) return null;
    if (!Number.isInteger(size) || size < 1 || size > LIMITS.squadSize) {
      return null;
    }
    if (!Array.isArray(players) || players.length > size) return null;
    if (!players.every(isPlayerName)) return null;
    cleanSquads.push({ id, name, size, players });
  }
  if (new Set(cleanSquads.map(({ id }) => id)).size !== cleanSquads.length) {
    return null;
  }

  const cleanReasons: Lineup["absentReason"] = [];
  for (const entry of absentReason) {
    if (!isPlayerName(entry?.name) || !isText(entry?.reason, LIMITS.reason)) {
      return null;
    }
    cleanReasons.push({ name: entry.name, reason: entry.reason });
  }

  const placed = [
    ...cleanSquads.flatMap(({ players }) => players),
    ...cleanReasons.map(({ name }) => name),
    ...absentNo,
  ];
  if (new Set(placed).size !== placed.length) return null;

  return {
    event: event.trim() || DEFAULT_EVENT,
    squads: cleanSquads,
    absentReason: cleanReasons,
    absentNo,
    guests,
  };
}
