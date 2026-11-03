import Link from "next/link";
import { STATUS_ACTION, StatusPage } from "@/components/StatusPage";

export default function NotFound() {
  return (
    <StatusPage
      eyebrow="Ошибка 404"
      title="Страница не найдена"
      message="Возможно, ссылка устарела или в адресе опечатка."
    >
      <Link href="/clan" className={STATUS_ACTION}>
        На страницу клана
      </Link>
    </StatusPage>
  );
}
