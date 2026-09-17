import { setRequestLocale } from "next-intl/server";
import { RoleplayPage } from "@/components/roleplay-page";

export const metadata = { title: "角色扮演" };

export default async function RoleplayRoute({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <RoleplayPage />;
}
