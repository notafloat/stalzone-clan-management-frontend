import { connection } from "next/server";
import { getSession } from "@/lib/auth/session";
import { formatTimeLeft } from "@/lib/dates";
import { isOfficerRank, RANK_BY_ID, REGION } from "@/lib/members/members";
import { getDataUpdatedAt, loadMembership } from "@/lib/members/roster";
import { AccountMenu } from "./AccountMenu";
import { SyncButton } from "./SyncButton";

/** Shows nothing on failure: the page below reports or redirects by itself. */
export async function HeaderAccount() {
  await connection();
  const session = await getSession();
  if (!session) return null;

  const [clan, updatedAt] = await Promise.all([
    loadMembership(session.accessToken, session.characterId).catch(() => null),
    getDataUpdatedAt(),
  ]);
  if (!clan) return null;

  const { info, member } = clan;
  const rank = RANK_BY_ID[member.rank];
  const now = new Date();

  return (
    <>
      <SyncButton time={updatedAt} />
      <AccountMenu
        name={member.name}
        rankLabel={rank?.label ?? member.rank}
        rankBadge={rank?.badge ?? "bg-wash text-ink-soft"}
        clanLabel={`[${info.tag}] ${info.name} · ${REGION}`}
        sessionTimeLeft={formatTimeLeft(session.exp * 1000 - now.getTime())}
        showAdmin={isOfficerRank(member.rank)}
      />
    </>
  );
}
