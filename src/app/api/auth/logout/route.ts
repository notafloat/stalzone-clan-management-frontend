import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { APP_URL } from "@/lib/env";

// POST only: a GET logout could be triggered by other sites.
export async function POST() {
  const res = NextResponse.redirect(new URL("/", APP_URL), 303);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
