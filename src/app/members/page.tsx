import { connection } from "next/server";
import { Suspense } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { MembersHeader } from "@/components/members/MembersHeader";
import { MembersView } from "@/components/members/MembersView";
import {
  getCurrentMembership,
  getDataUpdatedAt,
  getRoster,
} from "@/lib/members/roster";

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
            <div className="h-96 animate-pulse rounded-xl border border-gray-200 bg-white" />
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
  return (
    <>
      <MembersHeader
        clan={clan.info}
        memberCount={members.length}
        updatedAt={updatedAt}
      />
      <MembersView
        members={members}
        initialAttentionOnly={filter === "attention"}
      />
    </>
  );
}
