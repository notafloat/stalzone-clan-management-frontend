"use client";

import { useSyncExternalStore } from "react";
import { formatInZone, SERVER_TIME_ZONE, type DateFormat } from "@/lib/dates";

const subscribe = () => () => {};
const getBrowserZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const getServerZone = () => SERVER_TIME_ZONE;

/** Server time first, so hydration matches, then the player's zone. */
export function useTimeZone() {
  return useSyncExternalStore(subscribe, getBrowserZone, getServerZone);
}

export function LocalTime({
  value,
  format,
}: {
  value: Date | string | null;
  format: DateFormat;
}) {
  return <>{formatInZone(value, format, useTimeZone())}</>;
}
