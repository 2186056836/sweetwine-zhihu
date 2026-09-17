import { setRequestLocale } from "next-intl/server";
import { GroupChatPage } from "@/components/groupchat-page";

export const metadata = { title: "AI 群聊" };

export default async function GroupChatRoute({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <GroupChatPage />;
}
