import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// The local build is fully self-hosted on Next: /sb (GoTrue/PostgREST/Storage),
// /media and /api (business) are all Next route handlers over local Postgres
// and local disk. No external backend remains.
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // demo deployments behind a shared port use a path prefix (server env
  // DEMO_BASE_PATH=/demo); local dev stays at root with empty default.
  basePath: process.env.DEMO_BASE_PATH || "",
};

export default withNextIntl(nextConfig);
