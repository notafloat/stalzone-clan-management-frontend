import "server-only";
import {
  APP_URL,
  EXBO_CLIENT_ID,
  EXBO_CLIENT_SECRET,
  EXBO_OAUTH_URL,
} from "@/lib/env";
import { parseJson } from "@/lib/stalzone/client";

// Must match a redirect URI registered for the app in @stalzone_api_bot (/myapps), character for character.
const REDIRECT_URI = `${APP_URL}/api/auth/callback`;

export type Tokens = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
};

type ExboUser = {
  id: number;
  uuid: string;
  login: string;
  display_login: string | null;
};

export function authorizeUrl(state: string) {
  const query = new URLSearchParams({
    client_id: EXBO_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    // EXBO requires the parameter, but it must be empty for now.
    scope: "",
    response_type: "code",
    state,
  });
  return `${EXBO_OAUTH_URL}/authorize?${query}`;
}

async function requestTokens(params: Record<string, string>) {
  const res = await fetch(`${EXBO_OAUTH_URL}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      client_id: EXBO_CLIENT_ID,
      client_secret: EXBO_CLIENT_SECRET,
      ...params,
    }),
    cache: "no-store",
  });
  return parseJson<Tokens>(res);
}

export const exchangeCode = (code: string) =>
  requestTokens({
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
  });

export async function getExboUser(accessToken: string) {
  const res = await fetch(`${EXBO_OAUTH_URL}/user`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  return parseJson<ExboUser>(res);
}
