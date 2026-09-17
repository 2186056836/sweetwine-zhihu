import { setRequestLocale } from "next-intl/server";
import { SettingsProfilePage } from "@/components/settings-page";

export const metadata = { title: "账户设置" };

export default async function Route({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <SettingsProfilePage />;
}
