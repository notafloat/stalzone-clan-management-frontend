import { redirect } from "next/navigation";
import { loginPath, requireSession, safeReturnTo } from "@/lib/auth/session";
import { isAllowedClan, RANK_BY_ID, REGION } from "@/lib/members/members";
import { getCharacters, type Character } from "@/lib/stalzone/characters";
import { StalzoneError } from "@/lib/stalzone/client";
import { CharacterPicker, type CharacterOption } from "./CharacterPicker";

export type CharacterSearchParams = Promise<{ returnTo?: string }>;

function toOption({ information, clan }: Character): CharacterOption {
  const rank = clan?.member.rank;
  return {
    id: information.id,
    name: information.name,
    description: clan
      ? `[${clan.info.tag}] ${clan.info.name} · ${RANK_BY_ID[clan.member.rank]?.label ?? rank}`
      : "без клана",
    isAllowed: isAllowedClan(clan?.info.id),
  };
}

export async function CharacterStep({
  searchParams,
}: {
  searchParams: CharacterSearchParams;
}) {
  const returnTo = safeReturnTo((await searchParams).returnTo);
  const session = await requireSession(returnTo);

  const characters = await getCharacters(session.accessToken).catch(
    (error): never => {
      if (error instanceof StalzoneError && error.status === 401) {
        redirect(loginPath(returnTo));
      }
      throw error;
    },
  );

  return (
    <div className="flex w-full max-w-110 flex-col gap-4.5">
      <form action="/api/auth/logout" method="post" className="self-start">
        <button className="h-7.5 cursor-pointer border-0 bg-transparent p-0 text-[13.5px] text-ink-soft">
          ← Другой аккаунт
        </button>
      </form>
      <div>
        <div className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
          Аккаунт EXBO · {REGION}
        </div>
        <h1 className="mt-2 text-[clamp(26px,3.4vw,34px)] leading-[1.15] font-semibold tracking-[-0.015em]">
          Выберите персонажа
        </h1>
        <p className="mt-2.5 text-[15px] leading-[1.55] text-ink-soft">
          Войти можно персонажем из клана [MOZG].
        </p>
      </div>
      <CharacterPicker
        characters={characters.map(toOption)}
        initialId={session.characterId}
        returnTo={returnTo}
      />
      <p className="text-[12.5px] leading-[1.55] text-muted">
        Вход действует 30 дней. Клан проверяется при каждом открытии страницы —
        если игрок покинет клан, доступ закроется сам.
      </p>
    </div>
  );
}
