import { Link } from "@/i18n/navigation";
import { ChevronRight, Home } from "lucide-react";

export function Breadcrumbs({ label }: { label: string }) {
  return (
    <nav aria-label="Breadcrumb" className="container mx-auto px-4 md:px-6 py-4">
      <ol className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
        <li>
          <Link href="/" className="hover:text-primary transition-colors flex items-center gap-1" aria-label="Home">
            <Home className="w-4 h-4" />
          </Link>
        </li>
        <li className="flex items-center gap-2">
          <ChevronRight className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span className="text-foreground font-medium" aria-current="page">{label}</span>
        </li>
      </ol>
    </nav>
  );
}
