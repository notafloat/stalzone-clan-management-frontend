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
      className="font-jetbrains-mono hidden h-8 flex-none cursor-pointer items-center gap-2 rounded-md border border-solid border-[rgb(227,229,233)] bg-white px-2.5 text-[12px] text-[rgb(79,85,96)] disabled:cursor-wait disabled:opacity-60 sm:flex"
    >
      <span className="size-1.75 rounded-full bg-[oklch(0.66_0.15_150)]" />
      API · <LocalTime value={time} format="time" />
    </button>
  );
}
