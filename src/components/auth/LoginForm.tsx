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
        className="flex h-12.5 items-center justify-center rounded-lg bg-[#17191e] text-[15.5px] font-semibold text-white"
      >
        Войти через EXBO
      </a>
      <ol className="flex flex-col gap-2.5 border-t border-[rgb(238,240,243)] pt-4.5">
        {LOGIN_STEPS.map((step, index) => (
          <li
            key={step}
            className="grid grid-cols-[28px_minmax(0,1fr)] gap-2 text-[13.5px] leading-[1.45] text-[rgb(79,85,96)]"
          >
            <span className="font-jetbrains-mono pt-px text-[12px] text-[rgb(163,169,178)]">
              {String(index + 1).padStart(2, "0")}
            </span>
            {step}
          </li>
        ))}
      </ol>
      <div className="font-jetbrains-mono text-[11.5px] text-[rgb(163,169,178)]">
        STALZONE API · OAuth 2.0 · eapi.stalzone.com
      </div>
    </>
  );
}
