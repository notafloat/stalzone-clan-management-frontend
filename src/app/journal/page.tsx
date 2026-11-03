import { connection } from "next/server";
import { Suspense } from "react";
import { JournalView } from "@/components/journal/JournalView";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { UnavailablePage } from "@/components/UnavailablePage";
import { getDb } from "@/lib/db/client";
import { isOfficerRank } from "@/lib/members/members";
import { getCurrentMembership } from "@/lib/members/roster";
import { getJournalEvents } from "@/lib/tracker/journal";

export default function JournalPage() {
  return (
    <div className="font-golos">
      <SiteHeader />
      <main className="mx-auto flex max-w-330 flex-col gap-4 px-[clamp(14px,3vw,32px)] pt-7 pb-26">
        <Suspense
          fallback={
            <div className="h-96 animate-pulse rounded-md border border-solid border-[rgb(223,226,231)] bg-white" />
          }
        >
          <Journal />
        </Suspense>
      </main>
    </div>
  );
}

async function Journal() {
  await connection();
  const { clan } = await getCurrentMembership("/journal");
  const canEditNotes = isOfficerRank(clan.member.rank);
  const unavailable = (message: string) => (
    <UnavailablePage eyebrow="Журнал" title="События клана" message={message} />
  );

  const db = getDb();
  if (!db) return unavailable("Журнал ещё не подключён к базе данных.");

  const events = await getJournalEvents(db, {
    includeNotes: canEditNotes,
  }).catch((error) => {
    console.error("Could not load the journal:", error);
    return null;
  });
  if (!events) return unavailable("Журнал временно недоступен.");

  return <JournalView events={events} canEditNotes={canEditNotes} />;
}
