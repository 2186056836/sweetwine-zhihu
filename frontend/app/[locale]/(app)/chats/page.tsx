import { setRequestLocale } from "next-intl/server";
import { ChatsList } from "@/components/chats-list";

export const metadata = { title: "聊天" };

export default async function ChatsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ChatsList />;
}
