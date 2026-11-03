"use client";

import { useEffect } from "react";
import { STATUS_ACTION, StatusPage } from "@/components/StatusPage";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusPage
      eyebrow="Ошибка"
      title="Не удалось загрузить страницу"
      message="Возможно, STALZONE API сейчас недоступен. Попробуйте ещё раз через минуту."
    >
      <button type="button" onClick={reset} className={STATUS_ACTION}>
        Попробовать ещё раз
      </button>
    </StatusPage>
  );
}
