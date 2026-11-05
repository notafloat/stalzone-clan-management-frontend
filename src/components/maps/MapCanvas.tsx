"use client";

import Image from "next/image";
import {
  useRef,
  useState,
  type DragEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import {
  DRAW_COLORS,
  isColoredMarker,
  MAX_STROKE_POINTS,
  newMapId,
  type GameMap,
  type MapItem,
  type MarkerType,
  type Phase,
  type Point,
  type StrokeItem,
} from "@/lib/maps/maps";

export type Tool =
  "select" | "pen" | "route" | "arrow" | "marker" | "text" | "eraser";

export type MapPlayer = {
  name: string;
  number: string;
  color: string;
  /** Shown instead of `name` on the map, for a squad's icon. */
  label?: string;
  isSquad?: boolean;
};

type Dragging = {
  target: { kind: "token"; name: string } | { kind: "item"; id: string };
  dx: number;
  dy: number;
};

const OUTLINE = "rgba(10,12,16,.55)";
const MIN_STEP = 3;
const MIN_ARROW_LENGTH = 10;
const CURSORS: Record<Tool, string> = {
  select: "default",
  pen: "crosshair",
  route: "crosshair",
  arrow: "crosshair",
  marker: "copy",
  text: "text",
  eraser: "cell",
};

const fixed = (value: number) => value.toFixed(1);
const round = (value: number) => Math.round(value * 10) / 10;
const pointList = (points: Point[]) =>
  points.map(([x, y]) => `${fixed(x)},${fixed(y)}`).join(" ");

function strokePath(points: Point[]) {
  if (points.length < 3) {
    return `M${points.map(([x, y]) => `${fixed(x)} ${fixed(y)}`).join(" L")}`;
  }
  let path = `M${fixed(points[0][0])} ${fixed(points[0][1])}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [x, y] = points[i];
    const [nextX, nextY] = points[i + 1];
    path += ` Q${fixed(x)} ${fixed(y)} ${fixed((x + nextX) / 2)} ${fixed((y + nextY) / 2)}`;
  }
  const [lastX, lastY] = points[points.length - 1];
  return `${path} L${fixed(lastX)} ${fixed(lastY)}`;
}

function Stroke({ item, scale }: { item: StrokeItem; scale: number }) {
  const color = DRAW_COLORS[item.color].value;
  const width = item.width * scale;
  const dash =
    item.kind === "route"
      ? `${fixed(width * 2.4)} ${fixed(width * 1.9)}`
      : undefined;

  let points = item.points;
  let head: string | null = null;
  if (item.kind !== "pen" && points.length > 1) {
    const tip = points[points.length - 1];
    const base = points[Math.max(0, points.length - 4)];
    const from = base === tip ? points[0] : base;
    const dx = tip[0] - from[0];
    const dy = tip[1] - from[1];
    const length = Math.hypot(dx, dy) || 1;
    const ux = dx / length;
    const uy = dy / length;
    const headLength = (10 + item.width * 1.7) * scale;
    const halfWidth = headLength * 0.62;
    const baseX = tip[0] - ux * headLength;
    const baseY = tip[1] - uy * headLength;
    head = pointList([
      tip,
      [baseX - uy * halfWidth, baseY + ux * halfWidth],
      [baseX + uy * halfWidth, baseY - ux * halfWidth],
    ]);
    points = [
      ...points.slice(0, -1),
      [tip[0] - ux * headLength * 0.55, tip[1] - uy * headLength * 0.55],
    ];
  }

  const path = strokePath(points);
  const line = {
    d: path,
    fill: "none",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeDasharray: dash,
  };
  return (
    <>
      <path
        {...line}
        stroke={OUTLINE}
        strokeWidth={width + (item.width <= 2 ? 1.5 : 3) * scale}
      />
      <path {...line} stroke={color} strokeWidth={width} />
      {head && (
        <>
          <polygon
            points={head}
            fill={OUTLINE}
            stroke={OUTLINE}
            strokeWidth={3 * scale}
            strokeLinejoin="round"
          />
          <polygon points={head} fill={color} />
        </>
      )}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={18 * scale}
        style={{ pointerEvents: "stroke" }}
      />
    </>
  );
}

function Marker({
  type,
  x,
  y,
  scale,
  color,
}: {
  type: MarkerType;
  x: number;
  y: number;
  scale: number;
  color?: number;
}) {
  const r = 11 * scale;
  const amber = "oklch(0.84 0.16 75)";
  if (type === "camp" || type === "antenna") {
    const paint = DRAW_COLORS[color ?? 0].value;
    const u = 13 * scale;
    const line = {
      fill: "none",
      stroke: paint,
      strokeWidth: 2 * scale,
      strokeLinecap: "round" as const,
      strokeLinejoin: "round" as const,
    };
    return (
      <>
        <circle
          cx={x}
          cy={y}
          r={u * 1.15}
          fill="#17191e"
          stroke={paint}
          strokeWidth={2.5 * scale}
        />
        {type === "camp" ? (
          <>
            <polygon
              points={pointList([
                [x, y - u * 0.65],
                [x + u * 0.75, y + u * 0.55],
                [x - u * 0.75, y + u * 0.55],
              ])}
              {...line}
            />
            <polygon
              points={pointList([
                [x, y - u * 0.05],
                [x + u * 0.28, y + u * 0.55],
                [x - u * 0.28, y + u * 0.55],
              ])}
              fill={paint}
            />
          </>
        ) : (
          <>
            <path
              d={`M${fixed(x)} ${fixed(y - u * 0.2)} L${fixed(x - u * 0.38)} ${fixed(y + u * 0.68)} M${fixed(x)} ${fixed(y - u * 0.2)} L${fixed(x + u * 0.38)} ${fixed(y + u * 0.68)} M${fixed(x - u * 0.22)} ${fixed(y + u * 0.3)} L${fixed(x + u * 0.22)} ${fixed(y + u * 0.3)}`}
              {...line}
            />
            <circle cx={x} cy={y - u * 0.2} r={u * 0.12} fill={paint} />
            <path
              d={`M${fixed(x - u * 0.42)} ${fixed(y - u * 0.55)} A${fixed(u * 0.55)} ${fixed(u * 0.55)} 0 0 0 ${fixed(x - u * 0.42)} ${fixed(y + u * 0.15)} M${fixed(x + u * 0.42)} ${fixed(y - u * 0.55)} A${fixed(u * 0.55)} ${fixed(u * 0.55)} 0 0 1 ${fixed(x + u * 0.42)} ${fixed(y + u * 0.15)}`}
              {...line}
            />
          </>
        )}
      </>
    );
  }
  if (type === "enemy") {
    return (
      <polygon
        points={pointList([
          [x, y - r],
          [x + r * 0.95, y + r * 0.75],
          [x - r * 0.95, y + r * 0.75],
        ])}
        fill="oklch(0.62 0.22 25)"
        stroke="#fff"
        strokeWidth={2 * scale}
        strokeLinejoin="round"
      />
    );
  }
  if (type === "ally") {
    return (
      <circle
        cx={x}
        cy={y}
        r={r * 0.8}
        fill="oklch(0.68 0.14 235)"
        stroke="#fff"
        strokeWidth={2 * scale}
      />
    );
  }
  if (type === "target") {
    return (
      <>
        <circle
          cx={x}
          cy={y}
          r={r}
          fill="rgba(10,12,16,.35)"
          stroke={amber}
          strokeWidth={3 * scale}
        />
        <circle cx={x} cy={y} r={r * 0.32} fill={amber} />
      </>
    );
  }
  return (
    <>
      <polygon
        points={pointList([
          [x, y - r * 1.15],
          [x + r * 1.15, y],
          [x, y + r * 1.15],
          [x - r * 1.15, y],
        ])}
        fill={amber}
        stroke="#17191e"
        strokeWidth={1.5 * scale}
      />
      <text
        x={x}
        y={y + r * 0.45}
        textAnchor="middle"
        fontSize={r * 1.25}
        fontWeight={700}
        fill="#17191e"
        className="pointer-events-none font-golos"
      >
        !
      </text>
    </>
  );
}

export function MapCanvas({
  map,
  phase,
  previous,
  players,
  showLabels,
  canDraw,
  tool,
  color,
  width,
  markerType,
  placing,
  banner,
  onPlace,
  onAddItem,
  onErase,
  onRemoveToken,
  onBeginDrag,
  onDrag,
  onEndDrag,
}: {
  map: GameMap;
  phase: Phase;
  previous: Phase | null;
  players: MapPlayer[];
  showLabels: boolean;
  canDraw: boolean;
  tool: Tool;
  color: number;
  width: number;
  markerType: MarkerType;
  placing: string | null;
  banner: string | null;
  onPlace: (name: string, x: number, y: number) => void;
  onAddItem: (item: MapItem) => void;
  onErase: (id: string) => void;
  onRemoveToken: (name: string) => void;
  onBeginDrag: () => void;
  onDrag: (target: Dragging["target"], x: number, y: number) => void;
  onEndDrag: () => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef<Dragging | null>(null);
  const isErasing = useRef(false);
  const cancelText = useRef(false);
  const [draft, setDraft] = useState<StrokeItem | null>(null);
  const [textDraft, setTextDraft] = useState<{
    x: number;
    y: number;
    value: string;
  } | null>(null);
  const scale = map.w / 800;

  function toMapPoint(event: { clientX: number; clientY: number }): Point {
    const rect = svgRef.current!.getBoundingClientRect();
    return [
      Math.max(
        0,
        Math.min(map.w, ((event.clientX - rect.left) / rect.width) * map.w),
      ),
      Math.max(
        0,
        Math.min(map.h, ((event.clientY - rect.top) / rect.height) * map.h),
      ),
    ];
  }

  function handlePointerDown(event: PointerEvent<SVGSVGElement>) {
    if (!canDraw || event.button > 0) return;
    const [x, y] = toMapPoint(event);
    if (placing) {
      onPlace(placing, x, y);
      return;
    }
    if (textDraft) {
      event.preventDefault();
      (document.activeElement as HTMLElement | null)?.blur();
      return;
    }
    if (tool === "pen" || tool === "route" || tool === "arrow") {
      event.currentTarget.setPointerCapture(event.pointerId);
      setDraft({
        id: newMapId("i"),
        kind: tool,
        color,
        width,
        points:
          tool === "arrow"
            ? [
                [x, y],
                [x, y],
              ]
            : [[x, y]],
      });
    } else if (tool === "marker") {
      onAddItem({
        id: newMapId("i"),
        kind: "marker",
        type: markerType,
        x: Math.round(x),
        y: Math.round(y),
        ...(isColoredMarker(markerType) ? { color } : {}),
      });
    } else if (tool === "text") {
      event.preventDefault();
      setTextDraft({ x, y, value: "" });
    } else if (tool === "eraser") {
      isErasing.current = true;
    }
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    if (!canDraw) return;
    const [x, y] = toMapPoint(event);
    const drag = dragging.current;
    if (drag) {
      onDrag(
        drag.target,
        Math.max(0, Math.min(map.w, Math.round(x - drag.dx))),
        Math.max(0, Math.min(map.h, Math.round(y - drag.dy))),
      );
      return;
    }
    setDraft((current) => {
      if (!current) return current;
      if (current.kind === "arrow") {
        return { ...current, points: [current.points[0], [x, y]] };
      }
      const [lastX, lastY] = current.points[current.points.length - 1];
      if (
        Math.hypot(x - lastX, y - lastY) < MIN_STEP ||
        current.points.length >= MAX_STROKE_POINTS
      ) {
        return current;
      }
      return { ...current, points: [...current.points, [x, y]] };
    });
  }

  function handlePointerUp() {
    if (draft) {
      const { points, kind } = draft;
      const first = points[0];
      const last = points[points.length - 1];
      const length = Math.hypot(last[0] - first[0], last[1] - first[1]);
      const isLongEnough =
        kind === "arrow" ? length > MIN_ARROW_LENGTH : points.length > 2;
      if (isLongEnough) {
        onAddItem({
          ...draft,
          points: points.map(([x, y]) => [round(x), round(y)]),
        });
      }
      setDraft(null);
    }
    if (dragging.current) {
      dragging.current = null;
      onEndDrag();
    }
    isErasing.current = false;
  }

  function startDrag(
    event: PointerEvent,
    target: Dragging["target"],
    x: number,
    y: number,
  ) {
    event.stopPropagation();
    onBeginDrag();
    const [pointX, pointY] = toMapPoint(event);
    dragging.current = { target, dx: pointX - x, dy: pointY - y };
    svgRef.current?.setPointerCapture(event.pointerId);
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    const name = event.dataTransfer.getData("text/plain");
    if (!canDraw || !players.some((player) => player.name === name)) return;
    const [x, y] = toMapPoint(event);
    onPlace(name, x, y);
  }

  function finishText() {
    const current = textDraft;
    setTextDraft(null);
    if (cancelText.current) {
      cancelText.current = false;
      return;
    }
    const text = current?.value.trim();
    if (current && text) {
      onAddItem({
        id: newMapId("i"),
        kind: "text",
        color,
        x: Math.round(current.x),
        y: Math.round(current.y),
        text,
      });
    }
  }

  function itemEvents(item: MapItem) {
    if (canDraw && tool === "eraser") {
      return {
        "data-item": item.kind,
        onPointerDown: (event: PointerEvent) => {
          event.stopPropagation();
          onErase(item.id);
        },
        onPointerEnter: () => {
          if (isErasing.current) onErase(item.id);
        },
        style: { cursor: "pointer" },
      };
    }
    if (
      canDraw &&
      tool === "select" &&
      !placing &&
      (item.kind === "marker" || item.kind === "text")
    ) {
      return {
        "data-item": item.kind,
        onPointerDown: (event: PointerEvent) =>
          startDrag(event, { kind: "item", id: item.id }, item.x, item.y),
        style: { cursor: "move" },
      };
    }
    return {
      "data-item": item.kind,
      style: { pointerEvents: "none" as const },
    };
  }

  function renderItem(item: MapItem, isGhost: boolean): ReactNode {
    const events = isGhost
      ? { style: { pointerEvents: "none" as const } }
      : itemEvents(item);
    const opacity = isGhost ? 0.3 : 1;
    if (item.kind === "marker") {
      return (
        <g key={item.id} opacity={opacity} {...events}>
          <Marker
            type={item.type}
            x={item.x}
            y={item.y}
            scale={scale}
            color={item.color}
          />
        </g>
      );
    }
    if (item.kind === "text") {
      return (
        <text
          key={item.id}
          x={item.x}
          y={item.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={15 * scale}
          fontWeight={600}
          fill={DRAW_COLORS[item.color].value}
          stroke="rgba(10,12,16,.78)"
          strokeWidth={4 * scale}
          strokeLinejoin="round"
          opacity={opacity}
          className="font-golos select-none"
          {...events}
          style={{ ...events.style, paintOrder: "stroke" }}
        >
          {item.text}
        </text>
      );
    }
    return (
      <g key={item.id} opacity={opacity} {...events}>
        <Stroke item={item} scale={scale} />
      </g>
    );
  }

  function renderToken(player: MapPlayer, isGhost: boolean, phaseOf: Phase) {
    const position = phaseOf.tokens[player.name];
    const r = 11 * scale;
    const isLive = !isGhost && canDraw && tool === "select" && !placing;
    const isErasable = !isGhost && canDraw && tool === "eraser";
    const size = r * 2.5;
    return (
      <g
        key={`${isGhost ? "ghost" : "token"}-${player.name}`}
        data-token={isGhost ? undefined : player.name}
        opacity={isGhost ? 0.35 : 1}
        onPointerDown={
          isLive
            ? (event) =>
                startDrag(
                  event,
                  { kind: "token", name: player.name },
                  position.x,
                  position.y,
                )
            : isErasable
              ? (event) => {
                  event.stopPropagation();
                  onRemoveToken(player.name);
                }
              : undefined
        }
        onPointerEnter={
          isErasable
            ? () => {
                if (isErasing.current) onRemoveToken(player.name);
              }
            : undefined
        }
        style={{
          cursor: isLive ? "grab" : isErasable ? "pointer" : "default",
          pointerEvents: isLive || isErasable ? "auto" : "none",
        }}
      >
        {player.isSquad ? (
          <rect
            x={position.x - size / 2}
            y={position.y - size / 2}
            width={size}
            height={size}
            rx={6 * scale}
            fill="#17191e"
            stroke={player.color}
            strokeWidth={3.5 * scale}
          />
        ) : (
          <circle
            cx={position.x}
            cy={position.y}
            r={r}
            fill="#17191e"
            stroke={player.color}
            strokeWidth={3 * scale}
          />
        )}
        <text
          x={position.x}
          y={position.y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={(player.isSquad ? 13 : 11) * scale}
          fontWeight={700}
          fill="#fff"
          className="pointer-events-none font-jetbrains-mono"
        >
          {player.number}
        </text>
        {showLabels && !isGhost && (
          <text
            x={position.x}
            y={position.y + (player.isSquad ? size / 2 : r) + 11 * scale}
            textAnchor="middle"
            fontSize={10.5 * scale}
            fontWeight={600}
            fill="#fff"
            stroke="rgba(10,12,16,.82)"
            strokeWidth={3 * scale}
            strokeLinejoin="round"
            className="pointer-events-none font-golos"
            style={{ paintOrder: "stroke" }}
          >
            {player.label ?? player.name}
          </text>
        )}
      </g>
    );
  }

  return (
    <div
      data-map-stage
      onDragOver={(event) => {
        if (canDraw) event.preventDefault();
      }}
      onDrop={handleDrop}
      className="relative overflow-hidden rounded-sm bg-[#17191e] shadow-[0_1px_3px_rgba(23,25,30,0.25)]"
      style={{ aspectRatio: `${map.w} / ${map.h}` }}
    >
      <Image
        src={map.src}
        alt={map.name}
        fill
        unoptimized
        draggable={false}
        className="pointer-events-none select-none"
      />
      <svg
        ref={svgRef}
        viewBox={`0 0 ${map.w} ${map.h}`}
        preserveAspectRatio="none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="absolute inset-0 block size-full"
        style={{
          touchAction: canDraw ? "none" : "auto",
          cursor: canDraw ? (placing ? "copy" : CURSORS[tool]) : "default",
        }}
      >
        {previous && (
          <g data-ghost>
            {previous.items.map((item) => renderItem(item, true))}
            {players
              .filter(({ name }) => previous.tokens[name])
              .map((player) => renderToken(player, true, previous))}
          </g>
        )}
        <g>{phase.items.map((item) => renderItem(item, false))}</g>
        <g>
          {players
            .filter(({ name }) => phase.tokens[name])
            .map((player) => renderToken(player, false, phase))}
        </g>
        {draft && renderItem(draft, false)}
      </svg>
      {textDraft && (
        <input
          autoFocus
          value={textDraft.value}
          maxLength={80}
          placeholder="Текст и Enter"
          aria-label="Текст на карте"
          onChange={(event) =>
            setTextDraft({ ...textDraft, value: event.target.value })
          }
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
            } else if (event.key === "Escape") {
              cancelText.current = true;
              event.currentTarget.blur();
            }
          }}
          onBlur={finishText}
          className="absolute z-4 h-8 w-47.5 -translate-x-1/2 -translate-y-1/2 rounded-md border-2 border-solid border-[oklch(0.88_0.19_125)] bg-[rgba(23,25,30,0.92)] px-2.5 text-sm font-semibold text-white outline-none"
          style={{
            left: `${(textDraft.x / map.w) * 100}%`,
            top: `${(textDraft.y / map.h) * 100}%`,
          }}
        />
      )}
      {banner && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-3 max-w-[calc(100%-24px)] -translate-x-1/2 truncate rounded-md bg-[rgba(23,25,30,0.86)] px-3 py-1.75 text-[12.5px] text-white">
          {banner}
        </div>
      )}
    </div>
  );
}
