// Server-action replacements for what would be RSC actions
// (createServerReference hashes in work/action_registry.json); the local build
// routes the identical payloads through the local backend's /api surface.

export type UpdateProfileInput = {
  nickname?: string;
  gender?: string;
  aiLanguage?: string;
  preferredLanguage?: string;
  ageVerified?: boolean;
  aiActConsent?: boolean;
  newsletter?: boolean;
};

export type UpdateProfileResult =
  | { success: true; registrationEventId?: string }
  | { success: false; error?: string };

// action 403b126889d46b555927b8030018f9b07617fa64e9 "updateUserProfile"
export async function updateUserProfile(
  input: UpdateProfileInput,
): Promise<UpdateProfileResult> {
  try {
    const r = await fetch("/api/profile/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      if (r.status === 401) return { success: false, error: "Not authenticated" };
      return { success: false, error: j.message || j.error || String(r.status) };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}
