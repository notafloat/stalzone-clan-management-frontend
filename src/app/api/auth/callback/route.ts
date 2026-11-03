import { NextResponse, type NextRequest } from "next/server";
import { exchangeCode, getExboUser } from "@/lib/auth/oauth";
import {
  STATE_COOKIE,
  STATE_COOKIE_PATH,
  characterSelectionPath,
  safeReturnTo,
  sealSession,
  sessionCookie,
  sessionFromTokens,
} from "@/lib/auth/session";
import { APP_URL } from "@/lib/env";

type SavedState = { state?: string; returnTo?: string };

function readSavedState(req: NextRequest): SavedState {
  try {
    return JSON.parse(req.cookies.get(STATE_COOKIE)?.value ?? "{}");
  } catch {
    return {};
  }
}

function redirectClearingState(path: string) {
  const res = NextResponse.redirect(new URL(path, APP_URL));
  res.cookies.delete({ name: STATE_COOKIE, path: STATE_COOKIE_PATH });
  return res;
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const fail = (reason: string) => redirectClearingState(`/?error=${reason}`);

  const saved = readSavedState(req);

  if (params.get("error")) return fail("denied");
  const code = params.get("code");
  if (!code || !saved.state || params.get("state") !== saved.state) {
    return fail("state");
  }

  try {
    const tokens = await exchangeCode(code);
    const user = await getExboUser(tokens.access_token);
    const session = sessionFromTokens(tokens, {
      id: user.id,
      login: user.display_login || user.login,
    });

    const res = redirectClearingState(
      characterSelectionPath(safeReturnTo(saved.returnTo)),
    );
    res.cookies.set(sessionCookie(await sealSession(session)));
    return res;
  } catch (error) {
    console.error("EXBO callback failed:", error);
    return fail("token");
  }
}
