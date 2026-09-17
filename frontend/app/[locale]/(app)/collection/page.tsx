import { setRequestLocale } from "next-intl/server";
import { CollectionPage } from "@/components/collection-page";

export const metadata = { title: "收藏" };

export default async function Route({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CollectionPage />;
}
