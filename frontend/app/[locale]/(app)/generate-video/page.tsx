import { setRequestLocale } from "next-intl/server";
import { GenerateVideoPage } from "@/components/generate-pages";

export const metadata = { title: "生成视频" };

export default async function Route({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <GenerateVideoPage />;
}
