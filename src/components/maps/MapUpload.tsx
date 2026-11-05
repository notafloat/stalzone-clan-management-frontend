"use client";

import { useState, type FormEvent } from "react";
import {
  MAX_MAP_FILE_BYTES,
  MAX_MAP_NAME_LENGTH,
  type GameMap,
} from "@/lib/maps/maps";

const ERRORS: Record<string, string> = {
  bad_image: "Этот файл не подходит: нужна картинка PNG, JPG или WEBP",
  bad_name: "Введите название карты",
  too_large: "Файл слишком большой: максимум 10 МБ",
  too_many: "Загружено слишком много карт: сначала удалите лишние",
  forbidden: "Загружать карты могут офицеры и выше",
};
const FAILED = "Не удалось загрузить карту. Попробуйте ещё раз";

export function MapUpload({
  buttonClassName,
  onUploaded,
}: {
  buttonClassName: string;
  onUploaded: (map: GameMap) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string>();
  const [isSending, setIsSending] = useState(false);

  function close() {
    setIsOpen(false);
    setName("");
    setFile(null);
    setError(undefined);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file || isSending) return;
    if (file.size > MAX_MAP_FILE_BYTES) {
      setError(ERRORS.too_large);
      return;
    }
    setIsSending(true);
    setError(undefined);
    const body = new FormData();
    body.set("name", name);
    body.set("file", file);
    const response = await fetch("/api/maps", { method: "POST", body }).catch(
      () => null,
    );
    const result = await response?.json().catch(() => null);
    setIsSending(false);
    if (response?.ok && result?.map) {
      close();
      onUploaded(result.map);
    } else {
      setError(ERRORS[result?.error] ?? FAILED);
    }
  }

  return (
    <>
      <button
        type="button"
        data-map-upload
        onClick={() => setIsOpen(true)}
        className={buttonClassName}
      >
        Загрузить карту
      </button>
      {isOpen && (
        <>
          <div
            onClick={close}
            className="fixed inset-0 z-50 bg-[rgba(23,25,30,0.32)]"
          />
          <form
            role="dialog"
            aria-label="Загрузить карту"
            onSubmit={submit}
            className="fixed top-1/2 left-1/2 z-51 flex w-[min(420px,calc(100vw-28px))] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-xl border border-solid border-line-227 bg-surface p-5 text-left text-ink shadow-[0_10px_30px_rgba(23,25,30,0.25)]"
          >
            <div className="text-lg font-semibold">Загрузить карту</div>
            <label className="flex flex-col gap-1.5 text-[13px] text-ink-soft">
              Файл
              <input
                type="file"
                required
                accept="image/png,image/jpeg,image/webp"
                aria-label="Файл карты"
                onChange={(event) => {
                  const picked = event.target.files?.[0] ?? null;
                  setFile(picked);
                  if (picked && !name) {
                    setName(
                      picked.name
                        .replace(/\.[^.]+$/, "")
                        .slice(0, MAX_MAP_NAME_LENGTH),
                    );
                  }
                }}
                className="text-[13px] text-ink"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] text-ink-soft">
              Название
              <input
                required
                value={name}
                maxLength={MAX_MAP_NAME_LENGTH}
                aria-label="Название карты"
                onChange={(event) => setName(event.target.value)}
                className="h-9 rounded-md border border-solid border-edge-217 bg-surface px-2.5 text-sm text-ink outline-none focus:border-ink"
              />
            </label>
            <div className="text-[12.5px] leading-[1.45] text-muted">
              PNG, JPG или WEBP, до 10 МБ. Большие картинки уменьшаются до 2000
              пикселей по длинной стороне.
            </div>
            {error && (
              <div role="alert" className="text-[13px] text-tone-red-55">
                {error}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                className="h-9 cursor-pointer rounded-md border border-solid border-edge-217 bg-surface px-3.5 text-[13.5px] hover:bg-hover"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={!file || !name.trim() || isSending}
                className="h-9 cursor-pointer rounded-md border border-solid border-ink bg-ink px-3.5 text-[13.5px] font-semibold text-on-ink disabled:cursor-default disabled:opacity-50"
              >
                {isSending ? "Загрузка…" : "Загрузить"}
              </button>
            </div>
          </form>
        </>
      )}
    </>
  );
}
