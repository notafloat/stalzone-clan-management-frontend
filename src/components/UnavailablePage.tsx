export function UnavailablePage({
  eyebrow,
  title,
  message,
}: {
  eyebrow: string;
  title: string;
  message: string;
}) {
  return (
    <>
      <div className="border-b border-solid border-line pb-4">
        <div className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
          {eyebrow}
        </div>
        <h1 className="mt-1.5 text-[clamp(22px,3vw,28px)] leading-[1.15] font-semibold tracking-[-0.01em]">
          {title}
        </h1>
      </div>
      <div className="rounded-md border border-solid border-line bg-surface p-10 text-center text-sm text-muted">
        {message}
      </div>
    </>
  );
}
