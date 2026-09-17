import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

// There is no standalone /login route: auth is a modal triggered by
// ?auth=1&redirectTo=... (AuthQuerySync). Keep the path as an alias.
export default async function LoginAlias({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { next } = await searchParams;
  const target = next && next.startsWith("/") ? next : "/chats";
  redirect(`/${locale}?auth=1&redirectTo=${encodeURIComponent(target)}`);
}
