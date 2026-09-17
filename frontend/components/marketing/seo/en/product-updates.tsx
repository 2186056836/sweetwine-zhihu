// Auto-generated static SEO page.
// Marketing shell: MarketingNav + converted content + Footer.
import { MarketingNav } from "../../marketing-nav";
import { Footer } from "../../footer";
import { MarketingBannerCarousel } from "@/components/home/marketing-banner-carousel";

export const metadata = { title: "Product Updates & Changelog | SweetWine" };

export function SeoProductUpdatesPageEn({ authenticated = false }: { authenticated?: boolean }) {
  return (
    <div className="min-h-screen flex flex-col text-foreground">
      <MarketingNav />
      <div className="flex-1 pt-topbar">
        <main className="container mx-auto px-4 md:px-6 pb-16 max-w-5xl"><div className="relative text-center py-16 mb-4"><div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="w-[500px] h-[200px] bg-primary/10 rounded-full blur-[80px]"></div></div><p className="relative text-xs uppercase tracking-widest text-primary/70 font-medium mb-4">Changelog</p><h1 className="relative text-4xl md:text-6xl font-bold mb-6 leading-tight">Product <span className="text-gradient">Updates</span></h1><p className="relative text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">The latest features, improvements, and fixes across the SweetWine platform.</p></div><div className="flex justify-center mb-10"><div className="inline-flex rounded-full glass-inset p-1"><a className="rounded-full px-4 py-1 text-sm transition-colors gradient-cta text-white" href="/en/product-updates">Newest</a><a className="rounded-full px-4 py-1 text-sm transition-colors text-muted-foreground hover:text-primary" href="/en/product-updates?sort=oldest">Oldest</a></div></div><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"><a className="group flex flex-col glass-flat rounded-2xl overflow-hidden transition-all duration-300" href="/en/product-updates/stories-smarter-creation-global-upgrades"><div className="flex flex-col flex-1 p-6"><div className="flex items-center gap-2 text-xs text-muted-foreground mb-2"><span>Jun 20, 2026</span></div><h2 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">Stories, Smarter Creation &amp; Global Upgrades</h2><p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-4">We just rolled out Instagram-style Stories, a refreshed 5-step character creator, and full localization across 90 languages so everyone can enjoy SweetWine their way.</p><span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary">Read more<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-right h-4 w-4 group-hover:translate-x-0.5 transition-transform" aria-hidden="true"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg></span></div></a></div></main>
      </div>
      <Footer />
    </div>
  );
}
