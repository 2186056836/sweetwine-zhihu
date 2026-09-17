import { setRequestLocale } from "next-intl/server";
import { TermsPage } from "@/components/static-pages";

export const metadata = { title: "服务条款" };

export default async function Route({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <TermsPage />;
}
