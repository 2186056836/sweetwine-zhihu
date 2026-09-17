// publicStorageUrl. The local build
// points NEXT_PUBLIC_STATIC_ASSETS_URL at /sb so storage object URLs resolve
// through the Next rewrite to the local backend's media root.
const BASE = (process.env.NEXT_PUBLIC_STATIC_ASSETS_URL ?? "/sb").replace(/\/+$/, "");

export function publicStorageUrl(path: string): string {
  return `${BASE}/storage/v1/object/public/${path.replace(/^\/+/, "")}`;
}
