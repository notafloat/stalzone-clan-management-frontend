import "server-only";
import { requireSession } from "@/lib/auth/session";
import { REGION } from "@/lib/members/members";
import { fetchStalzone } from "./client";
import type { CharacterProfileData } from "./types";

async function getProfile(lookup: string): Promise<CharacterProfileData> {
  const session = await requireSession("/members");
  return fetchStalzone<CharacterProfileData>(
    `/${REGION}/character/${lookup}/profile`,
    session.accessToken,
  );
}

export const getProfileByUuid = (uuid: string) =>
  getProfile(`by-uuid/${encodeURIComponent(uuid)}`);

export const getProfileByName = (name: string) =>
  getProfile(`by-name/${encodeURIComponent(name)}`);
