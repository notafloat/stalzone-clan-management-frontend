import "server-only";
import {
  EXBO_CLIENT_ID,
  EXBO_CLIENT_SECRET,
  STALZONE_API_URL,
} from "@/lib/env";

export class StalzoneError extends Error {
  constructor(
    public status: number,
    body: string,
  ) {
    super(`Stalzone ${status}: ${body.slice(0, 200)}`);
  }
}

export async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) throw new StalzoneError(res.status, await res.text());
  return res.json() as Promise<T>;
}

export async function fetchStalzone<T>(
  path: string,
  accessToken: string,
): Promise<T> {
  const res = await fetch(`${STALZONE_API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  return parseJson<T>(res);
}

/** Public data, authenticated with the app's credentials instead of a user token. */
export async function fetchStalzonePublic<T>(
  path: string,
  revalidate = 60,
): Promise<T> {
  const res = await fetch(`${STALZONE_API_URL}${path}`, {
    headers: {
      "Client-Id": EXBO_CLIENT_ID,
      "Client-Secret": EXBO_CLIENT_SECRET,
      Accept: "application/json",
    },
    next: { revalidate },
  });
  return parseJson<T>(res);
}
