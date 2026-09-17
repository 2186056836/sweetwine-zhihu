import { setRequestLocale } from "next-intl/server";
import { CampusPage } from "@/components/campus-page";

export const metadata = { title: "校园心事 · 知乎陪伴" };

export default async function CampusRoute({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CampusPage />;
}
