import "server-only";
import { cacheLife } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { cache } from "react";
import {
  characterSelectionPath,
  loginPath,
  requireSession,
} from "@/lib/auth/session";
import { daysBetween } from "@/lib/dates";
import { getDb } from "@/lib/db/client";
import { getCharacters } from "@/lib/stalzone/characters";
import {
  fetchStalzone,
  fetchStalzonePublic,
  StalzoneError,
} from "@/lib/stalzone/client";
import type {
  CharacterClanInfo,
  CharacterProfileData,
  ClanMember,
} from "@/lib/stalzone/types";
import { recordRoster } from "@/lib/tracker/tracker";
import { isAllowedClan, RANK_BY_ID, REGION, type MemberData } from "./members";
import {
  getFreshTrackedAt,
  getStoredMembership,
  getStoredPlayers,
  linkCharacter,
  saveClanInfo,
} from "./store";

const MEMBERS_PATH = "/members";
const PROFILE_BATCH_SIZE = 8;
const ROSTER_REFRESH_MS = 5 * 60 * 1000;
const UNKNOWN_RANK_ORDER = 99;

const logFailure = (action: string) => (error: unknown) => {
  console.error(`Could not ${action}:`, error);
  return null;
};

/** Saved after a live check, so that later page loads can skip the API. */
export async function rememberMembership(
  characterId: string,
  clan: CharacterClanInfo,
) {
  const db = getDb();
  if (!db) return;
  await Promise.all([
    linkCharacter(db, characterId, clan.member.name),
    saveClanInfo(db, clan.info),
  ]);
}

const loadLiveMembership = cache(
  async (accessToken: string, characterId?: string) => {
    if (!characterId) return null;
    const characters = await getCharacters(accessToken);
    const clan = characters.find(
      ({ information }) => information.id === characterId,
    )?.clan;
    if (!clan || !isAllowedClan(clan.info.id)) return null;

    after(() =>
      rememberMembership(characterId, clan).catch(
        logFailure("remember the membership"),
      ),
    );
    return clan;
  },
);

/** Uses the tracker's data when it can, and only asks the API otherwise. */
export const loadMembership = cache(
  async (accessToken: string, characterId?: string) => {
    const db = getDb();
    if (db && characterId) {
      const stored = await getStoredMembership(db, characterId).catch(
        logFailure("read the membership"),
      );
      if (stored) return stored;
    }
    return loadLiveMembership(accessToken, characterId);
  },
);

/**
 * Redirects when signed out, or when the selected character is not in the allowed clan.
 * Pages may be up to one tracker run behind, so anything that changes data must pass
 * `live: true` to check the player's rank and clan as they are right now.
 */
export async function getCurrentMembership(
  returnTo: string,
  { live = false }: { live?: boolean } = {},
) {
  const session = await requireSession(returnTo);
  const load = live ? loadLiveMembership : loadMembership;

  const clan = await load(session.accessToken, session.characterId).catch(
    loginOnUnauthorized(returnTo),
  );
  if (!clan) redirect(characterSelectionPath(returnTo));

  return { session, clan };
}

const loginOnUnauthorized =
  (returnTo: string) =>
  (error: unknown): never => {
    if (error instanceof StalzoneError && error.status === 401) {
      redirect(loginPath(returnTo));
    }
    throw error;
  };

// This endpoint only accepts the token of a member of that clan.
const fetchClanMembers = (accessToken: string, clanId: string) =>
  fetchStalzone<ClanMember[]>(`/${REGION}/clan/${clanId}/members`, accessToken);

let lastRosterRefresh = 0;

/** New members only appear in the roster, so it's still read now and then. */
function refreshRosterInBackground(accessToken: string, clanId: string) {
  const now = Date.now();
  if (now - lastRosterRefresh < ROSTER_REFRESH_MS) return;
  lastRosterRefresh = now;

  after(() =>
    fetchClanMembers(accessToken, clanId)
      .then(recordRoster)
      .catch(logFailure("refresh the roster")),
  );
}

const rankOrder = (rank: string) =>
  RANK_BY_ID[rank as MemberData["rank"]]?.order ?? UNKNOWN_RANK_ORDER;

/**
 * Call after `await connection()`, because it reads the current time.
 * Leave out last logins when they aren't needed: without tracker data each one is an API call.
 */
export async function getRoster(
  returnTo: string = MEMBERS_PATH,
  { lastLogins = true }: { lastLogins?: boolean } = {},
): Promise<MemberData[]> {
  const { session, clan } = await getCurrentMembership(returnTo);
  const now = Date.now();

  const db = getDb();
  const stored = db
    ? await getStoredPlayers(db).catch(logFailure("read the roster"))
    : null;
  if (stored) {
    refreshRosterInBackground(session.accessToken, clan.info.id);
    return stored
      .map(({ name, rank, joinedAt, lastLogin }): MemberData => ({
        name,
        rank: rank as MemberData["rank"],
        joinTime: joinedAt,
        lastLogin,
        daysInClan: daysBetween(joinedAt, now) ?? 0,
        daysSinceLastLogin: daysBetween(lastLogin, now),
      }))
      .sort((a, b) => rankOrder(a.rank) - rankOrder(b.rank));
  }

  const clanMembers = await fetchClanMembers(
    session.accessToken,
    clan.info.id,
  ).catch(loginOnUnauthorized(returnTo));

  after(() => recordRoster(clanMembers).catch(logFailure("record the roster")));

  const logins = lastLogins
    ? await getLastLogins(clanMembers.map((member) => member.name))
    : {};

  return clanMembers.map((member): MemberData => {
    const login = logins[member.name];
    return {
      name: member.name,
      rank: member.rank,
      joinTime: new Date(member.joinTime),
      lastLogin: login ? new Date(login) : null,
      daysInClan: daysBetween(member.joinTime, now) ?? 0,
      daysSinceLastLogin: daysBetween(login, now),
    };
  });
}

/** When the data on screen was last checked. */
export async function getDataUpdatedAt(): Promise<Date> {
  const db = getDb();
  const trackedAt = db
    ? await getFreshTrackedAt(db).catch(logFailure("read the update time"))
    : null;
  return trackedAt ?? new Date();
}

/** A profile that fails to load leaves that player's last login empty. */
async function getLastLogins(
  names: string[],
): Promise<Record<string, string | null>> {
  const logins: Record<string, string | null> = {};
  for (let i = 0; i < names.length; i += PROFILE_BATCH_SIZE) {
    const batch = names.slice(i, i + PROFILE_BATCH_SIZE);
    const values = await Promise.all(
      batch.map((name) =>
        getPublicProfile(name)
          .then((profile) => profile?.lastLogin ?? null)
          .catch(() => null),
      ),
    );
    batch.forEach((name, index) => {
      logins[name] = values[index];
    });
  }
  return logins;
}

// Never pass tokens into a "use cache" function: arguments become the cache key in plain text.
export async function getPublicProfile(
  name: string,
): Promise<CharacterProfileData | null> {
  "use cache";
  cacheLife("minutes");
  try {
    return await fetchStalzonePublic<CharacterProfileData>(
      `/${REGION}/character/by-name/${encodeURIComponent(name)}/profile`,
    );
  } catch (error) {
    // Cache "unknown" for a missing profile. Rethrown errors (429, 5xx) are not cached and retry on the next view.
    if (error instanceof StalzoneError && error.status === 404) return null;
    throw error;
  }
}
