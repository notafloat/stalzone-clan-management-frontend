import { useCallback, useEffect, useRef, useState } from "react";

export type SaveStatus = "idle" | "saving" | "failed";

/**
 * Saving checks the player's rank live, which can take seconds. This lets the page update
 * at once while changes wait their turn, and combines whatever piles up into one request.
 */
export function useSaveQueue<T>(
  save: (value: T) => Promise<boolean>,
  combine: (older: T, newer: T) => T = (_, newer) => newer,
) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const waiting = useRef<{ value: T } | null>(null);
  const isRunning = useRef(false);
  const lastResult = useRef(true);
  const idleCallbacks = useRef<((ok: boolean) => void)[]>([]);

  const run = useCallback(async () => {
    if (isRunning.current) return;
    isRunning.current = true;
    setStatus("saving");
    let ok = true;
    while (waiting.current && ok) {
      const { value } = waiting.current;
      waiting.current = null;
      ok = await save(value).catch(() => false);
    }
    waiting.current = null;
    isRunning.current = false;
    lastResult.current = ok;
    setStatus(ok ? "idle" : "failed");
    idleCallbacks.current.splice(0).forEach((callback) => callback(ok));
  }, [save]);

  const enqueue = useCallback(
    (value: T) => {
      waiting.current = waiting.current
        ? { value: combine(waiting.current.value, value) }
        : { value };
      void run();
    },
    [combine, run],
  );

  /** Resolves once everything is saved, with whether it all worked. */
  const whenIdle = useCallback(
    () =>
      new Promise<boolean>((resolve) => {
        if (isRunning.current) idleCallbacks.current.push(resolve);
        else resolve(lastResult.current);
      }),
    [],
  );

  useEffect(() => {
    if (status !== "saving") return;
    function warnBeforeLeaving(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [status]);

  return { enqueue, whenIdle, status };
}
