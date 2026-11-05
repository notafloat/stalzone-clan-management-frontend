import { NextResponse, type NextRequest } from "next/server";
import { connection } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { isPlanId } from "@/lib/maps/maps";
import { getMapImage } from "@/lib/maps/store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await connection();
  if (!(await getSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const db = getDb();
  const image = db && isPlanId(id) ? await getMapImage(db, id) : null;
  if (!image) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // An uploaded map never changes: replacing one means a new upload with a new id.
  return new NextResponse(new Uint8Array(image), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
