import { setRequestLocale } from "next-intl/server";
import { GroupChatRoomById } from "@/components/groupchat-page";

export const metadata = { title: "AI 群聊房间" };

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <GroupChatRoomById id={id} />;
}
