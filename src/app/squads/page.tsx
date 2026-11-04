import { connection } from "next/server";
import { Suspense } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SquadsView } from "@/components/squads/SquadsView";
import { UnavailablePage } from "@/components/UnavailablePage";
import { getDb } from "@/lib/db/client";
import { isOfficerRank } from "@/lib/members/members";
import { getCurrentMembership, getRoster } from "@/lib/members/roster";
import { getTemplateSettings } from "@/lib/settings/store";
import { getLineup } from "@/lib/squads/store";

const SQUADS_PATH = "/squads";

export default function SquadsPage() {
  return (
    <div className="font-golos">
      <SiteHeader />
      <main className="mx-auto flex max-w-390 flex-col gap-4 px-[clamp(14px,3vw,32px)] pt-7 pb-28">
        <Suspense
          fallback={
            <div className="h-96 animate-pulse rounded-md border border-solid border-line bg-surface" />
          }
        >
          <Squads />
        </Suspense>
      </main>
    </div>
  );
}

async function Squads() {
  await connection();
  const [{ clan }, members] = await Promise.all([
    getCurrentMembership(SQUADS_PATH),
    getRoster(SQUADS_PATH, { lastLogins: false }),
  ]);

  const unavailable = (message: string) => (
    <UnavailablePage eyebrow="Отряды · сбор" title="Отряды" message={message} />
  );

  const db = getDb();
  if (!db) return unavailable("Отряды ещё не подключены к базе данных.");

  const saved = await getLineup(db).catch((error) => {
    console.error("Could not load the lineup:", error);
    return null;
  });
  if (!saved) return unavailable("Отряды временно недоступны.");
  const { templates } = await getTemplateSettings();

  return (
    <SquadsView
      initialLineup={saved.lineup}
      initialVersion={saved.version}
      members={members.map(({ name, rank }) => ({ name, rank }))}
      me={clan.member.name}
      canEdit={isOfficerRank(clan.member.rank)}
      templates={templates}
    />
  );
}
