import { setRequestLocale } from "next-intl/server";
import { RoleplayRoomById } from "@/components/roleplay-page";

export const metadata = { title: "角色扮演 | SweetWine" };

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <RoleplayRoomById id={decodeURIComponent(id)} />;
}
