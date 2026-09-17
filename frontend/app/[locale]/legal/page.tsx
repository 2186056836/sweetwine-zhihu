import { setRequestLocale } from "next-intl/server";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { Footer } from "@/components/marketing/footer";

export const metadata = { title: "法律 | SweetWine" };

const DOCS: Array<{ href: string; zh: string; en: string }> = [
  { href: "/legal/privacy-policy", zh: "隐私政策", en: "Privacy Policy" },
  { href: "/legal/terms-and-conditions", zh: "条款与条件", en: "Terms and Conditions" },
  { href: "/legal/cookie-policy", zh: "Cookie 政策", en: "Cookie Policy" },
  { href: "/legal/blocked-content-policy", zh: "受限内容政策", en: "Blocked Content Policy" },
  { href: "/legal/community-guidelines", zh: "社区准则", en: "Community Guidelines" },
  { href: "/legal/complaint-policy", zh: "投诉政策", en: "Complaint Policy" },
  { href: "/legal/content-removal-policy", zh: "内容删除政策", en: "Content Removal Policy" },
  { href: "/legal/content-reporting-policy", zh: "内容举报政策", en: "Content Reporting Policy" },
  { href: "/legal/underage-policy", zh: "未成年人政策", en: "Underage Policy" },
];

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="min-h-screen flex flex-col text-foreground">
      <MarketingNav />
      <div className="flex-1 pt-topbar">
        <main className="py-16">
          <div className="max-w-3xl mx-auto px-4 md:px-6">
            <h1 className="text-4xl md:text-5xl font-black mb-4">法律</h1>
            <p className="text-on-surface-variant mb-10">
              管理 SweetWine 服务的政策与条款。
            </p>
            <div className="space-y-3">
              {DOCS.map((d) => (
                <a
                  key={d.href}
                  href={`/${locale}${d.href}`}
                  className="glass-flat flex items-center justify-between rounded-xl px-5 py-4 transition-colors hover:bg-white/5"
                >
                  <span className="font-semibold">{d.zh}</span>
                  <span className="text-sm text-muted-foreground">{d.en}</span>
                </a>
              ))}
            </div>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
