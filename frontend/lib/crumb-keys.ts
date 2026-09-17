// SEO route -> intl namespace with a `breadcrumb` key (source messages)
export const CRUMB_KEYS: Record<string, string> = {
  "ai-girlfriend": "aiGirlfriendPage",
  "ai-boyfriend": "aiBoyfriendPage",
  "ai-companions": "aiCompanionsPage",
  "ai-friend": "aiFriendPage",
  "ai-group-chat": "aiGroupChatPage",
  "ai-memory": "aiMemoryPage",
  "ai-real-clones": "aiRealClonesPage",
  "ai-breakup-support": "aiBreakupSupportPage",
  "ai-parent": "aiParentPage",
  "ai-roleplay": "aiRoleplayPage",
  features: "featuresPage",
  api: "apiPage",
  sitemap: "sitemapPage",
  news: "sitemapPage",
  careers: "careersPage",
  press: "pressPage",
  partnerships: "partnershipsPage",
  "product-updates": "sitemapPage",
  blog: "sitemapPage",
  about: "aboutPage",
  help: "helpPage",
  legal: "legal",
  "legal/cookie-policy": "legal",
  "legal/privacy-policy": "legal",
  "legal/terms-and-conditions": "legal",
};

// label resolution: <ns>.breadcrumb ?? <ns>.title ?? fallback
export function crumbLabelFor(t: (k: string) => string, ns: string, fallback: string): string {
  // getTranslations already scoped to ns, so keys are bare "breadcrumb"/"title"
  const bc = t("breadcrumb");
  if (bc && !bc.includes("breadcrumb")) return bc;
  const tt = t("title");
  if (tt && !tt.includes("title")) return tt;
  return fallback;
}
