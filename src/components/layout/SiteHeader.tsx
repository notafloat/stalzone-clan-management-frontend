import { Suspense } from "react";
import { AppHeader } from "./AppHeader";
import { HeaderAccount } from "./HeaderAccount";

export function SiteHeader() {
  return (
    <AppHeader>
      <Suspense fallback={null}>
        <HeaderAccount />
      </Suspense>
    </AppHeader>
  );
}
