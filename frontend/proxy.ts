import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: [
    // everything except backend proxies, Next internals and static files
    "/((?!api|sb|media|admin|_next|_vercel|fonts|resources|.*\\..*).*)",
  ],
};
