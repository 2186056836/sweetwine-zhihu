// Auto-generated static SEO page.
// Marketing shell: MarketingNav + converted content + Footer.
import { MarketingNav } from "../marketing-nav";
import { Footer } from "../footer";
import { MarketingBannerCarousel } from "@/components/home/marketing-banner-carousel";

export const metadata = { title: "新闻与新闻稿 | SweetWine" };

export function SeoNewsPage({ authenticated = false }: { authenticated?: boolean }) {
  return (
    <div className="min-h-screen flex flex-col text-foreground">
      <MarketingNav />
      <div className="flex-1 pt-topbar">
        <main className="container mx-auto px-4 md:px-6 pb-16 max-w-5xl"><div className="relative text-center py-16 mb-4"><div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="w-[500px] h-[200px] bg-primary/10 rounded-full blur-[80px]"></div></div><p className="relative text-xs uppercase tracking-widest text-primary/70 font-medium mb-4">新闻室</p><h1 className="relative text-4xl md:text-6xl font-bold mb-6 leading-tight">新闻与 <span className="text-gradient">公告</span></h1><p className="relative text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">来自 SweetWine 团队的官方公告、新闻稿与里程碑。</p></div><div className="bg-surface-container rounded-2xl p-10 border border-white/[0.06] text-center"><p className="text-muted-foreground">暂无新闻，敬请期待。</p></div></main>
      </div>
      <Footer />
    </div>
  );
}
