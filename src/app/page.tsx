import { Suspense } from "react";
import {
  AccountPanel,
  type LoginSearchParams,
} from "@/components/auth/AccountPanel";
import { AuthShell } from "@/components/auth/AuthShell";

export default function LoginPage({
  searchParams,
}: {
  searchParams: LoginSearchParams;
}) {
  return (
    <AuthShell>
      <div className="flex w-full max-w-110 flex-col gap-5.5">
        <div>
          <span className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
            Панель клана
          </span>
          <h1 className="mt-2 text-[clamp(26px,3.4vw,34px)] leading-[1.15] tracking-[-0.015em]">
            Вход для участников [MOZG]
          </h1>
          <p className="mt-3 text-[15px] leading-[1.55] text-pretty text-ink-soft">
            Вход через аккаунт STALZONE: пароль вводится на сайте EXBO, сюда он
            не попадает.
          </p>
        </div>
        <Suspense fallback={<p>Загрузка…</p>}>
          <AccountPanel searchParams={searchParams} />
        </Suspense>
      </div>
    </AuthShell>
  );
}
