import { connection } from "next/server";
import { Suspense } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { MembersHeader } from "@/components/members/MembersHeader";
import { MembersView } from "@/components/members/MembersView";
import { getDb } from "@/lib/db/client";
import { isOfficerRank } from "@/lib/members/members";
import {
  getCurrentMembership,
  getDataUpdatedAt,
  getRoster,
} from "@/lib/members/roster";
import { getMemberNotes } from "@/lib/members/store";
import { getAbsenceRules } from "@/lib/settings/store";

const MEMBERS_PATH = "/members";

type MembersSearchParams = Promise<{ filter?: string }>;

export default function MembersPage({
  searchParams,
}: {
  searchParams: MembersSearchParams;
}) {
  return (
    <div className="font-golos">
      <SiteHeader />
      <main className="mx-auto flex max-w-330 flex-col gap-4 px-[clamp(14px,3vw,32px)] pt-7 pb-26">
        <Suspense
          fallback={
            <div className="h-96 animate-pulse rounded-xl border border-line bg-surface" />
          }
        >
          <Roster searchParams={searchParams} />
        </Suspense>
      </main>
    </div>
  );
}

async function Roster({ searchParams }: { searchParams: MembersSearchParams }) {
  await connection();
  const [{ filter }, { clan }, members, updatedAt] = await Promise.all([
    searchParams,
    getCurrentMembership(MEMBERS_PATH),
    getRoster(MEMBERS_PATH),
    getDataUpdatedAt(),
  ]);

  const rules = await getAbsenceRules();
  const db = getDb();
  const canEditNotes = Boolean(db) && isOfficerRank(clan.member.rank);
  // Fetched only after the rank check, so that notes never reach anyone else's browser.
  const notes =
    db && canEditNotes
      ? await getMemberNotes(db).catch((error) => {
          console.error("Could not load member notes:", error);
          return null;
        })
      : null;

  return (
    <>
      <MembersHeader
        clan={clan.info}
        memberCount={members.length}
        updatedAt={updatedAt}
      />
      <MembersView
        members={members.map((member) => {
          const saved = notes?.get(member.name);
          return {
            ...member,
            note: saved?.note ?? undefined,
            noteUpdatedBy: saved?.noteUpdatedBy ?? undefined,
          };
        })}
        initialAttentionOnly={filter === "attention"}
        canEditNotes={canEditNotes}
        rules={rules}
      />
    </>
  );
}
