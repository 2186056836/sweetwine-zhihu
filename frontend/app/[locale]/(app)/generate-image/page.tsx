import { setRequestLocale } from "next-intl/server";
import { GenerateImagePage } from "@/components/generate-pages";

export const metadata = { title: "生成图像" };

export default async function Route({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <GenerateImagePage />;
}
