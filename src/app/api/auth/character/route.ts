import { after, NextResponse, type NextRequest } from "next/server";
import {
  characterSelectionPath,
  getSession,
  loginPath,
  safeReturnTo,
  sealSession,
  sessionCookie,
} from "@/lib/auth/session";
import { APP_URL } from "@/lib/env";
import { isAllowedClan } from "@/lib/members/members";
import { rememberMembership } from "@/lib/members/roster";
import { getCharacters } from "@/lib/stalzone/characters";
import { StalzoneError } from "@/lib/stalzone/client";

const redirectTo = (path: string) =>
  NextResponse.redirect(new URL(path, APP_URL), 303);

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const characterId = form.get("character");
  const returnTo = safeReturnTo(form.get("returnTo"));

  const session = await getSession();
  if (!session) return redirectTo(loginPath(returnTo));

  try {
    const characters = await getCharacters(session.accessToken);
    // Checked here too, because the form's value comes from the browser.
    const clan = characters.find(
      ({ information }) => information.id === characterId,
    )?.clan;
    if (typeof characterId !== "string" || !isAllowedClan(clan?.info.id)) {
      return redirectTo(characterSelectionPath(returnTo));
    }
    if (clan) {
      after(() =>
        rememberMembership(characterId, clan).catch((error) =>
          console.error("Could not remember the membership:", error),
        ),
      );
    }

    const res = redirectTo(returnTo);
    res.cookies.set(
      sessionCookie(await sealSession({ ...session, characterId })),
    );
    return res;
  } catch (error) {
    if (error instanceof StalzoneError && error.status === 401) {
      return redirectTo(loginPath(returnTo));
    }
    throw error;
  }
}
