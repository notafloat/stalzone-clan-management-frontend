import { NextResponse, type NextRequest } from "next/server";
import { APP_URL } from "@/lib/env";
import { prepareMapImage } from "@/lib/maps/image";
import { MAX_MAP_FILE_BYTES, MAX_MAP_NAME_LENGTH } from "@/lib/maps/maps";
import { addCustomMap, countCustomMaps } from "@/lib/maps/store";
import { getOfficerContext } from "@/lib/members/roster";

const MAX_CUSTOM_MAPS = 30;
/** Room for the form's other fields around the file. */
const MAX_REQUEST_BYTES = MAX_MAP_FILE_BYTES + 64 * 1024;

const refuse = (error: string, status: number) =>
  NextResponse.json({ error }, { status });

/** A file is too big for a server action's 1 MB limit, so this is its own endpoint. */
export async function POST(req: NextRequest) {
  if (req.headers.get("origin") !== new URL(APP_URL).origin) {
    return refuse("forbidden", 403);
  }
  const officer = await getOfficerContext("/maps");
  if (!officer) return refuse("forbidden", 403);

  if (Number(req.headers.get("content-length")) > MAX_REQUEST_BYTES) {
    return refuse("too_large", 413);
  }
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const rawName = form?.get("name");
  const name = typeof rawName === "string" ? rawName.trim() : "";
  if (!name || name.length > MAX_MAP_NAME_LENGTH) {
    return refuse("bad_name", 400);
  }
  if (!(file instanceof File)) return refuse("bad_image", 400);
  if (file.size > MAX_MAP_FILE_BYTES) return refuse("too_large", 413);

  if ((await countCustomMaps(officer.db)) >= MAX_CUSTOM_MAPS) {
    return refuse("too_many", 409);
  }
  const image = await prepareMapImage(Buffer.from(await file.arrayBuffer()));
  if (!image) return refuse("bad_image", 400);

  const map = await addCustomMap(officer.db, name, image, officer.name);
  return NextResponse.json({ map }, { status: 201 });
}
