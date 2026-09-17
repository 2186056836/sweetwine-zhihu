import { setRequestLocale } from "next-intl/server";
import { DiscoverGrid } from "@/components/discover-grid";

export const metadata = { title: "发现" };

export default async function DiscoverPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <DiscoverGrid />;
}
