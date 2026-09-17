// (usage recovered from 220770/381888):
// openCookieSettings dispatches a window CustomEvent that the
// CookieConsentBanner listens for to reopen its preferences panel.
export const COOKIE_SETTINGS_EVENT = "sweetwine-open-cookie-settings";

export function openCookieSettings(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(COOKIE_SETTINGS_EVENT));
  }
}
