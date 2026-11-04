const LOGIN_STEPS = [
  "Вход на сайте EXBO и разрешение читать список персонажей",
  "Выбор персонажа — проверяем, что он состоит в клане [MOZG]",
  "Сайт запоминает вход на 30 дней",
];

export function LoginForm({ errorMessage }: { errorMessage?: string }) {
  return (
    <>
      {errorMessage && (
        <p
          role="alert"
          className="text-[15px] leading-[1.55] text-pretty text-[rgb(255,85,96)]"
        >
          {errorMessage}
        </p>
      )}
      {/* A plain link: next/link would prefetch this route, setting its cookies before any click. */}
      <a
        href="/api/auth/login"
        className="flex h-12.5 items-center justify-center rounded-lg bg-ink text-[15.5px] font-semibold text-on-ink"
      >
        Войти через EXBO
      </a>
      <ol className="flex flex-col gap-2.5 border-t border-line-soft pt-4.5">
        {LOGIN_STEPS.map((step, index) => (
          <li
            key={step}
            className="grid grid-cols-[28px_minmax(0,1fr)] gap-2 text-[13.5px] leading-[1.45] text-ink-soft"
          >
            <span className="pt-px font-jetbrains-mono text-[12px] text-dim-163">
              {String(index + 1).padStart(2, "0")}
            </span>
            {step}
          </li>
        ))}
      </ol>
      <div className="font-jetbrains-mono text-[11.5px] text-dim-163">
        STALZONE API · OAuth 2.0 · eapi.stalzone.com
      </div>
    </>
  );
}
