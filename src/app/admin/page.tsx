import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { AdminView } from "@/components/admin/AdminView";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { UnavailablePage } from "@/components/UnavailablePage";
import { getDb } from "@/lib/db/client";
import { getKvData } from "@/lib/kv/store";
import { isOfficerRank } from "@/lib/members/members";
import { getCurrentMembership, getRoster } from "@/lib/members/roster";
import {
  getAbsenceRules,
  getKvRules,
  getTemplateSettings,
} from "@/lib/settings/store";
import { getLineup } from "@/lib/squads/store";

const ADMIN_PATH = "/admin";

type AdminSearchParams = Promise<{ tab?: string }>;

export default function AdminPage({
  searchParams,
}: {
  searchParams: AdminSearchParams;
}) {
  return (
    <div className="font-golos">
      <SiteHeader />
      <main className="mx-auto flex max-w-300 flex-col gap-4.5 px-[clamp(14px,3vw,32px)] pt-7 pb-28">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2.5 border-b border-solid border-line pb-4">
          <div>
            <div className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
              Админ-панель
            </div>
            <h1 className="mt-1.5 text-[clamp(22px,3vw,28px)] leading-[1.15] font-semibold tracking-[-0.01em]">
              Настройки клана
            </h1>
          </div>
          <div className="text-[13px] text-muted">
            Доступ: Лидер, Полковник, Офицер
          </div>
        </div>
        <Suspense
          fallback={
            <div className="h-96 animate-pulse rounded-md border border-solid border-line bg-surface" />
          }
        >
          <Admin searchParams={searchParams} />
        </Suspense>
      </main>
    </div>
  );
}

async function Admin({ searchParams }: { searchParams: AdminSearchParams }) {
  await connection();
  const { clan } = await getCurrentMembership(ADMIN_PATH);

  // Settings are only loaded after this check, so they never reach anyone else's browser.
  if (!isOfficerRank(clan.member.rank)) {
    return (
      <section className="max-w-140 rounded-md border border-solid border-line bg-surface p-6">
        <div className="text-lg font-semibold">Нет доступа</div>
        <p className="mt-2 mb-4 text-[14.5px] leading-[1.55] text-ink-soft">
          Админ-панель доступна званиям Лидер, Полковник и Офицер. Звание
          берётся из игры.
        </p>
        <Link href="/clan" className="text-sm text-ink-soft">
          ← На страницу клана
        </Link>
      </section>
    );
  }

  const db = getDb();
  if (!db) {
    return (
      <UnavailablePage
        eyebrow="Админ-панель"
        title="Настройки клана"
        message="Настройки ещё не подключены к базе данных."
      />
    );
  }

  const [
    members,
    rules,
    kvRules,
    templateSettings,
    { lineup },
    { wars },
    { tab },
  ] = await Promise.all([
    getRoster(ADMIN_PATH),
    getAbsenceRules(),
    getKvRules(),
    getTemplateSettings(),
    getLineup(db),
    getKvData(db),
    searchParams,
  ]);

  return (
    <AdminView
      initialTab={tab}
      members={members}
      initialRules={rules}
      initialKvRules={kvRules}
      initialTemplates={templateSettings}
      eventName={lineup.event}
      wars={wars}
    />
  );
}
