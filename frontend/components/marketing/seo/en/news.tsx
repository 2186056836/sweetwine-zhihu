// Auto-generated static SEO page.
// Marketing shell: MarketingNav + converted content + Footer.
import { MarketingNav } from "../../marketing-nav";
import { Footer } from "../../footer";
import { MarketingBannerCarousel } from "@/components/home/marketing-banner-carousel";

export const metadata = { title: "News & Press Releases | SweetWine" };

export function SeoNewsPageEn({ authenticated = false }: { authenticated?: boolean }) {
  return (
    <div className="min-h-screen flex flex-col text-foreground">
      <MarketingNav />
      <div className="flex-1 pt-topbar">
        <main className="container mx-auto px-4 md:px-6 pb-16 max-w-5xl"><div className="relative text-center py-16 mb-4"><div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="w-[500px] h-[200px] bg-primary/10 rounded-full blur-[80px]"></div></div><p className="relative text-xs uppercase tracking-widest text-primary/70 font-medium mb-4">Newsroom</p><h1 className="relative text-4xl md:text-6xl font-bold mb-6 leading-tight">News &amp; <span className="text-gradient">Announcements</span></h1><p className="relative text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">Official announcements, press releases, and milestones from the SweetWine team.</p></div><div className="bg-surface-container rounded-2xl p-10 border border-white/[0.06] text-center"><p className="text-muted-foreground">No news yet. Check back soon.</p></div></main>
      </div>
      <Footer />
    </div>
  );
}
