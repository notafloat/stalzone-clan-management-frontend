import Image from "next/image";
import type { ReactNode } from "react";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="font-golos">
      <main>
        <div className="flex min-h-screen flex-wrap bg-white">
          <div
            className="relative min-h-57.5 flex-1 overflow-hidden bg-[#17191e]"
            style={{ flexBasis: 520 }}
          >
            <Image
              src="/malaya-berdovka.webp"
              alt=""
              fill
              sizes="100vw"
              className="block object-cover"
            />
          </div>
          <div
            className="flex min-w-0 flex-col justify-between gap-8 px-[clamp(20px,5vw,64px)] py-[clamp(22px,5vw,56px)]"
            style={{ flex: "1 1 420px" }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="font-jetbrains-mono text-3 rounded-sm bg-[oklch(0.93_0.13_120)] px-1.75 py-1.5 leading-none font-semibold tracking-[0.06em]">
                  MOZG
                </span>
                <span className="text-[15px] font-semibold">
                  Zero Braincells
                </span>
              </div>
              <span className="text-[13px] text-[rgb(134,140,150)]">
                Наёмники
              </span>
            </div>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
