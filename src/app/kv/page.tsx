import { connection } from "next/server";
import { Suspense } from "react";
import { KvView } from "@/components/kv/KvView";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { UnavailablePage } from "@/components/UnavailablePage";
import { dayKey } from "@/lib/dates";
import { getDb } from "@/lib/db/client";
import { getKvData, getKvPlayers } from "@/lib/kv/store";
import { isOfficerRank } from "@/lib/members/members";
import { getCurrentMembership } from "@/lib/members/roster";
import { getKvRules } from "@/lib/settings/store";
import { getLineup } from "@/lib/squads/store";

type KvSearchParams = Promise<{ war?: string }>;

export default function KvPage({
  searchParams,
}: {
  searchParams: KvSearchParams;
}) {
  return (
    <div className="font-golos">
      <SiteHeader />
      <main className="mx-auto flex max-w-330 flex-col gap-4 px-[clamp(14px,3vw,32px)] pt-7 pb-28">
        <Suspense
          fallback={
            <div className="h-96 animate-pulse rounded-md border border-solid border-line bg-surface" />
          }
        >
          <Kv searchParams={searchParams} />
        </Suspense>
      </main>
    </div>
  );
}

async function Kv({ searchParams }: { searchParams: KvSearchParams }) {
  await connection();
  const { clan } = await getCurrentMembership("/kv");
  const unavailable = (message: string) => (
    <UnavailablePage
      eyebrow="Клановые войны"
      title="Активность на КВ"
      message={message}
    />
  );

  const db = getDb();
  if (!db) return unavailable("КВ ещё не подключены к базе данных.");

  const loaded = await Promise.all([
    getKvData(db),
    getKvPlayers(db),
    getKvRules(),
    getLineup(db),
    searchParams,
  ]).catch((error) => {
    console.error("Could not load clan wars:", error);
    return null;
  });
  if (!loaded) return unavailable("КВ временно недоступны.");
  const [{ wars, marks }, players, rules, { lineup }, { war }] = loaded;

  return (
    <KvView
      // Starts over once a war is added or removed, as the view keeps its own copy to edit.
      key={wars.map(({ date }) => date).join()}
      wars={wars}
      marks={marks}
      players={players}
      rules={rules}
      planOrder={lineup.squads.map(({ name }) => name)}
      me={clan.member.name}
      canEdit={isOfficerRank(clan.member.rank)}
      today={dayKey(new Date())}
      initialWar={war}
    />
  );
}
