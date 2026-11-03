import { Suspense } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import {
  PlayerProfile,
  type PlayerParams,
} from "@/components/player/PlayerProfile";

export default function PlayerPage({ params }: { params: PlayerParams }) {
  return (
    <div className="font-golos">
      <SiteHeader />
      <main className="mx-auto flex max-w-280 flex-col gap-4.5 px-[clamp(14px,3vw,32px)] pt-5 pb-26">
        <Suspense
          fallback={
            <div className="h-96 animate-pulse rounded-md border border-solid border-[rgb(223,226,231)] bg-white" />
          }
        >
          <PlayerProfile params={params} />
        </Suspense>
      </main>
    </div>
  );
}
