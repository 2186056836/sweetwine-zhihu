import { setRequestLocale } from "next-intl/server";
import { CreatePage } from "@/components/create-page";

export const metadata = { title: "创建 AI 角色" };

export default async function Route({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CreatePage />;
}
