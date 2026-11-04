import { Suspense } from "react";
import { ClanOverview } from "@/components/clan/ClanOverview";
import { SiteHeader } from "@/components/layout/SiteHeader";

export default function ClanPage() {
  return (
    <div className="font-golos">
      <SiteHeader />
      <main className="mx-auto flex max-w-330 flex-col gap-5 px-[clamp(14px,3vw,32px)] pt-7 pb-26">
        <Suspense
          fallback={
            <div className="h-96 animate-pulse rounded-md border border-solid border-line bg-surface" />
          }
        >
          <ClanOverview />
        </Suspense>
      </main>
    </div>
  );
}
