import { setRequestLocale } from "next-intl/server";
import { PrivacyPolicyPage } from "@/components/static-pages";

export const metadata = { title: "隐私政策" };

export default async function Route({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PrivacyPolicyPage />;
}
