export type GameMap = {
  id: string;
  name: string;
  src: string;
  w: number;
  h: number;
};

export const MAX_MAP_NAME_LENGTH = 40;
export const MAX_MAP_FILE_BYTES = 10 * 1024 * 1024;

/** These sit on top of the map image, so they don't change with the site's theme. */
export const DRAW_COLORS = [
  { value: "#ffffff", name: "Белый" },
  { value: "oklch(0.88 0.19 125)", name: "Лайм" },
  { value: "oklch(0.83 0.13 210)", name: "Голубой" },
  { value: "oklch(0.84 0.16 75)", name: "Янтарный" },
  { value: "oklch(0.66 0.22 25)", name: "Красный" },
];

const SQUAD_COLORS = [
  "oklch(0.88 0.19 125)",
  "oklch(0.82 0.13 210)",
  "oklch(0.84 0.16 75)",
  "oklch(0.74 0.18 340)",
  "oklch(0.76 0.15 290)",
  "oklch(0.8 0.14 160)",
  "oklch(0.92 0 0)",
];

export const squadColor = (index: number) =>
  SQUAD_COLORS[Math.max(index, 0) % SQUAD_COLORS.length];

/** A squad's single icon is kept with the players' tokens, under its own key. */
export const squadTokenKey = (squadId: string) => `squad:${squadId}`;

export const MARKERS = [
  { id: "enemy", label: "Враг" },
  { id: "ally", label: "Свои" },
  { id: "target", label: "Цель" },
  { id: "danger", label: "Опасно" },
  { id: "camp", label: "Лагерь" },
  { id: "antenna", label: "Антенна" },
] as const;

export type MarkerType = (typeof MARKERS)[number]["id"];

/** These take the chosen drawing colour; the others always look the same. */
export const isColoredMarker = (type: MarkerType) =>
  type === "camp" || type === "antenna";

export const LINE_WIDTHS = { fine: 2, thin: 4, thick: 7 };

export const MAX_STROKE_POINTS = 1000;
const MAX_ITEMS_PER_PHASE = 300;
const MAX_PHASES = 20;
const MAX_NAME_LENGTH = 80;
const MAX_NOTE_LENGTH = 1000;
const MAX_TEXT_LENGTH = 80;
const MAX_LIST_LENGTH = 200;
/** Stays under the 1 MB limit on server action requests. */
const MAX_PLAN_JSON_LENGTH = 900_000;

export type Point = [number, number];

export type StrokeItem = {
  id: string;
  kind: "pen" | "route" | "arrow";
  color: number;
  width: number;
  points: Point[];
};
export type MarkerItem = {
  id: string;
  kind: "marker";
  type: MarkerType;
  x: number;
  y: number;
  color?: number;
};
export type TextItem = {
  id: string;
  kind: "text";
  color: number;
  x: number;
  y: number;
  text: string;
};
export type MapItem = StrokeItem | MarkerItem | TextItem;

export type Phase = {
  name: string;
  note: string;
  tokens: Record<string, { x: number; y: number }>;
  items: MapItem[];
};

export type MapPlan = {
  id: string;
  map: string;
  name: string;
  squads: string[];
  phases: Phase[];
};

/** Short and unique enough for the items of one clan's plans. */
export const newMapId = (prefix: string) =>
  `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

export const newPhase = (
  number: number,
  tokens: Phase["tokens"] = {},
): Phase => ({
  name: `Фаза ${number}`,
  note: "",
  tokens,
  items: [],
});

export const newPlan = (id: string, map: string): MapPlan => ({
  id,
  map,
  name: "Новый план",
  squads: [],
  phases: [newPhase(1)],
});

const isText = (value: unknown, max: number): value is string =>
  typeof value === "string" && value.length <= max;

const isId = (value: unknown): value is string =>
  typeof value === "string" && /^[\w-]{1,60}$/.test(value);

function parseItem(value: unknown, map: GameMap): MapItem | null {
  const item = (value ?? {}) as Record<string, unknown>;
  if (!isId(item.id)) return null;

  const onMap = (x: unknown, y: unknown) =>
    typeof x === "number" &&
    typeof y === "number" &&
    x >= 0 &&
    x <= map.w &&
    y >= 0 &&
    y <= map.h;
  const isColor = (color: unknown) =>
    Number.isInteger(color) &&
    (color as number) >= 0 &&
    (color as number) < DRAW_COLORS.length;

  if (item.kind === "pen" || item.kind === "route" || item.kind === "arrow") {
    const { points, width } = item;
    if (!isColor(item.color)) return null;
    if (!Object.values(LINE_WIDTHS).includes(width as number)) return null;
    if (!Array.isArray(points) || points.length < 2) return null;
    if (points.length > MAX_STROKE_POINTS) return null;
    const isValid = (point: unknown) =>
      Array.isArray(point) && onMap(point[0], point[1]);
    if (!points.every(isValid)) return null;
    return {
      id: item.id,
      kind: item.kind,
      color: item.color as number,
      width: width as number,
      points: points.map(([x, y]) => [x, y]),
    };
  }
  if (!onMap(item.x, item.y)) return null;
  const position = { x: item.x as number, y: item.y as number };

  if (item.kind === "marker") {
    const type = MARKERS.find(({ id }) => id === item.type)?.id;
    if (!type) return null;
    if (!isColoredMarker(type)) {
      return { id: item.id, kind: "marker", type, ...position };
    }
    if (!isColor(item.color)) return null;
    return {
      id: item.id,
      kind: "marker",
      type,
      color: item.color as number,
      ...position,
    };
  }
  if (item.kind === "text") {
    if (!isColor(item.color) || !isText(item.text, MAX_TEXT_LENGTH)) {
      return null;
    }
    return {
      id: item.id,
      kind: "text",
      color: item.color as number,
      text: item.text,
      ...position,
    };
  }
  return null;
}

function parsePhase(value: unknown, map: GameMap): Phase | null {
  const { name, note, tokens, items } = (value ?? {}) as Phase;
  if (!isText(name, MAX_NAME_LENGTH) || !isText(note, MAX_NOTE_LENGTH)) {
    return null;
  }
  if (!Array.isArray(items) || items.length > MAX_ITEMS_PER_PHASE) return null;
  if (typeof tokens !== "object" || tokens === null) return null;

  const entries = Object.entries(tokens);
  if (entries.length > MAX_LIST_LENGTH) return null;
  const cleanTokens: Phase["tokens"] = {};
  for (const [player, position] of entries) {
    const { x, y } = (position ?? {}) as { x: unknown; y: unknown };
    if (!isText(player, MAX_NAME_LENGTH)) return null;
    if (typeof x !== "number" || typeof y !== "number") return null;
    if (x < 0 || x > map.w || y < 0 || y > map.h) return null;
    cleanTokens[player] = { x, y };
  }

  const cleanItems: MapItem[] = [];
  for (const item of items) {
    const parsed = parseItem(item, map);
    if (!parsed) return null;
    cleanItems.push(parsed);
  }
  return { name, note, tokens: cleanTokens, items: cleanItems };
}

/** Checks data from the browser or the database. Returns null if it is not a valid plan. */
export function parsePlan(value: unknown, maps: GameMap[]): MapPlan | null {
  const { id, map: mapId, name, squads, phases } = (value ?? {}) as MapPlan;
  const map = maps.find((option) => option.id === mapId);
  if (!isId(id) || !map || !isText(name, MAX_NAME_LENGTH)) return null;
  if (!Array.isArray(squads) || squads.length > MAX_LIST_LENGTH) return null;
  if (!squads.every(isId)) return null;
  if (!Array.isArray(phases)) return null;
  if (phases.length === 0 || phases.length > MAX_PHASES) return null;

  const cleanPhases: Phase[] = [];
  for (const phase of phases) {
    const parsed = parsePhase(phase, map);
    if (!parsed) return null;
    cleanPhases.push(parsed);
  }
  const plan = {
    id,
    map: map.id,
    name,
    squads: [...new Set(squads)],
    phases: cleanPhases,
  };
  return JSON.stringify(plan).length <= MAX_PLAN_JSON_LENGTH ? plan : null;
}

export const isPlanId = isId;
