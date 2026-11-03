import { NextResponse, type NextRequest } from "next/server";
import { authorizeUrl } from "@/lib/auth/oauth";
import { STATE_COOKIE, STATE_COOKIE_PATH } from "@/lib/auth/session";
import { APP_URL } from "@/lib/env";

const STATE_MAX_AGE_SECONDS = 600;

export async function GET(req: NextRequest) {
  const state = crypto.randomUUID();
  const returnTo = req.nextUrl.searchParams.get("returnTo") || "/clan";

  const res = NextResponse.redirect(authorizeUrl(state));
  // CSRF protection: the same state must come back in the callback.
  res.cookies.set(STATE_COOKIE, JSON.stringify({ state, returnTo }), {
    httpOnly: true,
    // From APP_URL, because behind a reverse proxy the request itself can look like http.
    secure: APP_URL.startsWith("https://"),
    sameSite: "lax",
    path: STATE_COOKIE_PATH,
    maxAge: STATE_MAX_AGE_SECONDS,
  });
  return res;
}
