"use client";

import Link from "next/link";
import { useEffect } from "react";
import {
  ABSENCE_MARK_STYLES,
  cycleStage,
  shortDate,
  STAGE_STYLES,
  summarize,
  toggleAbsent,
  weekdayOf,
  withReason,
  withWhy,
  type KvMark,
  type KvWar,
} from "@/lib/kv/kv";
import type { KvPlayer } from "@/lib/kv/store";
import { playerPath } from "@/lib/members/members";
import type { MarkUpdates } from "./KvView";

const WEEKDAYS = [
  "понедельник",
  "вторник",
  "среда",
  "четверг",
  "пятница",
  "суббота",
  "воскресенье",
];
const STAGES = [0, 1, 2];
const GRID = "grid-cols-[minmax(180px,1fr)_repeat(3,96px)_minmax(220px,1fr)]";
const TOOL_BUTTON =
  "h-8 cursor-pointer rounded-md border border-solid border-edge-217 bg-surface px-3 text-[13px] font-medium hover:bg-hover disabled:cursor-default disabled:opacity-45";
const FIELD =
  "w-full rounded-md border border-solid border-edge-217 bg-surface outline-none focus:border-ink";

type RowProps = {
  player: KvPlayer;
  mark: KvMark;
  isMe: boolean;
  isFocused: boolean;
  canEdit: boolean;
  onChange: (mark: KvMark) => void;
};

function rowBackground(isFocused: boolean, isMe: boolean) {
  if (isFocused) return "var(--tone-lime-965)";
  return isMe ? "var(--tone-lime-975)" : "var(--surface)";
}

function StageButton({
  mark,
  stage,
  canEdit,
  isLarge,
  onChange,
}: {
  mark: KvMark;
  stage: number;
  canEdit: boolean;
  isLarge?: boolean;
  onChange: (mark: KvMark) => void;
}) {
  const value = mark.stages[stage];
  const style = value ? STAGE_STYLES[value] : null;
  return (
    <button
      type="button"
      disabled={!canEdit}
      data-stage={stage}
      onClick={() => onChange(cycleStage(mark, stage))}
      className={`flex flex-col items-center justify-center gap-0.5 rounded-md border p-0 font-semibold ${
        isLarge ? "h-12.5 text-[14.5px]" : "h-8 w-21 text-[13px]"
      } ${canEdit ? "cursor-pointer" : "cursor-default"} ${
        value
          ? "border-solid border-transparent"
          : "border-dashed border-edge-213"
      }`}
      style={{
        backgroundColor: style?.soft ?? "var(--surface)",
        color: style?.text ?? "var(--dim-163)",
      }}
    >
      {isLarge && (
        <span className="text-[10.5px] tracking-[0.08em] uppercase opacity-75">
          Этап {stage + 1}
        </span>
      )}
      <span>{style?.label ?? "—"}</span>
    </button>
  );
}

function AbsentButton({
  mark,
  canEdit,
  isLarge,
  onChange,
}: {
  mark: KvMark;
  canEdit: boolean;
  isLarge?: boolean;
  onChange: (mark: KvMark) => void;
}) {
  const kind = summarize(mark).kind === "reason" ? "reason" : "no";
  const style = ABSENCE_MARK_STYLES[kind];
  return (
    <button
      type="button"
      disabled={!canEdit}
      title={canEdit ? "Нажмите, чтобы снять отметку" : undefined}
      onClick={() => onChange(toggleAbsent(mark))}
      className={`w-full rounded-md border-0 font-semibold ${
        isLarge ? "h-12 text-[14.5px]" : "h-8 text-[13px]"
      } ${canEdit ? "cursor-pointer" : "cursor-default"}`}
      style={{ backgroundColor: style.soft, color: style.text }}
    >
      Не пришёл · {kind === "reason" ? "по причине" : "без причины"}
    </button>
  );
}

function RowExtras({
  mark,
  canEdit,
  name,
  isLarge,
  onChange,
}: {
  mark: KvMark;
  canEdit: boolean;
  name: string;
  isLarge?: boolean;
  onChange: (mark: KvMark) => void;
}) {
  const isAbsent = Boolean(mark.absence);
  const hasLeft = !isAbsent && mark.stages.includes("left");
  const text = isAbsent ? mark.reason : mark.why;

  if (!canEdit) {
    return text ? (
      <span className="text-[13px] text-ink-soft">{text}</span>
    ) : null;
  }
  if (isAbsent || hasLeft) {
    return (
      <input
        value={text}
        maxLength={200}
        aria-label={`${isAbsent ? "Причина" : "Почему вышел"}: ${name}`}
        placeholder={
          isAbsent ? "причина (пусто — без причины)" : "почему вышел"
        }
        onChange={(event) =>
          onChange(
            isAbsent
              ? withReason(mark, event.target.value)
              : withWhy(mark, event.target.value),
          )
        }
        className={`${FIELD} ${isLarge ? "h-11 px-3 text-[15px]" : "h-8 px-2.5 text-[13px]"}`}
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => onChange(toggleAbsent(mark))}
      className="h-7.5 cursor-pointer rounded-[5px] border-0 bg-transparent px-2 text-[13px] text-muted hover:bg-hover hover:text-ink"
    >
      Не пришёл
    </button>
  );
}

function DesktopRow({
  player,
  mark,
  isMe,
  isFocused,
  canEdit,
  onChange,
}: RowProps) {
  return (
    <div
      id={`kv-${player.uuid}`}
      data-player={player.name}
      className={`grid min-h-11.5 items-center border-t border-solid border-line-240 ${GRID}`}
      style={{ backgroundColor: rowBackground(isFocused, isMe) }}
    >
      <div className="min-w-0 truncate px-4">
        <Link
          href={playerPath(player.name)}
          className={`text-sm text-ink no-underline ${isMe ? "font-bold" : "font-semibold"}`}
        >
          {player.name}
        </Link>
      </div>
      {mark.absence ? (
        <div className="col-span-3 px-1.5">
          <AbsentButton mark={mark} canEdit={canEdit} onChange={onChange} />
        </div>
      ) : (
        STAGES.map((stage) => (
          <div key={stage} className="grid place-items-center">
            <StageButton
              mark={mark}
              stage={stage}
              canEdit={canEdit}
              onChange={onChange}
            />
          </div>
        ))
      )}
      <div className="min-w-0 px-3.5">
        <RowExtras
          mark={mark}
          canEdit={canEdit}
          name={player.name}
          onChange={onChange}
        />
      </div>
    </div>
  );
}

function MobileRow({
  player,
  mark,
  isMe,
  isFocused,
  canEdit,
  onChange,
}: RowProps) {
  return (
    <div
      id={`kv-${player.uuid}`}
      data-player={player.name}
      className="flex flex-col gap-2 rounded-lg border border-solid border-line p-3"
      style={{ backgroundColor: rowBackground(isFocused, isMe) }}
    >
      <span
        className={`min-w-0 truncate text-[15px] ${isMe ? "font-bold" : "font-semibold"}`}
      >
        {player.name}
      </span>
      {mark.absence ? (
        <AbsentButton
          mark={mark}
          canEdit={canEdit}
          isLarge
          onChange={onChange}
        />
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {STAGES.map((stage) => (
            <StageButton
              key={stage}
              mark={mark}
              stage={stage}
              canEdit={canEdit}
              isLarge
              onChange={onChange}
            />
          ))}
        </div>
      )}
      <RowExtras
        mark={mark}
        canEdit={canEdit}
        name={player.name}
        isLarge
        onChange={onChange}
      />
    </div>
  );
}

export function KvWarDetail({
  date,
  wars,
  marks,
  players,
  planOrder,
  me,
  canEdit,
  isMandatory,
  isConfirmed,
  focusUuid,
  isBusy,
  isMobile,
  onBack,
  onNavigate,
  onUpdate,
  onConfirm,
  onDelete,
  onMessage,
}: {
  date: string;
  wars: KvWar[];
  marks: MarkUpdates;
  players: KvPlayer[];
  planOrder: string[];
  me: string;
  canEdit: boolean;
  isMandatory: boolean;
  isConfirmed: boolean;
  focusUuid?: string;
  isBusy: boolean;
  isMobile: boolean;
  onBack: () => void;
  onNavigate: (date: string) => void;
  onUpdate: (updates: MarkUpdates) => void;
  onConfirm: () => void;
  onDelete: () => void;
  onMessage: (message: string | undefined) => void;
}) {
  useEffect(() => {
    if (focusUuid) {
      document
        .getElementById(`kv-${focusUuid}`)
        ?.scrollIntoView({ block: "center" });
    } else {
      window.scrollTo(0, 0);
    }
  }, [date, focusUuid]);

  const index = wars.findIndex((war) => war.date === date);
  const previous = wars[index - 1]?.date;
  const next = wars[index + 1]?.date;
  const inWar = players.filter(({ uuid }) => marks[uuid]);

  const plans = [
    ...new Set(
      inWar
        .map(({ uuid }) => marks[uuid].plan)
        .sort((a, b) => {
          const order = (plan: string) => {
            if (!plan) return Number.MAX_SAFE_INTEGER;
            const at = planOrder.indexOf(plan);
            return at === -1 ? Number.MAX_SAFE_INTEGER - 1 : at;
          };
          return order(a) - order(b);
        }),
    ),
  ];

  let came = 0;
  let unmarked = 0;
  const wasAtStage = [0, 0, 0];
  for (const { uuid } of inWar) {
    const mark = marks[uuid];
    if (summarize(mark).kind === "came") came++;
    if (!mark.absence) {
      if (mark.stages.some((stage) => !stage)) unmarked++;
      mark.stages.forEach((stage, i) => {
        if (stage === "in" || stage === "left") wasAtStage[i]++;
      });
    }
  }

  const subtitle = [
    isMandatory ? "Обязательная" : "По желанию, пропуски не считаются",
    `пришли ${came} из ${inWar.length}`,
    ...(isConfirmed
      ? ["подтверждена"]
      : [
          unmarked ? `без отметки ${unmarked}` : "всё отмечено",
          "не подтверждена",
        ]),
  ].join(" · ");

  const cycleHint = "Нажмите на этап: Был → Вышел → Не был.";
  const hint = !canEdit
    ? "Отметки ставят офицеры."
    : isConfirmed
      ? cycleHint
      : `${cycleHint} При подтверждении всем без отметки поставится «Не был».`;

  function markAllIn() {
    const updates: MarkUpdates = {};
    for (const { uuid } of inWar) {
      const mark = marks[uuid];
      if (mark.plan && !mark.absence && mark.stages.some((stage) => !stage)) {
        updates[uuid] = {
          ...mark,
          stages: mark.stages.map((stage) => stage ?? "in"),
        };
      }
    }
    const count = Object.keys(updates).length;
    if (count) onUpdate(updates);
    onMessage(
      count
        ? `«Был» поставлено игрокам из состава: ${count}`
        : "У всех из состава этапы уже отмечены",
    );
  }

  const navButton =
    "h-8 w-8.5 cursor-pointer rounded-md border border-solid border-edge-217 bg-surface p-0 text-sm text-ink-soft hover:bg-hover disabled:cursor-default disabled:opacity-35";

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-solid border-line pb-4">
        <div className="min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="h-6 cursor-pointer border-0 bg-transparent p-0 text-[11px] font-semibold tracking-[0.14em] text-muted uppercase hover:text-ink"
          >
            ← Активность на КВ
          </button>
          <h1 className="mt-1 text-[clamp(22px,3vw,28px)] leading-[1.15] font-semibold tracking-[-0.01em]">
            КВ · {WEEKDAYS[weekdayOf(date)]}, {shortDate(date)}
          </h1>
          <div className="mt-1.5 text-[13.5px] text-ink-soft">{subtitle}</div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            title="Предыдущая"
            disabled={!previous}
            onClick={() => previous && onNavigate(previous)}
            className={navButton}
          >
            ←
          </button>
          <button
            type="button"
            title="Следующая"
            disabled={!next}
            onClick={() => next && onNavigate(next)}
            className={navButton}
          >
            →
          </button>
          {canEdit && !isConfirmed && (
            <button
              type="button"
              disabled={isBusy}
              onClick={onConfirm}
              className="h-8 cursor-pointer rounded-md border border-solid border-ink bg-ink px-3.5 text-[13px] font-semibold text-on-ink hover:bg-ink-strong disabled:opacity-50"
            >
              Подтвердить явку
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-[13px] leading-[1.45] text-muted">{hint}</span>
        <div className="flex-1" />
        {canEdit && (
          <>
            <button type="button" onClick={markAllIn} className={TOOL_BUTTON}>
              Все из состава были
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={onDelete}
              className={`${TOOL_BUTTON} text-tone-red-55`}
            >
              Удалить КВ
            </button>
          </>
        )}
      </div>

      {isMobile ? (
        plans.map((plan) => {
          const group = inWar.filter(({ uuid }) => marks[uuid].plan === plan);
          const groupCame = group.filter(
            ({ uuid }) => summarize(marks[uuid]).kind === "came",
          ).length;
          return (
            <div key={plan} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-2.5 px-0.5 pt-1">
                <span className="text-[15px] font-semibold">
                  {plan || "Не в составе"}
                </span>
                <span className="text-[12px] text-muted">
                  пришли {groupCame} из {group.length}
                </span>
              </div>
              {group.map((player) => (
                <MobileRow
                  key={player.uuid}
                  player={player}
                  mark={marks[player.uuid]}
                  isMe={player.name === me}
                  isFocused={focusUuid === player.uuid}
                  canEdit={canEdit}
                  onChange={(mark) => onUpdate({ [player.uuid]: mark })}
                />
              ))}
            </div>
          );
        })
      ) : (
        <div className="overflow-x-auto rounded-md border border-solid border-line bg-surface">
          <div className="min-w-190">
            <div
              className={`grid h-10 items-center border-b border-solid border-line bg-head text-[11px] font-semibold tracking-[0.1em] text-ink-soft uppercase ${GRID}`}
            >
              <span className="px-4">Игрок</span>
              {STAGES.map((stage) => (
                <span
                  key={stage}
                  className="flex items-baseline justify-center gap-1.5 whitespace-nowrap"
                >
                  Этап {stage + 1}
                  <span
                    title="Были на этапе"
                    className="font-jetbrains-mono text-[11.5px] tracking-normal text-muted"
                  >
                    {wasAtStage[stage]}
                  </span>
                </span>
              ))}
              <span />
            </div>
            {plans.map((plan) => {
              const group = inWar.filter(
                ({ uuid }) => marks[uuid].plan === plan,
              );
              const groupCame = group.filter(
                ({ uuid }) => summarize(marks[uuid]).kind === "came",
              ).length;
              return (
                <div key={plan}>
                  <div className="-mt-px flex h-9 items-center justify-between gap-3 border-t border-solid border-line-227 bg-alt-250 px-4">
                    <span className="text-[13.5px] font-semibold">
                      {plan || "Не в составе"}
                    </span>
                    <span className="text-[12px] text-muted">
                      пришли {groupCame} из {group.length}
                    </span>
                  </div>
                  {group.map((player) => (
                    <DesktopRow
                      key={player.uuid}
                      player={player}
                      mark={marks[player.uuid]}
                      isMe={player.name === me}
                      isFocused={focusUuid === player.uuid}
                      canEdit={canEdit}
                      onChange={(mark) => onUpdate({ [player.uuid]: mark })}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
