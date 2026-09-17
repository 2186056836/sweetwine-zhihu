import { setRequestLocale } from "next-intl/server";
import { MyAiPage } from "@/components/my-ai-page";

export const metadata = { title: "我的 AI" };

export default async function Route({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <MyAiPage />;
}
