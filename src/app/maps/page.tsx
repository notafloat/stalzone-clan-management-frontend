import { connection } from "next/server";
import { Suspense } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { MapsView } from "@/components/maps/MapsView";
import { UnavailablePage } from "@/components/UnavailablePage";
import { getDb } from "@/lib/db/client";
import { getMaps, getPlans } from "@/lib/maps/store";
import { isOfficerRank } from "@/lib/members/members";
import { getCurrentMembership } from "@/lib/members/roster";
import { getLineup } from "@/lib/squads/store";

const MAPS_PATH = "/maps";

type MapsSearchParams = Promise<{ plan?: string }>;

export default function MapsPage({
  searchParams,
}: {
  searchParams: MapsSearchParams;
}) {
  return (
    <div className="font-golos">
      <SiteHeader />
      <Suspense
        fallback={
          <div className="m-6 h-96 animate-pulse rounded-md border border-solid border-line bg-surface" />
        }
      >
        <Maps searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Maps({ searchParams }: { searchParams: MapsSearchParams }) {
  await connection();
  const { clan } = await getCurrentMembership(MAPS_PATH);
  const unavailable = (message: string) => (
    <main className="mx-auto flex max-w-330 flex-col gap-4 px-[clamp(14px,3vw,32px)] pt-7 pb-28">
      <UnavailablePage
        eyebrow="Карты"
        title="Планы на картах"
        message={message}
      />
    </main>
  );

  const db = getDb();
  if (!db) return unavailable("Карты ещё не подключены к базе данных.");

  const loaded = await Promise.all([
    getMaps(db).then(async (maps) => ({
      maps,
      plans: await getPlans(db, maps),
    })),
    getLineup(db),
    searchParams,
  ]).catch((error) => {
    console.error("Could not load the map plans:", error);
    return null;
  });
  if (!loaded) return unavailable("Карты временно недоступны.");
  const [{ maps, plans }, { lineup }, { plan }] = loaded;

  return (
    <MapsView
      initialMaps={maps}
      initialPlans={plans}
      initialPlanId={plan}
      squads={lineup.squads}
      me={clan.member.name}
      canEdit={isOfficerRank(clan.member.rank)}
    />
  );
}
