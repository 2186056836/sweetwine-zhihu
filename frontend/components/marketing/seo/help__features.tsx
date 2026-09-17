// Auto-generated static SEO page.
// Marketing shell: MarketingNav + converted content + Footer.
import { MarketingNav } from "../marketing-nav";
import { Footer } from "../footer";
import { MarketingBannerCarousel } from "@/components/home/marketing-banner-carousel";

export const metadata = { title: "Features | SweetWine Help Center" };

export function SeoHelpFeaturesPage({ authenticated = false }: { authenticated?: boolean }) {
  return (
    <div className="min-h-screen flex flex-col text-foreground">
      <MarketingNav />
      <div className="flex-1 pt-topbar">
        <main className="container mx-auto px-4 md:px-6 pb-16 max-w-5xl"><div className="py-12"><h1 className="text-3xl md:text-5xl font-bold leading-tight mb-3">Features</h1><p className="text-lg text-muted-foreground max-w-2xl mb-10">Get the most out of chat, images, voice, and group chat.</p><ul className="space-y-3"><li><a className="group flex items-center justify-between gap-4 glass-card rounded-2xl p-5 border border-white/[0.06] transition-all duration-300" href="/zh-Hans/help/features/what-is-ai-group-chat"><span className="flex items-center gap-3 font-medium group-hover:text-primary transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-text h-5 w-5 text-primary shrink-0" aria-hidden="true"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"></path><path d="M14 2v5a1 1 0 0 0 1 1h5"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg>What is AI Group Chat?</span><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-right h-4 w-4 text-primary shrink-0 group-hover:translate-x-0.5 transition-transform" aria-hidden="true"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg></a></li></ul></div></main>
      </div>
      <Footer />
    </div>
  );
}
