import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/db/client";
import { CRON_SECRET } from "@/lib/env";
import { runTracker } from "@/lib/tracker/tracker";

const sha256 = (value: string) => createHash("sha256").update(value).digest();

function isAuthorized(req: NextRequest, secret: string) {
  const header = req.headers.get("authorization") ?? "";
  return timingSafeEqual(sha256(header), sha256(`Bearer ${secret}`));
}

export async function POST(req: NextRequest) {
  const db = getDb();
  if (!CRON_SECRET || !db) {
    return NextResponse.json(
      { error: "CRON_SECRET and DATABASE_URL must be set" },
      { status: 503 },
    );
  }
  if (!isAuthorized(req, CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await runTracker(db));
}
