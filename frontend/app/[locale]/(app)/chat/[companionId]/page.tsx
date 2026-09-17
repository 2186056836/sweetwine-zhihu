import { setRequestLocale } from "next-intl/server";
import { ChatView } from "@/components/chat-view";

// Route shape: /chat/[companionId] where the param value
// is the companion slug (as reference in the live flight route tree).
export default async function ChatPage({
  params,
}: {
  params: Promise<{ locale: string; companionId: string }>;
}) {
  const { locale, companionId } = await params;
  setRequestLocale(locale);
  const slug = decodeURIComponent(companionId);
  return <ChatView slug={slug} />;
}
