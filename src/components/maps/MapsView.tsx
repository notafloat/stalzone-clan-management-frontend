"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
} from "react";
import {
  deleteMapPlan,
  deleteUploadedMap,
  saveMapPlan,
} from "@/app/maps/actions";
import {
  DRAW_COLORS,
  LINE_WIDTHS,
  newMapId,
  MARKERS,
  newPhase,
  newPlan,
  squadColor,
  squadTokenKey,
  type GameMap,
  type MapItem,
  type MapPlan,
  type MarkerType,
  type Phase,
} from "@/lib/maps/maps";
import { pluralRu } from "@/lib/plural";
import type { Squad } from "@/lib/squads/lineup";
import { useIsMobile } from "@/lib/use-is-mobile";
import { useSaveQueue } from "@/lib/use-save-queue";
import { MapCanvas, type MapPlayer, type Tool } from "./MapCanvas";
import { MapUpload } from "./MapUpload";

const TOOLS: { id: Tool; label: string; key: string }[] = [
  { id: "select", label: "Курсор", key: "V" },
  { id: "pen", label: "Перо", key: "P" },
  { id: "route", label: "Маршрут", key: "R" },
  { id: "arrow", label: "Стрелка", key: "A" },
  { id: "marker", label: "Метка", key: "M" },
  { id: "text", label: "Текст", key: "T" },
  { id: "eraser", label: "Ластик", key: "E" },
];
const TOOL_HINTS: Record<Tool, string> = {
  select: "Курсор — двигайте игроков и метки",
  pen: "Перо",
  route: "Маршрут — пунктир со стрелкой",
  arrow: "Стрелка",
  marker: "Метка",
  text: "Текст — клик по карте",
  eraser: "Ластик — клик или проведите по объекту",
};
function ColoredMarkerIcon({
  type,
  color,
}: {
  type: "camp" | "antenna";
  color: string;
}) {
  return (
    <svg
      viewBox="0 0 16 16"
      className="size-4 flex-none rounded-full bg-[#17191e] p-0.5"
      fill="none"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {type === "camp" ? (
        <path d="M8 3 14 13H2ZM8 8l2.5 5h-5Z" />
      ) : (
        <path d="M8 7 5 14M8 7l3 7M6 11h4M4.5 3a5 5 0 0 0 0 6M11.5 3a5 5 0 0 1 0 6" />
      )}
    </svg>
  );
}

const MARKER_ICONS: Record<Exclude<MarkerType, "camp" | "antenna">, string> = {
  enemy: "bg-[oklch(0.62_0.22_25)] [clip-path:polygon(50%_0,100%_100%,0_100%)]",
  ally: "rounded-full bg-[oklch(0.68_0.14_235)]",
  target: "rounded-full shadow-[inset_0_0_0_3px_oklch(0.78_0.16_75)]",
  danger:
    "bg-[oklch(0.8_0.16_75)] [clip-path:polygon(50%_0,100%_50%,50%_100%,0_50%)]",
};
const MAX_HISTORY = 60;
const TOAST_MS = 2800;

const SEGMENT_GROUP = "flex gap-0.5 rounded-lg bg-wash p-0.75";
const segment = (isOn: boolean) =>
  isOn
    ? "bg-surface text-ink shadow-[0_1px_2px_rgba(23,25,30,0.16)]"
    : "bg-transparent text-ink-soft";
const TOOL_BUTTON =
  "h-8 cursor-pointer rounded-md border border-solid border-edge-217 bg-surface text-[13px] hover:bg-hover disabled:cursor-default disabled:opacity-40";
const SECTION = "border-b border-solid border-line-soft px-4 py-3.5";
const FIELD =
  "rounded-md border border-solid border-edge-217 bg-surface px-2.5 text-[13.5px] outline-none focus:border-ink";

type Doc = {
  plans: MapPlan[];
  past: Record<string, MapPlan[]>;
  future: Record<string, MapPlan[]>;
};
type Change = { history?: boolean; save?: boolean };

function PlanSelect({
  maps,
  plans,
  value,
  onChange,
  className,
}: {
  maps: GameMap[];
  plans: MapPlan[];
  value: string;
  onChange: (id: string) => void;
  className: string;
}) {
  return (
    <select
      value={value}
      aria-label="План"
      onChange={(event) => onChange(event.target.value)}
      className={className}
    >
      {maps.map((map) => (
        <optgroup key={map.id} label={map.name}>
          {plans
            .filter((plan) => plan.map === map.id)
            .map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  );
}

function PlayerList({
  groups,
  phase,
  me,
  canDraw,
  placing,
  onPlacing,
}: {
  groups: {
    name: string;
    color: string;
    token: MapPlayer;
    players: MapPlayer[];
  }[];
  phase: Phase;
  me: string;
  canDraw: boolean;
  placing: string | null;
  onPlacing: (name: string | null) => void;
}) {
  const dragProps = (name: string) => ({
    draggable: canDraw,
    onDragStart: (event: DragEvent) => {
      event.dataTransfer.setData("text/plain", name);
      event.dataTransfer.effectAllowed = "copy";
    },
    onClick: () => {
      if (canDraw) onPlacing(placing === name ? null : name);
    },
  });

  return groups.map((group) => {
    const isSquadPlaced = Boolean(phase.tokens[group.token.name]);
    return (
      <div key={group.name}>
        <div
          data-map-squad={group.name}
          {...dragProps(group.token.name)}
          className={`mt-2 flex min-h-7 items-center gap-2 rounded-md px-2 select-none ${canDraw ? "cursor-grab hover:bg-hover" : ""} ${placing === group.token.name ? "bg-tone-lime-93" : ""}`}
        >
          <span
            className="grid size-5.5 flex-none place-items-center rounded-[5px] bg-[#17191e] font-jetbrains-mono text-[11px] font-bold text-white"
            style={{ boxShadow: `inset 0 0 0 2.5px ${group.color}` }}
          >
            {group.token.number}
          </span>
          <span className="min-w-0 flex-1 truncate text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">
            {group.name}
          </span>
          {(canDraw || isSquadPlaced) && (
            <span
              className={`flex-none text-[11.5px] ${isSquadPlaced ? "text-tone-green-52" : "text-dim-163"}`}
            >
              {isSquadPlaced ? "на карте" : "поставить отряд"}
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-col gap-0.5">
          {group.players.map((player) => {
            const isPlaced = Boolean(phase.tokens[player.name]);
            const isPlacing = placing === player.name;
            const status = isPlaced
              ? "на карте"
              : isSquadPlaced
                ? "с отрядом"
                : "не размещён";
            return (
              <div
                key={player.name}
                data-map-player={player.name}
                {...dragProps(player.name)}
                className={`flex h-9 items-center gap-2.5 rounded-md px-2 select-none ${canDraw ? "cursor-grab hover:bg-hover" : ""} ${isPlacing ? "bg-tone-lime-93" : ""}`}
              >
                <span
                  className="grid size-5.5 flex-none place-items-center rounded-full bg-[#17191e] font-jetbrains-mono text-[11px] font-bold text-white"
                  style={{ boxShadow: `inset 0 0 0 2.5px ${player.color}` }}
                >
                  {player.number}
                </span>
                <span
                  className={`min-w-0 flex-1 truncate text-[13.5px] ${player.name === me ? "font-bold" : "font-medium"}`}
                >
                  {player.name}
                </span>
                <span
                  className={`flex-none text-[11.5px] ${isPlaced || isSquadPlaced ? "text-tone-green-52" : "text-dim-163"}`}
                >
                  {status}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  });
}

export function MapsView({
  initialMaps,
  initialPlans,
  initialPlanId,
  squads,
  me,
  canEdit,
}: {
  initialMaps: GameMap[];
  initialPlans: { plan: MapPlan; version: number }[];
  initialPlanId?: string;
  squads: Squad[];
  me: string;
  canEdit: boolean;
}) {
  const [maps, setMaps] = useState(initialMaps);
  const [doc, setDoc] = useState<Doc>({
    plans: initialPlans.map(({ plan }) => plan),
    past: {},
    future: {},
  });
  const [planId, setPlanId] = useState(
    initialPlans.find(({ plan }) => plan.id === initialPlanId)?.plan.id ??
      initialPlans[0]?.plan.id,
  );
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [tool, setTool] = useState<Tool>("select");
  const [color, setColor] = useState(1);
  const [width, setWidth] = useState(LINE_WIDTHS.thin);
  const [markerType, setMarkerType] = useState<MarkerType>("enemy");
  const [showPrevious, setShowPrevious] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [placing, setPlacing] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const versions = useRef<Record<string, number>>(
    Object.fromEntries(
      initialPlans.map(({ plan, version }) => [plan.id, version]),
    ),
  );

  const saveBatch = useCallback(async (batch: Record<string, MapPlan>) => {
    for (const plan of Object.values(batch)) {
      const version = await saveMapPlan(plan, versions.current[plan.id] ?? 0);
      if (version === null) return false;
      versions.current[plan.id] = version;
    }
    return true;
  }, []);
  const combineBatches = useCallback(
    (older: Record<string, MapPlan>, newer: Record<string, MapPlan>) => ({
      ...older,
      ...newer,
    }),
    [],
  );
  const { enqueue, whenIdle, status } = useSaveQueue(saveBatch, combineBatches);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  function showToast(text: string) {
    clearTimeout(toastTimer.current);
    setToast(text);
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  }

  const canDraw = canEdit && !isMobile;
  const plan = doc.plans.find(({ id }) => id === planId) ?? doc.plans[0];
  const map = plan && maps.find(({ id }) => id === plan.map);
  const phaseAt = plan ? Math.min(phaseIndex, plan.phases.length - 1) : 0;
  const phase = plan?.phases[phaseAt];
  const previous =
    plan && showPrevious && phaseAt > 0 ? plan.phases[phaseAt - 1] : null;

  function change(
    update: (current: MapPlan) => MapPlan,
    { history = true, save = true }: Change = {},
  ) {
    if (!plan) return;
    const next = update(plan);
    setDoc((current) => ({
      plans: current.plans.map((other) =>
        other.id === plan.id ? next : other,
      ),
      past: history
        ? {
            ...current.past,
            [plan.id]: [...(current.past[plan.id] ?? []), plan].slice(
              -MAX_HISTORY,
            ),
          }
        : current.past,
      future: history ? { ...current.future, [plan.id]: [] } : current.future,
    }));
    if (save) enqueue({ [plan.id]: next });
  }

  function changePhase(update: (current: Phase) => Phase, options?: Change) {
    change(
      (current) => ({
        ...current,
        phases: current.phases.map((other, i) =>
          i === phaseAt ? update(other) : other,
        ),
      }),
      options,
    );
  }

  function travel(from: "past" | "future") {
    if (!plan) return;
    const stack = doc[from][plan.id] ?? [];
    const target = stack[stack.length - 1];
    if (!target) return;
    const to = from === "past" ? "future" : "past";
    setDoc(
      (current) =>
        ({
          plans: current.plans.map((other) =>
            other.id === plan.id ? target : other,
          ),
          [from]: { ...current[from], [plan.id]: stack.slice(0, -1) },
          [to]: {
            ...current[to],
            [plan.id]: [...(current[to][plan.id] ?? []), plan],
          },
        }) as Doc,
    );
    enqueue({ [plan.id]: target });
  }

  const pickPlan = (id: string) => {
    setPlanId(id);
    setPhaseIndex(0);
    setPlacing(null);
  };

  function addPlan(mapId: string) {
    const id = newMapId("p");
    const created = newPlan(id, mapId);
    setDoc((current) => ({ ...current, plans: [...current.plans, created] }));
    enqueue({ [id]: created });
    pickPlan(id);
  }

  async function removePlan() {
    if (!plan || !window.confirm(`Удалить план «${plan.name}»?`)) return;
    const removed = plan;
    const ok = (await whenIdle()) && (await deleteMapPlan(removed.id));
    if (!ok) {
      showToast("Не удалось удалить план. Обновите страницу");
      return;
    }
    const rest = doc.plans.filter(({ id }) => id !== removed.id);
    setDoc((current) => ({
      ...current,
      plans: current.plans.filter(({ id }) => id !== removed.id),
    }));
    pickPlan(rest[0]?.id);
    showToast(`План «${removed.name}» удалён`);
  }

  function handleUploaded(uploaded: GameMap) {
    setMaps((current) => [...current, uploaded]);
    addPlan(uploaded.id);
    showToast(`Карта «${uploaded.name}» загружена`);
  }

  async function removeMap(target: GameMap) {
    const onMap = doc.plans.filter((other) => other.map === target.id);
    const warning = onMap.length
      ? ` Вместе с ней удалятся планы: ${onMap.length}.`
      : "";
    if (!window.confirm(`Удалить карту «${target.name}»?${warning}`)) return;
    const ok = (await whenIdle()) && (await deleteUploadedMap(target.id));
    if (!ok) {
      showToast("Не удалось удалить карту. Обновите страницу");
      return;
    }
    setMaps((current) => current.filter(({ id }) => id !== target.id));
    setDoc((current) => ({
      ...current,
      plans: current.plans.filter((other) => other.map !== target.id),
    }));
    if (plan?.map === target.id) {
      pickPlan(doc.plans.find((other) => other.map !== target.id)?.id ?? "");
    }
    showToast(`Карта «${target.name}» удалена`);
  }

  const shortcuts = useRef({ travel, canDraw });
  useEffect(() => {
    shortcuts.current = { travel, canDraw };
  });
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      const { travel: move, canDraw: isDrawing } = shortcuts.current;
      if (!isDrawing) return;
      const isCommand = event.ctrlKey || event.metaKey;
      if (isCommand && event.code === "KeyZ") {
        event.preventDefault();
        move(event.shiftKey ? "future" : "past");
      } else if (isCommand && event.code === "KeyY") {
        event.preventDefault();
        move("future");
      } else if (event.key === "Escape") {
        setPlacing(null);
      } else if (!isCommand && !event.altKey) {
        const picked = TOOLS.find(({ key }) => `Key${key}` === event.code);
        if (picked) {
          setTool(picked.id);
          setPlacing(null);
        }
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const saveNotice = status !== "idle" && (
    <div
      role="status"
      className={`fixed bottom-21 left-1/2 z-70 -translate-x-1/2 rounded-lg px-4 py-2.75 text-[13.5px] text-on-ink shadow-[0_10px_30px_rgba(23,25,30,0.25)] min-[760px]:bottom-6 ${status === "failed" ? "bg-tone-red-52" : "bg-ink"}`}
    >
      {status === "failed"
        ? "Не удалось сохранить. Возможно, план изменил другой офицер — обновите страницу"
        : "Сохранение…"}
    </div>
  );
  const toastNotice = toast && status === "idle" && (
    <div
      role="status"
      className="fixed bottom-21 left-1/2 z-70 max-w-[min(560px,calc(100vw-24px))] -translate-x-1/2 rounded-lg bg-ink px-4 py-2.75 text-[13.5px] leading-[1.4] text-on-ink shadow-[0_10px_30px_rgba(23,25,30,0.25)] min-[760px]:bottom-6"
    >
      {toast}
    </div>
  );

  if (!plan || !map || !phase) {
    return (
      <main className="mx-auto flex max-w-330 flex-col gap-4 px-[clamp(14px,3vw,32px)] pt-7 pb-28">
        <div className="border-b border-solid border-line pb-4">
          <div className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
            Карты
          </div>
          <h1 className="mt-1.5 text-[clamp(22px,3vw,28px)] leading-[1.15] font-semibold tracking-[-0.01em]">
            Планы на картах
          </h1>
        </div>
        <div className="rounded-md border border-solid border-line bg-surface p-10 text-center text-sm text-muted">
          {maps.length === 0
            ? canDraw
              ? "Карт пока нет. Загрузите первую."
              : canEdit
                ? "Карт пока нет. Загрузить их можно с компьютера."
                : "Карт пока нет: их загружают офицеры и выше."
            : canDraw
              ? "Планов пока нет. Выберите карту, чтобы создать первый."
              : canEdit
                ? "Планов пока нет. Создать их можно с компьютера."
                : "Планов пока нет: их рисуют офицеры и выше."}
          {canDraw && (
            <div className="mt-4 flex flex-wrap justify-center gap-2 text-ink">
              {maps.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  data-add-plan={option.id}
                  onClick={() => addPlan(option.id)}
                  className={`${TOOL_BUTTON} px-3 whitespace-nowrap`}
                >
                  + {option.name}
                </button>
              ))}
              <MapUpload
                buttonClassName={`${TOOL_BUTTON} px-3 whitespace-nowrap`}
                onUploaded={handleUploaded}
              />
            </div>
          )}
        </div>
        {saveNotice}
        {toastNotice}
      </main>
    );
  }

  const planSquads = plan.squads.flatMap((id) => {
    const index = squads.findIndex((squad) => squad.id === id);
    return index === -1 ? [] : [{ squad: squads[index], index }];
  });
  const groups = planSquads.map(({ squad, index }) => ({
    name: squad.name,
    color: squadColor(index),
    token: {
      name: squadTokenKey(squad.id),
      number: String(squad.players.length),
      color: squadColor(index),
      label: squad.name,
      isSquad: true,
    },
    players: squad.players.map((name, i) => ({
      name,
      number: String(i + 1),
      color: squadColor(index),
    })),
  }));
  const players = groups.flatMap((group) => group.players);
  const tokens: MapPlayer[] = groups.flatMap((group) => [
    group.token,
    ...group.players,
  ]);
  const placedCount = groups.flatMap((group) =>
    phase.tokens[group.token.name]
      ? group.players
      : group.players.filter(({ name }) => phase.tokens[name]),
  ).length;
  const planMeta = [
    `${plan.phases.length} ${pluralRu(plan.phases.length, ["фаза", "фазы", "фаз"])}`,
    ...(planSquads.length
      ? [planSquads.map(({ squad }) => squad.name).join(", ")]
      : []),
  ].join(" · ");
  const isEmpty = phase.items.length === 0 && placedCount === 0;
  const banner = placing
    ? `Кликните по карте, чтобы поставить ${tokens.find(({ name }) => name === placing)?.label ?? placing}`
    : isEmpty
      ? canDraw
        ? "Пустая фаза — выберите инструмент или перетащите отряд и игроков из списка справа"
        : "В этой фазе пока ничего не нарисовано"
      : null;

  const canvas = (
    <MapCanvas
      key={`${plan.id}:${phaseAt}`}
      map={map}
      phase={phase}
      previous={previous}
      players={tokens}
      showLabels={showLabels}
      canDraw={canDraw}
      tool={tool}
      color={color}
      width={width}
      markerType={markerType}
      placing={placing}
      banner={banner}
      onPlace={(name, x, y) => {
        changePhase((current) => ({
          ...current,
          tokens: {
            ...current.tokens,
            [name]: { x: Math.round(x), y: Math.round(y) },
          },
        }));
        setPlacing(null);
      }}
      onAddItem={(item: MapItem) =>
        changePhase((current) => ({
          ...current,
          items: [...current.items, item],
        }))
      }
      onErase={(id) =>
        changePhase((current) => ({
          ...current,
          items: current.items.filter((item) => item.id !== id),
        }))
      }
      onRemoveToken={(name) =>
        changePhase((current) => ({
          ...current,
          tokens: Object.fromEntries(
            Object.entries(current.tokens).filter(([key]) => key !== name),
          ),
        }))
      }
      onBeginDrag={() => change((current) => current, { save: false })}
      onDrag={(target, x, y) =>
        changePhase(
          (current) =>
            target.kind === "token"
              ? {
                  ...current,
                  tokens: { ...current.tokens, [target.name]: { x, y } },
                }
              : {
                  ...current,
                  items: current.items.map((item) =>
                    item.id === target.id &&
                    item.kind !== "pen" &&
                    item.kind !== "route" &&
                    item.kind !== "arrow"
                      ? { ...item, x, y }
                      : item,
                  ),
                },
          { history: false, save: false },
        )
      }
      onEndDrag={() => enqueue({ [plan.id]: plan })}
    />
  );

  const phaseTabs = plan.phases.map((other, i) => (
    <button
      key={i}
      type="button"
      aria-pressed={i === phaseAt}
      onClick={() => setPhaseIndex(i)}
      className={`h-7.5 flex-none cursor-pointer rounded-md border border-solid px-3 text-[13px] font-medium whitespace-nowrap ${
        i === phaseAt
          ? "border-ink bg-ink text-on-ink"
          : "border-edge-217 bg-surface text-ink"
      }`}
    >
      {i + 1} · {other.name}
    </button>
  ));
  const note = phase.note;
  const noteText = (
    <div
      className={`text-sm leading-normal ${note ? "text-ink" : "text-muted"}`}
    >
      {note || "Без описания"}
    </div>
  );

  if (isMobile) {
    return (
      <main className="flex flex-col gap-3 p-3 pb-26">
        <PlanSelect
          maps={maps}
          plans={doc.plans}
          value={plan.id}
          onChange={pickPlan}
          className="h-11 w-full rounded-lg border border-solid border-edge-213 bg-surface px-2.5 text-[15px] font-semibold"
        />
        <div className="font-jetbrains-mono text-[11.5px] text-muted">
          {map.name} · {planMeta}
        </div>
        {canvas}
        <div className="flex scrollbar-none gap-1.5 overflow-x-auto">
          {phaseTabs}
        </div>
        <section className="rounded-lg border border-solid border-line bg-surface px-3.5 py-3">
          <div className="mb-1.5 text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
            Задача фазы
          </div>
          {noteText}
        </section>
        <section className="rounded-lg border border-solid border-line bg-surface px-3.5 pt-1.5 pb-2.5">
          <PlayerList
            groups={groups}
            phase={phase}
            me={me}
            canDraw={false}
            placing={null}
            onPlacing={() => {}}
          />
          {groups.length === 0 && (
            <div className="py-2 text-sm text-muted">
              В плане пока нет отрядов
            </div>
          )}
        </section>
        {canEdit && (
          <div className="text-[12.5px] text-muted">
            Рисовать можно с компьютера
          </div>
        )}
        {toastNotice}
      </main>
    );
  }

  return (
    <div className="grid h-[calc(100vh-57px)] min-h-155 grid-cols-[minmax(0,1fr)_264px] grid-rows-[minmax(0,1fr)] min-[1180px]:grid-cols-[256px_minmax(0,1fr)_288px]">
      <aside className="hidden flex-col gap-5 overflow-auto border-r border-solid border-line-227 bg-surface px-3 pt-4 pb-6 min-[1180px]:flex">
        <div className="px-1 text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
          Карты и планы
        </div>
        {maps.map((option) => (
          <div key={option.id} data-map-group={option.name}>
            <div className="mb-2 flex items-center gap-2.5 px-1">
              <div className="relative h-10 w-14 flex-none overflow-hidden rounded-sm bg-[#17191e]">
                <Image
                  src={option.src}
                  alt=""
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold">{option.name}</div>
                <div className="font-jetbrains-mono text-[11.5px] text-muted">
                  {option.w}×{option.h}
                </div>
              </div>
              {canDraw && (
                <button
                  type="button"
                  title="Удалить карту"
                  aria-label={`Удалить карту ${option.name}`}
                  onClick={() => removeMap(option)}
                  className="ml-auto size-7 flex-none cursor-pointer rounded-md border-0 bg-transparent text-base text-muted hover:bg-hover hover:text-tone-red-55"
                >
                  ×
                </button>
              )}
            </div>
            <div className="flex flex-col gap-0.5">
              {doc.plans
                .filter((other) => other.map === option.id)
                .map((other) => (
                  <button
                    key={other.id}
                    type="button"
                    data-plan={other.name}
                    onClick={() => pickPlan(other.id)}
                    className={`flex min-h-8.5 w-full cursor-pointer items-center justify-between gap-2 rounded-md border-0 px-2.5 py-1.5 text-left text-[13.5px] hover:brightness-97 ${
                      other.id === plan.id
                        ? "bg-tone-lime-93 font-semibold"
                        : "bg-transparent font-medium"
                    }`}
                  >
                    <span className="min-w-0 truncate">{other.name}</span>
                    <span className="flex-none font-jetbrains-mono text-[11px] text-muted">
                      {other.phases.length} ф.
                    </span>
                  </button>
                ))}
              {canDraw && (
                <button
                  type="button"
                  data-add-plan={option.id}
                  onClick={() => addPlan(option.id)}
                  className="min-h-8 w-full cursor-pointer rounded-md border-0 bg-transparent px-2.5 text-left text-[13px] text-muted hover:bg-hover hover:text-ink"
                >
                  + Новый план
                </button>
              )}
            </div>
          </div>
        ))}
        {canDraw && (
          <MapUpload
            buttonClassName={`${TOOL_BUTTON} w-full`}
            onUploaded={handleUploaded}
          />
        )}
      </aside>

      <section className="flex min-w-0 flex-col bg-track">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 border-b border-solid border-line-227 bg-surface px-3 py-2">
          <div className="contents min-[1180px]:hidden">
            <PlanSelect
              maps={maps}
              plans={doc.plans}
              value={plan.id}
              onChange={pickPlan}
              className="h-8 max-w-60 rounded-md border border-solid border-edge-217 bg-surface px-1.5 text-[13px] font-medium"
            />
            {canDraw && (
              <select
                value=""
                aria-label="Новый план"
                onChange={(event) => {
                  if (event.target.value) {
                    addPlan(event.target.value);
                  }
                }}
                className="h-8 rounded-md border border-solid border-edge-217 bg-surface px-1.5 text-[13px]"
              >
                <option value="">+ Новый план</option>
                {maps.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            )}
            {canDraw && (
              <MapUpload
                buttonClassName={`${TOOL_BUTTON} px-2.5 whitespace-nowrap`}
                onUploaded={handleUploaded}
              />
            )}
          </div>
          {canDraw ? (
            <>
              <div className={SEGMENT_GROUP}>
                {TOOLS.map(({ id, label, key }) => (
                  <button
                    key={id}
                    type="button"
                    title={`${label} · ${key}`}
                    aria-pressed={tool === id}
                    onClick={() => {
                      setTool(id);
                      setPlacing(null);
                    }}
                    className={`h-7.5 cursor-pointer rounded-md border-0 px-2.5 text-[13px] font-medium whitespace-nowrap ${segment(tool === id)}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.25 px-0.5">
                {DRAW_COLORS.map(({ value, name }, i) => (
                  <button
                    key={name}
                    type="button"
                    title={name}
                    aria-label={name}
                    aria-pressed={color === i}
                    onClick={() => setColor(i)}
                    className={`size-6 cursor-pointer rounded-full border-2 border-solid p-0 shadow-[inset_0_0_0_1px_rgba(23,25,30,0.18)] ${color === i ? "border-ink" : "border-transparent"}`}
                    style={{ backgroundColor: value }}
                  />
                ))}
              </div>
              <div className={SEGMENT_GROUP}>
                {(
                  [
                    ["Самая тонкая линия", LINE_WIDTHS.fine, "h-px"],
                    ["Тонкая линия", LINE_WIDTHS.thin, "h-0.5"],
                    ["Толстая линия", LINE_WIDTHS.thick, "h-1.25"],
                  ] as const
                ).map(([title, value, size]) => (
                  <button
                    key={title}
                    type="button"
                    title={title}
                    aria-label={title}
                    aria-pressed={width === value}
                    onClick={() => setWidth(value)}
                    className={`grid h-7.5 w-8 cursor-pointer place-items-center rounded-md border-0 ${segment(width === value)}`}
                  >
                    <span className={`w-4 rounded-xs bg-ink ${size}`} />
                  </button>
                ))}
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  title="Отменить (Ctrl+Z)"
                  aria-label="Отменить"
                  disabled={!doc.past[plan.id]?.length}
                  onClick={() => travel("past")}
                  className={`${TOOL_BUTTON} w-8 text-[15px]`}
                >
                  ↶
                </button>
                <button
                  type="button"
                  title="Вернуть (Ctrl+Shift+Z)"
                  aria-label="Вернуть"
                  disabled={!doc.future[plan.id]?.length}
                  onClick={() => travel("future")}
                  className={`${TOOL_BUTTON} w-8 text-[15px]`}
                >
                  ↷
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!phase.items.length) return;
                    changePhase((current) => ({ ...current, items: [] }));
                    showToast("Рисунки фазы удалены · ↶ вернёт");
                  }}
                  className={`${TOOL_BUTTON} px-2.5`}
                >
                  Очистить фазу
                </button>
              </div>
            </>
          ) : (
            <span className="text-[13px] text-muted">
              Только просмотр — планы рисуют офицеры и выше
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-solid border-line-227 bg-alt-250 px-3 py-2">
          {phaseTabs}
          {canDraw && (
            <button
              type="button"
              onClick={() => {
                change((current) => ({
                  ...current,
                  phases: [
                    ...current.phases,
                    newPhase(
                      current.phases.length + 1,
                      current.phases[current.phases.length - 1].tokens,
                    ),
                  ],
                }));
                setPhaseIndex(plan.phases.length);
              }}
              className="h-7.5 flex-none cursor-pointer rounded-md border border-dashed border-dim-197 bg-transparent px-3 text-[13px] text-ink-soft hover:bg-surface"
            >
              + Фаза
            </button>
          )}
          <div className="flex-1" />
          <label className="flex flex-none cursor-pointer items-center gap-1.5 text-[12.5px] text-ink-soft">
            <input
              type="checkbox"
              checked={showPrevious}
              onChange={() => setShowPrevious(!showPrevious)}
              className="m-0 accent-ink"
            />
            прошлая фаза
          </label>
          <label className="flex flex-none cursor-pointer items-center gap-1.5 text-[12.5px] text-ink-soft">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={() => setShowLabels(!showLabels)}
              className="m-0 accent-ink"
            />
            подписи
          </label>
        </div>

        <div className="min-h-0 flex-1 p-4">
          {/* Measures the free space, however many rows the toolbar wraps to. */}
          <div
            data-map-area
            className="grid size-full place-items-center"
            style={{ containerType: "size" }}
          >
            <div
              style={{
                width: `min(100cqw, calc(100cqh * ${(map.w / map.h).toFixed(4)}))`,
              }}
            >
              {canvas}
            </div>
          </div>
        </div>
        <div className="flex justify-between gap-3 px-3.5 pb-2.5 font-jetbrains-mono text-[11.5px] text-muted">
          <span>
            {canDraw
              ? `${TOOL_HINTS[tool]} · V P R A M T E · Ctrl+Z`
              : "Только просмотр"}
          </span>
          <span>
            {map.name} · {map.w}×{map.h}
          </span>
        </div>
      </section>

      <aside className="flex flex-col overflow-auto border-l border-solid border-line-227 bg-surface">
        <div className={`${SECTION} py-4`}>
          <div className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
            План · {map.name}
          </div>
          {canDraw ? (
            <input
              value={plan.name}
              maxLength={80}
              aria-label="Название плана"
              onChange={(event) => {
                const name = event.target.value;
                change((current) => ({ ...current, name }), {
                  history: false,
                });
              }}
              className="mt-1.5 w-full border-0 border-b border-solid border-transparent bg-transparent py-1 text-[17px] font-semibold outline-none focus:border-ink"
            />
          ) : (
            <div className="mt-1.5 text-[17px] font-semibold">{plan.name}</div>
          )}
          <div className="mt-1 font-jetbrains-mono text-[11.5px] text-muted">
            {planMeta}
          </div>
        </div>

        <div className={SECTION}>
          <div className="mb-2 text-[12.5px] font-semibold">Отряды в плане</div>
          <div className="flex flex-wrap gap-1.5">
            {squads
              .map((squad, index) => ({ squad, index }))
              .filter(({ squad }) => canDraw || plan.squads.includes(squad.id))
              .map(({ squad, index }) => {
                const isOn = plan.squads.includes(squad.id);
                return (
                  <button
                    key={squad.id}
                    type="button"
                    data-squad-toggle={squad.name}
                    aria-pressed={isOn}
                    disabled={!canDraw}
                    onClick={() =>
                      change((current) => ({
                        ...current,
                        squads: isOn
                          ? current.squads.filter((id) => id !== squad.id)
                          : [...current.squads, squad.id],
                      }))
                    }
                    className={`inline-flex h-7 items-center gap-1.5 rounded-md border border-solid px-2.25 text-[12.5px] font-medium ${canDraw ? "cursor-pointer" : ""} ${
                      isOn
                        ? "border-ink bg-ink text-on-ink"
                        : "border-edge-217 bg-surface text-ink"
                    }`}
                  >
                    <span
                      className="size-2.25 rounded-full shadow-[0_0_0_1px_rgba(23,25,30,0.2)]"
                      style={{ backgroundColor: squadColor(index) }}
                    />
                    {squad.name}
                    <span
                      className={`font-jetbrains-mono text-[11px] ${isOn ? "text-on-ink/60" : "text-muted"}`}
                    >
                      {squad.players.length}/{squad.size}
                    </span>
                  </button>
                );
              })}
          </div>
        </div>

        <div className={SECTION}>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-[12.5px] font-semibold">Расстановка</span>
            <span className="font-jetbrains-mono text-[11.5px] text-muted">
              {players.length
                ? `${placedCount} из ${players.length} на карте`
                : ""}
            </span>
          </div>
          <PlayerList
            groups={groups}
            phase={phase}
            me={me}
            canDraw={canDraw}
            placing={placing}
            onPlacing={(name) => {
              setPlacing(name);
              setTool("select");
            }}
          />
          {groups.length === 0 && (
            <div className="mt-1.5 text-[13px] leading-[1.45] text-muted">
              {canDraw
                ? "Выберите отряды выше — их игроки появятся здесь."
                : "В плане пока нет отрядов."}
            </div>
          )}
          {canDraw && (
            <div className="mt-2.5 text-[12px] leading-[1.45] text-dim-163">
              Перетащите отряд или игрока на карту, либо кликните по нему, затем
              по карте. Ластик убирает их с карты.
            </div>
          )}
        </div>

        {canDraw && (
          <div className={SECTION}>
            <div className="mb-2 text-[12.5px] font-semibold">Метки</div>
            <div className="mb-2 text-[12px] leading-[1.45] text-dim-163">
              Лагерь и антенна ставятся цветом, выбранным сверху.
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {MARKERS.map(({ id, label }) => {
                const isOn = tool === "marker" && markerType === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={isOn}
                    onClick={() => {
                      setTool("marker");
                      setMarkerType(id);
                      setPlacing(null);
                    }}
                    className={`flex h-8.5 cursor-pointer items-center gap-2 rounded-md border border-solid px-2.5 text-[13px] ${
                      isOn
                        ? "border-ink bg-tone-lime-96"
                        : "border-line-227 bg-surface"
                    }`}
                  >
                    {id === "camp" || id === "antenna" ? (
                      <ColoredMarkerIcon
                        type={id}
                        color={DRAW_COLORS[color].value}
                      />
                    ) : (
                      <span
                        className={`size-3.5 flex-none ${MARKER_ICONS[id]}`}
                      />
                    )}
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 border-b border-solid border-line-soft px-4 py-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12.5px] font-semibold">
              Фаза {phaseAt + 1} из {plan.phases.length}
            </span>
            {canDraw && plan.phases.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  change((current) => ({
                    ...current,
                    phases: current.phases.filter((_, i) => i !== phaseAt),
                  }));
                  setPhaseIndex(Math.max(0, phaseAt - 1));
                  showToast("Фаза удалена · ↶ вернёт");
                }}
                className="h-6.5 cursor-pointer rounded-[5px] border-0 bg-transparent px-2 text-[12px] text-dim-163 hover:bg-hover hover:text-tone-red-55"
              >
                Удалить фазу
              </button>
            )}
          </div>
          {canDraw ? (
            <>
              <input
                value={phase.name}
                maxLength={80}
                placeholder="Название фазы"
                aria-label="Название фазы"
                onChange={(event) => {
                  const name = event.target.value;
                  changePhase((current) => ({ ...current, name }), {
                    history: false,
                  });
                }}
                className={`${FIELD} h-8.5`}
              />
              <textarea
                value={note}
                maxLength={1000}
                rows={4}
                placeholder="Задача фазы, тайминги, кто за что отвечает"
                aria-label="Задача фазы"
                onChange={(event) => {
                  const value = event.target.value;
                  changePhase((current) => ({ ...current, note: value }), {
                    history: false,
                  });
                }}
                className={`${FIELD} resize-y py-2 leading-[1.45]`}
              />
            </>
          ) : (
            noteText
          )}
        </div>

        {canDraw && (
          <div className="flex flex-col gap-2 px-4 py-3.5">
            <button
              type="button"
              onClick={removePlan}
              className="h-8 w-full cursor-pointer rounded-md border border-solid border-edge-217 bg-surface text-[13px] text-tone-red-55 hover:bg-hover"
            >
              Удалить план
            </button>
            <button
              type="button"
              onClick={() => removeMap(map)}
              className="h-8 w-full cursor-pointer rounded-md border border-solid border-edge-217 bg-surface text-[13px] text-tone-red-55 hover:bg-hover"
            >
              Удалить карту
            </button>
          </div>
        )}
      </aside>
      {saveNotice}
      {toastNotice}
    </div>
  );
}
