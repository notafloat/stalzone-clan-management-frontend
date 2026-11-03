import "server-only";
import { cache } from "react";
import { REGION } from "@/lib/members/members";
import { fetchStalzone } from "./client";
import type { CharacterClanInfo } from "./types";

export type Character = {
  information: {
    id: string;
    name: string;
  };
  clan?: CharacterClanInfo | null;
};

/** Deduped per request, because the page and its header both need it. */
export const getCharacters = cache((accessToken: string) =>
  fetchStalzone<Character[]>(`/${REGION}/characters`, accessToken),
);
