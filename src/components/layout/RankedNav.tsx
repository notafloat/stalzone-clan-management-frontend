import { connection } from "next/server";
import { getSession } from "@/lib/auth/session";
import { isOfficerRank } from "@/lib/members/members";
import { loadMembership } from "@/lib/members/roster";
import { HeaderNav } from "./HeaderNav";

/** The admin link only appears for officers and above. */
export async function RankedHeaderNav() {
  await connection();
  const session = await getSession();
  const clan = session
    ? await loadMembership(session.accessToken, session.characterId).catch(
        () => null,
      )
    : null;
  return (
    <HeaderNav showAdmin={clan ? isOfficerRank(clan.member.rank) : false} />
  );
}
