import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { LoginForm } from "./LoginForm";

// A Map, because the key comes from the URL: on an object, "__proto__" would find a non-string value.
const LOGIN_ERRORS = new Map([
  ["denied", "Вход отменён на сайте EXBO."],
  ["state", "Время на вход истекло — попробуйте ещё раз."],
  ["token", "Не удалось войти через EXBO — попробуйте ещё раз."],
]);

export type LoginSearchParams = Promise<{ error?: string }>;

export async function AccountPanel({
  searchParams,
}: {
  searchParams: LoginSearchParams;
}) {
  const [{ error }, session] = await Promise.all([searchParams, getSession()]);
  const errorMessage = error ? LOGIN_ERRORS.get(error) : undefined;

  if (session && !errorMessage) redirect("/clan");

  return <LoginForm errorMessage={errorMessage} />;
}
