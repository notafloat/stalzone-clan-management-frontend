"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  applyTemplateToLineup,
  updateAbsenceRules,
  updateKvRules,
  updateTemplates,
} from "@/app/admin/actions";
import { Panel, PanelAsideText } from "@/components/clan/Panel";
import { LocalTime } from "@/components/LocalTime";
import {
  shortDate,
  WEEKDAYS_SHORT,
  weekdayDate,
  type KvWar,
} from "@/lib/kv/kv";
import {
  ABSENCE_STYLES,
  absenceFlag,
  CLAN_RANKS,
  playerPath,
  RANK_BY_ID,
  REGION,
  type MemberData,
} from "@/lib/members/members";
import { DAY_FORMS, pluralRu } from "@/lib/plural";
import {
  MAX_TEMPLATE_SQUAD_SIZE,
  type AbsenceRules,
  type KvRules,
  type SquadTemplate,
  type TemplateSettings,
} from "@/lib/settings/settings";
import { useSaveQueue, type SaveStatus } from "@/lib/use-save-queue";

const TABS = [
  { id: "templates", label: "Шаблоны отрядов" },
  { id: "inactivity", label: "Неактивность" },
  { id: "kv", label: "Явка на КВ" },
  { id: "access", label: "Доступ" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const MAX_CRIT_DAYS = 60;
const TOOL_BUTTON =
  "h-8.5 cursor-pointer rounded-md border border-solid border-edge-217 bg-surface px-3 text-[13px] font-medium hover:bg-hover disabled:cursor-default disabled:opacity-45";
const STEPPER =
  "grid h-8.5 items-center overflow-hidden rounded-md border border-solid border-edge-217";
const STEP_BUTTON =
  "h-full cursor-pointer border-0 bg-surface text-base hover:bg-hover";

function SaveState({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;
  return (
    <div
      role="status"
      className={`fixed bottom-21 left-1/2 z-70 -translate-x-1/2 rounded-lg px-4 py-2.75 text-[13.5px] text-on-ink shadow-[0_10px_30px_rgba(23,25,30,0.25)] min-[760px]:bottom-6 ${status === "failed" ? "bg-tone-red-52" : "bg-ink"}`}
    >
      {status === "failed"
        ? "Не удалось сохранить. Обновите страницу"
        : "Сохранение…"}
    </div>
  );
}

export function AdminView({
  initialTab,
  members,
  initialRules,
  initialKvRules,
  initialTemplates,
  eventName,
  wars,
}: {
  initialTab?: string;
  members: MemberData[];
  initialRules: AbsenceRules;
  initialKvRules: KvRules;
  initialTemplates: TemplateSettings;
  eventName: string;
  wars: KvWar[];
}) {
  const [tab, setTab] = useState<TabId>(
    TABS.find(({ id }) => id === initialTab)?.id ?? "templates",
  );

  const segment = (isActive: boolean) =>
    `h-8 flex-none cursor-pointer whitespace-nowrap rounded-[5px] border-0 px-3.5 text-[13.5px] font-medium ${
      isActive
        ? "bg-surface text-ink shadow-[0_1px_2px_rgba(23,25,30,0.14)]"
        : "bg-transparent text-ink-soft"
    }`;

  return (
    <>
      <div className="flex max-w-full scrollbar-none gap-0.5 self-start overflow-x-auto rounded-[7px] bg-track p-0.75">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
            className={segment(tab === id)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "templates" && (
        <TemplatesTab initial={initialTemplates} eventName={eventName} />
      )}
      {tab === "inactivity" && (
        <InactivityTab initial={initialRules} members={members} />
      )}
      {tab === "kv" && <KvTab initial={initialKvRules} wars={wars} />}
      {tab === "access" && <AccessTab />}
    </>
  );
}

function TemplatesTab({
  initial,
  eventName,
}: {
  initial: TemplateSettings;
  eventName: string;
}) {
  const [settings, setSettings] = useState(initial);
  const [selectedId, setSelectedId] = useState(initial.templates[0].id);
  const [message, setMessage] = useState<string>();
  const nextId = useRef(0);
  const { enqueue, whenIdle, status } = useSaveQueue(updateTemplates);
  const { templates, defaultId } = settings;
  const selected =
    templates.find(({ id }) => id === selectedId) ?? templates[0];

  function change(next: TemplateSettings) {
    setSettings(next);
    enqueue(next);
  }
  function updateSelected(update: (template: SquadTemplate) => SquadTemplate) {
    change({
      ...settings,
      templates: templates.map((template) =>
        template.id === selected.id ? update(template) : template,
      ),
    });
  }
  function updateSquad(
    index: number,
    update: (
      squad: SquadTemplate["squads"][number],
    ) => SquadTemplate["squads"][number],
  ) {
    updateSelected((template) => ({
      ...template,
      squads: template.squads.map((squad, i) =>
        i === index ? update(squad) : squad,
      ),
    }));
  }
  function addTemplate() {
    nextId.current += 1;
    const id = `t${Date.now().toString(36)}${nextId.current}`;
    change({
      ...settings,
      templates: [
        ...templates,
        {
          id,
          name: "Новый шаблон",
          squads: [
            { name: "1 бой", size: 5 },
            { name: "запас", size: 5 },
          ],
        },
      ],
    });
    setSelectedId(id);
  }
  function removeTemplate() {
    if (templates.length < 2) {
      setMessage("Нужен хотя бы один шаблон");
      return;
    }
    const rest = templates.filter(({ id }) => id !== selected.id);
    change({
      templates: rest,
      defaultId: defaultId === selected.id ? rest[0].id : defaultId,
    });
    setSelectedId(rest[0].id);
    setMessage(`Шаблон «${selected.name}» удалён`);
  }
  async function applyToEvent() {
    const saved = await whenIdle();
    const ok = saved && (await applyTemplateToLineup(selected.id));
    setMessage(
      ok
        ? `«${selected.name}» применён к сбору ${eventName} — откройте «Отряды»`
        : "Не удалось применить шаблон. Обновите страницу",
    );
  }

  const row =
    "grid grid-cols-[28px_minmax(0,1fr)_122px_32px] items-center gap-2.5 px-4";

  return (
    <>
      {message && (
        <div className="rounded-md border border-solid border-line bg-surface px-3.5 py-2.5 text-[13.5px]">
          {message}
        </div>
      )}
      <div className="flex flex-wrap items-start gap-4.5">
        <Panel
          title="Шаблоны"
          aside={<PanelAsideText>{templates.length}</PanelAsideText>}
          className="flex-[1_1_260px]"
        >
          <div className="-mt-px">
            {templates.map((template) => {
              const seats = template.squads.reduce(
                (sum, { size }) => sum + size,
                0,
              );
              return (
                <button
                  key={template.id}
                  type="button"
                  aria-pressed={template.id === selected.id}
                  onClick={() => setSelectedId(template.id)}
                  className={`flex w-full cursor-pointer flex-col items-start gap-1 border-0 border-t border-solid border-line-soft px-4 py-3 text-left ${template.id === selected.id ? "bg-tone-lime-96" : "bg-surface"}`}
                >
                  <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                    {template.name || "Без названия"}
                    {template.id === defaultId && (
                      <span className="rounded-sm bg-ink px-1.5 py-0.5 text-[10.5px] font-semibold text-on-ink">
                        по умолчанию
                      </span>
                    )}
                  </span>
                  <span className="font-jetbrains-mono text-[11.5px] text-muted">
                    {template.squads.length}{" "}
                    {pluralRu(template.squads.length, [
                      "отряд",
                      "отряда",
                      "отрядов",
                    ])}{" "}
                    · {seats} {pluralRu(seats, ["место", "места", "мест"])}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={addTemplate}
            className="h-10.5 w-full cursor-pointer border-0 border-t border-solid border-line-soft bg-surface px-4 text-left text-[13.5px] text-ink-soft hover:bg-alt-250 hover:text-ink"
          >
            + Новый шаблон
          </button>
        </Panel>

        <section className="min-w-0 flex-[999_1_520px] overflow-hidden rounded-md border border-solid border-line bg-surface">
          <div className="border-b border-solid border-line bg-head px-4 py-3.5">
            <div className="text-[11.5px] font-semibold tracking-[0.12em] text-ink-strong uppercase">
              Шаблон сбора
            </div>
            <input
              value={selected.name}
              maxLength={40}
              aria-label="Название шаблона"
              onChange={(event) => {
                const name = event.target.value;
                updateSelected((template) => ({ ...template, name }));
              }}
              className="mt-1.5 w-full border-0 border-b border-solid border-transparent bg-transparent py-1 text-[19px] font-semibold outline-none focus:border-ink"
            />
          </div>
          <div
            className={`${row} h-8.5 text-[11px] font-semibold tracking-[0.1em] text-muted uppercase`}
          >
            <span>#</span>
            <span>Отряд</span>
            <span className="text-center">Мест</span>
            <span />
          </div>
          {selected.squads.map((squad, i) => (
            <div
              key={i}
              data-template-row={i}
              className={`${row} border-t border-solid border-line-soft py-1.75`}
            >
              <span className="font-jetbrains-mono text-[12px] text-dim-179">
                {i + 1}
              </span>
              <input
                value={squad.name}
                maxLength={40}
                aria-label={`Название отряда ${i + 1}`}
                onChange={(event) => {
                  const name = event.target.value;
                  updateSquad(i, (current) => ({ ...current, name }));
                }}
                className="h-8.5 min-w-0 rounded-md border border-solid border-edge-217 px-2.5 text-sm outline-none focus:border-ink"
              />
              <div className={`${STEPPER} grid-cols-[34px_1fr_34px]`}>
                <button
                  type="button"
                  title="Меньше"
                  onClick={() =>
                    updateSquad(i, (current) => ({
                      ...current,
                      size: Math.max(1, current.size - 1),
                    }))
                  }
                  className={STEP_BUTTON}
                >
                  −
                </button>
                <span className="text-center font-jetbrains-mono text-[13px] font-semibold">
                  {squad.size}
                </span>
                <button
                  type="button"
                  title="Больше"
                  onClick={() =>
                    updateSquad(i, (current) => ({
                      ...current,
                      size: Math.min(MAX_TEMPLATE_SQUAD_SIZE, current.size + 1),
                    }))
                  }
                  className={STEP_BUTTON}
                >
                  +
                </button>
              </div>
              <button
                type="button"
                title="Убрать отряд"
                onClick={() =>
                  updateSelected((template) => ({
                    ...template,
                    squads: template.squads.filter((_, j) => j !== i),
                  }))
                }
                className="size-8 cursor-pointer rounded-md border-0 bg-transparent text-lg text-muted hover:bg-wash hover:text-ink"
              >
                ×
              </button>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2 border-t border-solid border-line-soft bg-alt-250 px-4 py-3">
            <button
              type="button"
              onClick={() =>
                updateSelected((template) => ({
                  ...template,
                  squads: [
                    ...template.squads,
                    { name: `Отряд ${template.squads.length + 1}`, size: 5 },
                  ],
                }))
              }
              className={TOOL_BUTTON}
            >
              + Отряд
            </button>
            <div className="flex-1" />
            <button
              type="button"
              onClick={removeTemplate}
              className={`${TOOL_BUTTON} text-tone-red-55`}
            >
              Удалить
            </button>
            <button
              type="button"
              disabled={selected.id === defaultId}
              onClick={() => {
                change({ ...settings, defaultId: selected.id });
                setMessage(`«${selected.name}» — шаблон по умолчанию`);
              }}
              className={TOOL_BUTTON}
            >
              Сделать по умолчанию
            </button>
            <button
              type="button"
              onClick={applyToEvent}
              className="h-8.5 cursor-pointer rounded-md border border-solid border-ink bg-ink px-3.5 text-[13px] font-semibold text-on-ink hover:bg-ink-strong"
            >
              Применить к сбору
            </button>
          </div>
        </section>
      </div>
      <p className="max-w-190 text-[12.5px] leading-[1.55] text-muted">
        Шаблон по умолчанию используется, пока состав отрядов ещё не сохранён.
        «Применить к сбору» меняет отряды текущего сбора ({eventName}): игроки
        из отрядов с теми же названиями остаются на местах, остальные
        возвращаются в состав.
      </p>
      <SaveState status={status} />
    </>
  );
}

function InactivityTab({
  initial,
  members,
}: {
  initial: AbsenceRules;
  members: MemberData[];
}) {
  const [rules, setRules] = useState(initial);
  const { enqueue, status } = useSaveQueue(updateAbsenceRules);

  function change(patch: Partial<AbsenceRules>) {
    const next = { ...rules, ...patch };
    setRules(next);
    enqueue(next);
  }
  function step(key: "warn" | "crit", delta: number) {
    const value = rules[key] + delta;
    if (key === "warn" && (value < 1 || value >= rules.crit)) return;
    if (key === "crit" && (value <= rules.warn || value > MAX_CRIT_DAYS)) {
      return;
    }
    change({ [key]: value });
  }

  const flagged = members
    .map((member) => ({ member, flag: absenceFlag(member, rules) }))
    .filter(({ flag }) => flag !== null)
    .sort(
      (a, b) =>
        (b.member.daysSinceLastLogin ?? -1) -
        (a.member.daysSinceLastLogin ?? -1),
    );

  const ruleRow = (key: "warn" | "crit", flagKey: "warn" | "crit") => (
    <div className="flex flex-wrap items-center gap-2.5 px-4 py-3.5 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-solid [&:not(:first-child)]:border-line-soft">
      <span
        className={`inline-flex min-w-25 justify-center rounded-sm px-2.5 py-1 text-[13px] font-semibold first-letter:uppercase ${ABSENCE_STYLES[flagKey].className}`}
      >
        {ABSENCE_STYLES[flagKey].label}
      </span>
      <span className="text-sm text-ink-soft">после</span>
      <div className={`${STEPPER} grid-cols-[34px_44px_34px]`}>
        <button
          type="button"
          aria-label={`Уменьшить: ${ABSENCE_STYLES[flagKey].label}`}
          onClick={() => step(key, -1)}
          className={STEP_BUTTON}
        >
          −
        </button>
        <span
          data-threshold={key}
          className="text-center font-jetbrains-mono text-sm font-semibold"
        >
          {rules[key]}
        </span>
        <button
          type="button"
          aria-label={`Увеличить: ${ABSENCE_STYLES[flagKey].label}`}
          onClick={() => step(key, 1)}
          className={STEP_BUTTON}
        >
          +
        </button>
      </div>
      <span className="text-sm text-ink-soft">
        {pluralRu(rules[key], ["дня", "дней", "дней"])} без входа
      </span>
    </div>
  );

  return (
    <div className="flex flex-wrap items-start gap-4.5">
      <Panel title="Правила" className="flex-[1_1_420px]">
        {ruleRow("warn", "warn")}
        {ruleRow("crit", "crit")}
        <div className="border-t border-solid border-line-soft px-4 py-3.5">
          <div className="text-[13.5px] font-semibold">Не отмечать звания</div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {CLAN_RANKS.map(({ id, label, color }) => {
              const isOn = rules.exclude.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={isOn}
                  onClick={() =>
                    change({
                      exclude: isOn
                        ? rules.exclude.filter((rank) => rank !== id)
                        : [...rules.exclude, id],
                    })
                  }
                  className={`inline-flex h-7.5 cursor-pointer items-center gap-1.5 rounded-md border border-solid px-2.5 text-[13px] ${
                    isOn
                      ? "border-ink bg-ink text-on-ink"
                      : "border-edge-217 bg-surface text-ink"
                  }`}
                >
                  <span
                    className="size-2 rounded-xs"
                    style={{ backgroundColor: color }}
                  />
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="border-t border-solid border-line-soft bg-alt-250 px-4 py-3 text-[12.5px] leading-normal text-muted">
          Отметки видны в составе, в профиле и на странице клана. Последний вход
          проверяется при каждом запуске трекера, раз в 5 минут.
        </div>
      </Panel>

      <Panel
        title="Сейчас попадают"
        aside={<PanelAsideText>{flagged.length}</PanelAsideText>}
        className="flex-[1_1_380px]"
      >
        <div className="-mt-px">
          {flagged.map(({ member, flag }) => {
            const rank = RANK_BY_ID[member.rank];
            const days = member.daysSinceLastLogin;
            return (
              <Link
                key={member.name}
                href={playerPath(member.name)}
                data-flagged={member.name}
                className="grid min-h-12 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2.5 border-t border-solid border-line-soft px-4 py-2 text-ink no-underline hover:bg-alt-250"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">
                    {member.name}
                  </span>
                  <span className="mt-0.5 block font-jetbrains-mono text-[11.5px] text-muted">
                    <LocalTime value={member.lastLogin} format="dateTime" /> ·{" "}
                    {days === null
                      ? "нет данных"
                      : `${days} ${pluralRu(days, DAY_FORMS)}`}
                  </span>
                </span>
                <span
                  className={`inline-flex h-5.5 items-center gap-1.5 rounded-[11px] pr-2.25 pl-1.75 text-[12px] font-medium ${rank?.badge ?? "bg-wash text-ink-soft"}`}
                >
                  <span
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: rank?.color }}
                  />
                  {rank?.label ?? member.rank}
                </span>
                {flag && (
                  <span
                    className={`rounded-sm px-2 py-0.5 text-[12px] font-semibold ${ABSENCE_STYLES[flag].className}`}
                  >
                    {ABSENCE_STYLES[flag].label}
                  </span>
                )}
              </Link>
            );
          })}
          {flagged.length === 0 && (
            <div className="border-t border-solid border-line-soft px-4 py-5.5 text-sm text-muted">
              С такими порогами никто не попадает
            </div>
          )}
        </div>
        <Link
          href="/members?filter=attention"
          className="block border-t border-solid border-line-soft px-4 py-3 text-[13px] text-ink-soft"
        >
          Открыть в составе →
        </Link>
      </Panel>
      <SaveState status={status} />
    </div>
  );
}

function KvTab({ initial, wars }: { initial: KvRules; wars: KvWar[] }) {
  const [rules, setRules] = useState(initial);
  const [message, setMessage] = useState<string>();
  const { enqueue, status } = useSaveQueue(updateKvRules);
  const mandatoryCount = wars.filter(({ mandatory }) => mandatory).length;

  function toggle(day: number) {
    const isOn = rules.mandatory.includes(day);
    if (isOn && rules.mandatory.length === 1) {
      setMessage("Нужен хотя бы один обязательный день");
      return;
    }
    setMessage(undefined);
    const next = {
      mandatory: isOn
        ? rules.mandatory.filter((other) => other !== day)
        : [...rules.mandatory, day].sort((a, b) => a - b),
    };
    setRules(next);
    enqueue(next);
  }

  return (
    <>
      {message && (
        <div className="rounded-md border border-solid border-line bg-surface px-3.5 py-2.5 text-[13.5px]">
          {message}
        </div>
      )}
      <div className="flex flex-wrap items-start gap-4.5">
        <Panel
          title="Дни обязательной явки"
          aside={
            <PanelAsideText>
              {rules.mandatory.map((day) => WEEKDAYS_SHORT[day]).join(", ")}
            </PanelAsideText>
          }
          className="flex-[1_1_420px]"
        >
          <div className="grid grid-cols-7 gap-1.5 p-4">
            {WEEKDAYS_SHORT.map((label, day) => {
              const isOn = rules.mandatory.includes(day);
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={isOn}
                  onClick={() => toggle(day)}
                  className={`flex h-14.5 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-solid p-0 ${
                    isOn
                      ? "border-ink bg-ink text-on-ink"
                      : "border-edge-217 bg-surface text-ink"
                  }`}
                >
                  <span className="text-[15px] font-semibold">{label}</span>
                  <span
                    className={`text-[10.5px] ${isOn ? "text-on-ink/62" : "text-dim-163"}`}
                  >
                    {isOn ? "обяз." : "—"}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="border-t border-solid border-line-soft px-4 pt-3 pb-3.5 text-[13.5px] leading-[1.55] text-pretty text-ink-soft">
            В эти дни пропуск КВ без причины засчитывается. В остальные дни
            приходить по желанию: причина не нужна, а явка в % и «без причины»
            считаются только по обязательным КВ. Изменения действуют только на
            новые КВ: уже созданные считаются как раньше.
          </div>
        </Panel>

        <Panel
          title={wars.length ? `КВ с ${shortDate(wars[0].date)}` : "КВ"}
          aside={
            <PanelAsideText>
              обязательных {mandatoryCount} из {wars.length}
            </PanelAsideText>
          }
          className="flex-[1_1_380px]"
        >
          <div className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-1.5 px-4 pt-3 pb-4">
            {wars.map(({ date, mandatory: isOn }) => {
              return (
                <div
                  key={date}
                  className={`rounded-md border px-2.5 py-2 ${
                    isOn
                      ? "border-solid border-edge-207 bg-surface"
                      : "border-dashed border-line-227 bg-alt-250"
                  }`}
                >
                  <div
                    className={`font-jetbrains-mono text-[12.5px] font-semibold ${isOn ? "text-ink" : "text-muted"}`}
                  >
                    {weekdayDate(date)}
                  </div>
                  <div
                    className={`mt-0.5 text-[11.5px] ${isOn ? "text-tone-green-42" : "text-dim-163"}`}
                  >
                    {isOn ? "обязательная" : "по желанию"}
                  </div>
                </div>
              );
            })}
            {wars.length === 0 && (
              <div className="col-span-full text-sm text-muted">
                КВ пока нет
              </div>
            )}
          </div>
          <Link
            href="/kv"
            className="block border-t border-solid border-line-soft px-4 py-3 text-[13px] text-ink-soft"
          >
            Открыть активность на КВ →
          </Link>
        </Panel>
      </div>
      <SaveState status={status} />
    </>
  );
}

const PERMISSIONS: { label: string; ranks: number }[] = [
  { label: "Состав, журнал, отряды, КВ и карты", ranks: CLAN_RANKS.length },
  { label: "Свой отряд", ranks: CLAN_RANKS.length },
  { label: "Заметки об игроках", ranks: 3 },
  { label: "Редактор отрядов", ranks: 3 },
  { label: "Рисование планов на картах", ranks: 3 },
  { label: "Отметка явки на КВ", ranks: 3 },
  { label: "Шаблоны и правила (эта панель)", ranks: 3 },
];

const SESSION_FACTS = [
  {
    key: "Вход",
    value:
      "Через аккаунт STALZONE (EXBO, OAuth 2.0). Пароль на сайт не попадает.",
  },
  { key: "Сессия", value: "Зашифрованная cookie на 30 дней" },
  {
    key: "Проверка звания",
    value:
      "Страницы используют данные трекера, а сохранение всегда проверяет звание через STALZONE API",
  },
  {
    key: "Если покинул клан",
    value: "Доступ закрывается при следующем запуске трекера, раз в 5 минут",
  },
  { key: "Сервер", value: `${REGION} · клан [MOZG] Zero Braincells` },
];

function AccessTab() {
  const columns = "grid-cols-[minmax(220px,1.8fr)_repeat(7,minmax(80px,1fr))]";
  return (
    <>
      <Panel
        title="Права по званиям"
        aside={
          <span className="text-[12.5px] text-muted">
            звание берётся из игры · только чтение
          </span>
        }
        className=""
      >
        <div className="overflow-x-auto">
          <div className="min-w-205">
            <div
              className={`grid h-10.5 items-center border-b border-solid border-line-soft ${columns}`}
            >
              <span className="px-4 text-[11px] font-semibold tracking-[0.1em] text-muted uppercase">
                Право
              </span>
              {CLAN_RANKS.map(({ id, label, color }) => (
                <span
                  key={id}
                  className="flex items-center justify-center gap-1.5 text-[12.5px] font-semibold"
                >
                  <span
                    className="size-1.75 rounded-xs"
                    style={{ backgroundColor: color }}
                  />
                  {label}
                </span>
              ))}
            </div>
            {PERMISSIONS.map(({ label, ranks }) => (
              <div
                key={label}
                className={`grid min-h-11 items-center border-t border-solid border-line-240 ${columns}`}
              >
                <span className="px-4 py-2 text-sm">{label}</span>
                {CLAN_RANKS.map(({ id }, i) => (
                  <span
                    key={id}
                    className={`text-center text-[15px] ${i < ranks ? "font-bold text-tone-green-5" : "text-dim-197"}`}
                  >
                    {i < ranks ? "✓" : "—"}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </Panel>
      <Panel title="Вход и сессии" className="">
        {SESSION_FACTS.map(({ key, value }) => (
          <div
            key={key}
            className="-mt-px grid grid-cols-[minmax(150px,0.7fr)_minmax(0,1.3fr)] gap-3 border-t border-solid border-line-240 px-4 py-2.75"
          >
            <span className="text-[13.5px] text-muted">{key}</span>
            <span className="text-sm leading-[1.45]">{value}</span>
          </div>
        ))}
      </Panel>
    </>
  );
}
