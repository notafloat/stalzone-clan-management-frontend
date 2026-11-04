"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { saveLineup, type SaveLineupResult } from "@/app/squads/actions";
import { applyTemplate, newSquad, type Lineup } from "@/lib/squads/lineup";
import type { SquadTemplate } from "@/lib/settings/settings";
import type { ClanRank } from "@/lib/stalzone/types";
import { useIsMobile } from "@/lib/use-is-mobile";
import { LineupDesktop, LineupMobile } from "./LineupView";
import { SquadEditor } from "./SquadEditor";

const HISTORY_LIMIT = 50;
const TOAST_MS = 2800;

const TOOL_BUTTON =
  "h-8 cursor-pointer rounded-md border border-solid border-edge-217 bg-surface px-3 text-[13px] font-medium hover:bg-hover disabled:cursor-default disabled:opacity-45";

const SAVE_ERRORS: Record<
  Exclude<SaveLineupResult["status"], "saved">,
  string
> = {
  conflict:
    "Состав уже изменил другой офицер. Обновите страницу: ваши правки не сохранены",
  forbidden: "Составы редактируют офицеры и выше",
  invalid: "Не удалось сохранить: проверьте данные состава",
  unavailable: "База данных недоступна",
};

export function SquadsView({
  initialLineup,
  initialVersion,
  members,
  me,
  canEdit,
  templates,
}: {
  initialLineup: Lineup;
  initialVersion: number;
  members: { name: string; rank: ClanRank }[];
  me: string;
  canEdit: boolean;
  templates: SquadTemplate[];
}) {
  const [lineup, setLineup] = useState(initialLineup);
  const [version, setVersion] = useState(initialVersion);
  const [history, setHistory] = useState<Lineup[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [view, setView] = useState<"lineup" | "editor">(
    canEdit ? "editor" : "lineup",
  );
  const [toast, setToast] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isMobile = useIsMobile();

  const ranks = useMemo(
    () => new Map(members.map(({ name, rank }) => [name, rank])),
    [members],
  );
  const rankOf = useCallback((name: string) => ranks.get(name), [ranks]);

  const showToast = useCallback((message: string) => {
    clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  const pushHistory = useCallback((point: Lineup) => {
    setHistory((past) => [...past, point].slice(-HISTORY_LIMIT));
  }, []);

  function commit(next: Lineup) {
    pushHistory(lineup);
    setLineup(next);
    setIsDirty(true);
  }

  const undo = useCallback(() => {
    const previous = history[history.length - 1];
    if (!previous) return;
    setLineup(previous);
    setHistory(history.slice(0, -1));
    setIsDirty(true);
  }, [history]);

  useEffect(() => {
    function undoOnShortcut(event: KeyboardEvent) {
      const isUndo =
        (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z";
      const target = event.target as HTMLElement;
      if (isUndo && !/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) {
        event.preventDefault();
        undo();
      }
    }
    window.addEventListener("keydown", undoOnShortcut);
    return () => window.removeEventListener("keydown", undoOnShortcut);
  }, [undo]);

  useEffect(() => {
    if (!isDirty) return;
    function warnBeforeLeaving(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [isDirty]);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  function save() {
    startSaving(async () => {
      const result = await saveLineup(lineup, version).catch(
        (): SaveLineupResult => ({ status: "unavailable" }),
      );
      if (result.status === "saved") {
        setVersion(result.version);
        setIsDirty(false);
        showToast("Состав сохранён · виден участникам");
      } else {
        showToast(SAVE_ERRORS[result.status]);
      }
    });
  }

  const isEditor = canEdit && view === "editor";
  const segment = (isActive: boolean) =>
    `h-7.5 cursor-pointer rounded-[5px] border-0 px-3.5 text-[13.5px] font-medium ${
      isActive
        ? "bg-surface text-ink shadow-[0_1px_2px_rgba(23,25,30,0.14)]"
        : "bg-transparent text-ink-soft"
    }`;

  return (
    // The editor needs the room for its columns; the lineup matches the other pages' width.
    <div
      className={`mx-auto flex w-full flex-col gap-4 ${isEditor ? "" : "max-w-314"}`}
    >
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-solid border-line pb-4">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
            Отряды · сбор
          </div>
          {isEditor ? (
            <input
              value={lineup.event}
              maxLength={80}
              aria-label="Название сбора"
              onFocus={() => pushHistory(lineup)}
              onChange={(event) => {
                setLineup({ ...lineup, event: event.target.value });
                setIsDirty(true);
              }}
              className="mt-1.5 w-full min-w-70 rounded-sm border border-solid border-transparent bg-transparent text-[clamp(22px,3vw,28px)] leading-[1.15] font-semibold tracking-[-0.01em] outline-none hover:border-edge-217 focus:border-ink focus:bg-surface"
            />
          ) : (
            <h1 className="mt-1.5 text-[clamp(22px,3vw,28px)] leading-[1.15] font-semibold tracking-[-0.01em]">
              {lineup.event}
            </h1>
          )}
        </div>
        {canEdit ? (
          <div className="flex gap-0.5 rounded-[7px] bg-track p-0.75">
            <button
              type="button"
              aria-pressed={!isEditor}
              onClick={() => setView("lineup")}
              className={segment(!isEditor)}
            >
              Состав
            </button>
            <button
              type="button"
              aria-pressed={isEditor}
              onClick={() => setView("editor")}
              className={segment(isEditor)}
            >
              Редактор
            </button>
          </div>
        ) : (
          <span className="text-[13px] text-muted">
            Составы редактируют офицеры и выше
          </span>
        )}
      </div>

      {isEditor ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                commit({ ...lineup, squads: [...lineup.squads, newSquad()] })
              }
              className={TOOL_BUTTON}
            >
              + Отряд
            </button>
            <button
              type="button"
              disabled={history.length === 0}
              onClick={undo}
              className={TOOL_BUTTON}
            >
              ↶ Отменить
            </button>
            <button
              type="button"
              onClick={() => {
                commit({
                  ...lineup,
                  squads: lineup.squads.map((squad) => ({
                    ...squad,
                    players: [],
                  })),
                  absentReason: [],
                  absentNo: [],
                });
                showToast(
                  "Все игроки возвращены в состав · «Отменить» вернёт как было",
                );
              }}
              className={TOOL_BUTTON}
            >
              Очистить всё
            </button>
            <label className="flex h-8 items-center gap-1 rounded-md border border-solid border-edge-217 bg-surface pr-0.5 pl-2.5 text-[13px] text-muted">
              Шаблон
              <select
                value=""
                onChange={(event) => {
                  const template = templates.find(
                    ({ id }) => id === event.target.value,
                  );
                  if (!template) return;
                  commit(applyTemplate(lineup, template));
                  showToast(
                    `Шаблон «${template.name}» применён — игроки из отрядов с теми же названиями сохранены`,
                  );
                }}
                className="h-7.5 cursor-pointer border-0 bg-transparent text-[13px] font-medium text-ink outline-none"
              >
                <option value="">выбрать</option>
                {templates.map(({ id, name }) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex-1" />
            {isDirty && (
              <span className="text-[12.5px] text-tone-amber-52">
                есть несохранённые изменения
              </span>
            )}
            <button
              type="button"
              disabled={!isDirty || isSaving}
              onClick={save}
              className="h-8 cursor-pointer rounded-md border border-solid border-ink bg-ink px-4 text-[13px] font-semibold text-on-ink hover:bg-ink-strong disabled:cursor-default disabled:opacity-50"
            >
              {isSaving ? "Сохранение…" : "Сохранить"}
            </button>
          </div>
          <SquadEditor
            lineup={lineup}
            members={members}
            rankOf={rankOf}
            me={me}
            isMobile={isMobile}
            onCommit={commit}
            onDraft={(update) => {
              setLineup(update);
              setIsDirty(true);
            }}
            onBeforeTyping={() => pushHistory(lineup)}
            onToast={showToast}
          />
        </>
      ) : isMobile ? (
        <LineupMobile lineup={lineup} me={me} rankOf={rankOf} />
      ) : (
        <LineupDesktop lineup={lineup} me={me} rankOf={rankOf} />
      )}

      {toast && (
        <div
          role="status"
          className={`fixed left-1/2 z-70 max-w-[min(560px,calc(100vw-24px))] -translate-x-1/2 rounded-lg bg-ink px-4 py-2.75 text-[13.5px] leading-[1.4] text-on-ink shadow-[0_10px_30px_rgba(23,25,30,0.25)] ${isMobile ? "bottom-21" : "bottom-6"}`}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
