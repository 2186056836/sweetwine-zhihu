// Auto-generated static SEO page.
// Marketing shell: MarketingNav + converted content + Footer.
import { MarketingNav } from "../marketing-nav";
import { Footer } from "../footer";
import { MarketingBannerCarousel } from "@/components/home/marketing-banner-carousel";

export const metadata = { title: "产品更新与变更日志 | SweetWine" };

export function SeoProductUpdatesPage({ authenticated = false }: { authenticated?: boolean }) {
  return (
    <div className="min-h-screen flex flex-col text-foreground">
      <MarketingNav />
      <div className="flex-1 pt-topbar">
        <main className="container mx-auto px-4 md:px-6 pb-16 max-w-5xl"><div className="relative text-center py-16 mb-4"><div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="w-[500px] h-[200px] bg-primary/10 rounded-full blur-[80px]"></div></div><p className="relative text-xs uppercase tracking-widest text-primary/70 font-medium mb-4">更新日志</p><h1 className="relative text-4xl md:text-6xl font-bold mb-6 leading-tight">产品 <span className="text-gradient">更新</span></h1><p className="relative text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">SweetWine 平台上的最新功能、改进和修复。</p></div><div className="flex justify-center mb-10"><div className="inline-flex rounded-full glass-inset p-1"><a className="rounded-full px-4 py-1 text-sm transition-colors gradient-cta text-white" href="/zh-Hans/product-updates">最新</a><a className="rounded-full px-4 py-1 text-sm transition-colors text-muted-foreground hover:text-primary" href="/zh-Hans/product-updates?sort=oldest">最早</a></div></div><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"><a className="group flex flex-col glass-flat rounded-2xl overflow-hidden transition-all duration-300" href="/zh-Hans/product-updates/stories-smarter-creation-global-upgrades"><div className="flex flex-col flex-1 p-6"><div className="flex items-center gap-2 text-xs text-muted-foreground mb-2"><span>2026年6月20日</span></div><h2 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">故事、更智能的创作与全球升级</h2><p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-4">我们刚刚推出了 Instagram 风格的故事功能、焕然一新的 5 步角色创建器，以及覆盖 90 种语言的完整本地化，让每个人都能以自己的方式享受 SweetWine。</p><span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary">阅读更多<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-right h-4 w-4 group-hover:translate-x-0.5 transition-transform" aria-hidden="true"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg></span></div></a></div></main>
      </div>
      <Footer />
    </div>
  );
}
