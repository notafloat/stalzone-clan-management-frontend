// Encrypted cookie session (no database): the EXBO tokens never reach the browser in readable form.
import "server-only";
import { EncryptJWT, jwtDecrypt } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { APP_URL, SESSION_SECRET } from "@/lib/env";
import type { Tokens } from "./oauth";

export const SESSION_COOKIE = "stalzone_session";
export const STATE_COOKIE = "stalzone_oauth_state";
export const STATE_COOKIE_PATH = "/api/auth";

const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export type Session = {
  userId: number;
  login: string;
  accessToken: string;
  /** Set on the character selection step, after login. */
  characterId?: string;
};

type SealedSession = Session & {
  /** When the session ends, in epoch seconds. Sealing again renews it. */
  exp: number;
};

let key: Promise<Uint8Array> | undefined;

/** Derives the 32-byte A256GCM key from SESSION_SECRET. */
function getKey() {
  key ??= crypto.subtle
    .digest("SHA-256", new TextEncoder().encode(SESSION_SECRET))
    .then((digest) => new Uint8Array(digest));
  return key;
}

export async function sealSession(session: Session) {
  return new EncryptJWT({ ...session })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .encrypt(await getKey());
}

export async function unsealSession(
  token?: string,
): Promise<SealedSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtDecrypt(token, await getKey());
    return payload as unknown as SealedSession;
  } catch {
    return null; // tampered, expired or sealed with an old secret
  }
}

export function sessionCookie(value: string) {
  return {
    name: SESSION_COOKIE,
    value,
    httpOnly: true,
    secure: APP_URL?.startsWith("https://") ?? true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export function sessionFromTokens(
  tokens: Tokens,
  user: { id: number; login: string },
): Session {
  return {
    userId: user.id,
    login: user.login,
    accessToken: tokens.access_token,
  };
}

/** Deduped per request. */
export const getSession = cache(async () =>
  unsealSession((await cookies()).get(SESSION_COOKIE)?.value),
);

export const loginPath = (returnTo: string) =>
  `/api/auth/login?returnTo=${returnTo}`;

export const characterSelectionPath = (returnTo: string) =>
  `/characters?returnTo=${encodeURIComponent(returnTo)}`;

/** Only local paths are allowed, to prevent an open redirect. */
export function safeReturnTo(path: unknown) {
  return typeof path === "string" &&
    path.startsWith("/") &&
    !path.startsWith("//")
    ? path
    : "/members";
}

export async function requireSession(returnTo: string): Promise<Session> {
  const session = await getSession();
  if (!session) redirect(loginPath(returnTo));
  return session;
}
