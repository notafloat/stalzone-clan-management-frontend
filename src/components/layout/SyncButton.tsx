"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LocalTime } from "@/components/LocalTime";

export function SyncButton({ time }: { time: Date }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      title="Когда данные проверялись в STALZONE API. Нажмите, чтобы обновить страницу"
      disabled={isPending}
      onClick={() => startTransition(() => router.refresh())}
      className="flex h-8 flex-none cursor-pointer items-center gap-2 rounded-md border border-solid border-line-227 bg-surface px-2.5 font-jetbrains-mono text-[12px] text-ink-soft disabled:cursor-wait disabled:opacity-60"
    >
      <span className="size-1.75 rounded-full bg-[oklch(0.66_0.15_150)]" />
      <span className="hidden min-[1180px]:inline">API ·</span>
      <LocalTime value={time} format="time" />
    </button>
  );
}
