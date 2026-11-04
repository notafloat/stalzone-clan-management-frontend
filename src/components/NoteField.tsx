"use client";

import { useState, useTransition } from "react";
import { MAX_NOTE_LENGTH } from "@/lib/members/members";

/** Saves on Enter or when leaving the field, and marks the field if saving fails. */
export function NoteField({
  initialValue,
  label,
  updatedBy,
  onSave,
}: {
  initialValue: string;
  label: string;
  updatedBy?: string;
  onSave: (value: string) => Promise<boolean>;
}) {
  const [value, setValue] = useState(initialValue);
  const [saved, setSaved] = useState(initialValue);
  const [hasFailed, setHasFailed] = useState(false);
  const [isSaving, startSaving] = useTransition();

  function save() {
    if (value === saved) return;
    startSaving(async () => {
      const ok = await onSave(value).catch(() => false);
      setHasFailed(!ok);
      if (ok) setSaved(value);
    });
  }

  return (
    <input
      value={value}
      maxLength={MAX_NOTE_LENGTH}
      placeholder="—"
      aria-label={label}
      title={
        hasFailed
          ? "Не удалось сохранить"
          : updatedBy && `Изменил: ${updatedBy}`
      }
      aria-invalid={hasFailed}
      disabled={isSaving}
      onChange={(change) => setValue(change.target.value)}
      onBlur={save}
      onKeyDown={(key) => {
        if (key.key === "Enter") key.currentTarget.blur();
      }}
      className={`h-7.5 w-full rounded-sm border border-solid bg-transparent px-2 text-[13px] text-ink-soft outline-none hover:border-line-227 hover:bg-surface focus:border-ink focus:bg-surface disabled:opacity-60 ${
        hasFailed ? "border-tone-red-55" : "border-transparent"
      }`}
    />
  );
}
