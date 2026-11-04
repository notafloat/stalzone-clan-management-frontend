"use client";

import { useState, useTransition } from "react";
import { saveMemberNote } from "@/app/members/actions";
import { MAX_NOTE_LENGTH } from "@/lib/members/members";

/** Saves when leaving the field. Only ever rendered for officers and above. */
export function MemberNoteBox({
  name,
  initialValue,
}: {
  name: string;
  initialValue: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [saved, setSaved] = useState(initialValue);
  const [hasFailed, setHasFailed] = useState(false);
  const [isSaving, startSaving] = useTransition();

  function save() {
    if (value === saved) return;
    startSaving(async () => {
      const ok = await saveMemberNote(name, value).catch(() => false);
      setHasFailed(!ok);
      if (ok) setSaved(value);
    });
  }

  return (
    <>
      <textarea
        value={value}
        maxLength={MAX_NOTE_LENGTH}
        rows={4}
        placeholder="Например: отпуск до 03.11"
        aria-label={`Заметка: ${name}`}
        aria-invalid={hasFailed}
        disabled={isSaving}
        onChange={(event) => setValue(event.target.value)}
        onBlur={save}
        className="block min-h-26 w-full resize-y border-0 bg-surface px-4 py-3 text-sm leading-normal outline-none placeholder:text-dim-179 disabled:opacity-60"
      />
      {hasFailed && (
        <div
          role="alert"
          className="border-t border-solid border-line-soft px-4 py-2 text-[12.5px] text-tone-red-52"
        >
          Не удалось сохранить заметку
        </div>
      )}
    </>
  );
}
