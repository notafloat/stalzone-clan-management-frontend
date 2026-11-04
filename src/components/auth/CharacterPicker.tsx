"use client";

import { useState } from "react";

export type CharacterOption = {
  id: string;
  name: string;
  description: string;
  isAllowed: boolean;
};

export function CharacterPicker({
  characters,
  initialId,
  returnTo,
}: {
  characters: CharacterOption[];
  initialId?: string;
  returnTo: string;
}) {
  const eligible = characters.filter(({ isAllowed }) => isAllowed);
  const [selectedId, setSelectedId] = useState(
    eligible.find(({ id }) => id === initialId)?.id ?? eligible[0]?.id,
  );
  const selected = eligible.find(({ id }) => id === selectedId);

  return (
    <form
      action="/api/auth/character"
      method="post"
      className="flex flex-col gap-4.5"
    >
      <input type="hidden" name="returnTo" value={returnTo} />
      <input type="hidden" name="character" value={selectedId ?? ""} />
      <div className="flex flex-col gap-2">
        {characters.map((character) => (
          <CharacterButton
            key={character.id}
            character={character}
            selected={character.id === selectedId}
            onSelect={() => setSelectedId(character.id)}
          />
        ))}
      </div>
      <button
        disabled={!selected}
        className="h-12.5 cursor-pointer rounded-lg border-0 bg-ink text-[15.5px] font-semibold text-on-ink disabled:cursor-not-allowed disabled:opacity-55"
      >
        {selected
          ? `Продолжить как ${selected.name}`
          : "Нет персонажей в клане [MOZG]"}
      </button>
    </form>
  );
}

function CharacterButton({
  character: { name, description, isAllowed },
  selected,
  onSelect,
}: {
  character: CharacterOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={!isAllowed}
      onClick={onSelect}
      className={`grid cursor-pointer grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-solid px-3.5 py-3 text-left disabled:cursor-not-allowed disabled:opacity-55 ${
        selected ? "border-ink bg-alt-250" : "border-line bg-surface"
      }`}
    >
      <span
        className={`grid size-4.5 place-items-center rounded-full border-2 border-solid ${
          selected ? "border-ink" : "border-dim-197"
        }`}
      >
        <span
          className={`size-2 rounded-full ${selected ? "bg-ink" : "bg-transparent"}`}
        />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[15px] font-semibold">{name}</span>
        <span className="mt-0.5 block text-[12.5px] text-muted">
          {description}
        </span>
      </span>
      {!isAllowed && (
        <span className="rounded-[10px] bg-wash px-2 py-0.5 text-[12px] font-medium whitespace-nowrap text-muted">
          нет доступа
        </span>
      )}
    </button>
  );
}
