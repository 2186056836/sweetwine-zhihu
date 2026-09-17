// GoTrue cookieStorage wire format: the supabase-js
// persists the session in a cookie named `<storageKey>-auth-token` whose
// value is `base64-` + btoa(UTF-8 JSON session). The local backend's
// auth_real.session_user parses exactly this envelope.
function toB64Utf8(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

function fromB64Utf8(b64: string): string {
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function readCookie(key: string): string | null {
  if (typeof document === "undefined") return null;
  const esc = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = document.cookie.match(new RegExp("(?:^|; )" + esc + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

export const cookieStorage = {
  getItem(key: string): string | null {
    const raw = readCookie(key);
    if (!raw) return null;
    if (raw.startsWith("base64-")) {
      try {
        return fromB64Utf8(raw.slice(7));
      } catch {
        return null;
      }
    }
    return raw;
  },
  setItem(key: string, value: string): void {
    const encoded = "base64-" + toB64Utf8(value);
    document.cookie =
      key +
      "=" +
      encodeURIComponent(encoded) +
      "; path=/; max-age=2592000; samesite=lax";
  },
  removeItem(key: string): void {
    document.cookie = key + "=; path=/; max-age=0";
  },
};
