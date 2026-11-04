import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import {
  CharacterStep,
  type CharacterSearchParams,
} from "@/components/auth/CharacterStep";

export default function CharactersPage({
  searchParams,
}: {
  searchParams: CharacterSearchParams;
}) {
  return (
    <AuthShell>
      <Suspense
        fallback={
          <div className="h-96 w-full max-w-110 animate-pulse rounded-lg bg-wash" />
        }
      >
        <CharacterStep searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}
