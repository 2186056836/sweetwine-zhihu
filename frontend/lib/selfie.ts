// Companion-initiated selfies — local implementation of the chat-stream tool
// `tool-generate_sfw_image`: the LLM writes its own photo
// prompt mid-conversation, the image lands as a chat message. We implement it
// as a [photo: desc] text marker (survives gateways without function-calling)
// plus server-side assembly: character-consistency
// injection (identity/appearance fields + portrait reference image).
// The result is inlined into the SAME assistant message as a markdown image —
// chat-view's ex() renderer already parses image tokens inside bubbles, so the
// photo streams out with zero client changes. Failure = marker stripped, text
// reply survives (source's sendFailedMediaRequest analogue: no broken media).
import fs from "node:fs";
import path from "node:path";
import * as agnes from "./agnes";
import { extractPhotoMarker } from "./llm";

type Comp = Record<string, unknown>;

const MEDIA_ROOT =
  process.env.MEDIA_ROOT || path.join(/* turbopackIgnore: true */ process.cwd(), "..", "media");

function appearancePrompt(comp: Comp, desc: string): string {
  const s = (k: string) => String(comp[k] ?? "").trim();
  const bits = [
    s("ethnicity"),
    s("age") ? `${Number(comp.age)}-year-old` : "",
    s("body"),
    s("occupation"),
  ]
    .filter(Boolean)
    .join(", ");
  return [
    `candid selfie photo of ${s("name") || "a young adult"}`,
    bits,
    desc,
    "natural candid angle, soft lighting, photorealistic, detailed skin texture, fully clothed, safe-for-work",
  ]
    .filter(Boolean)
    .join(", ");
}

/**
 * Resolve selfie markers in an LLM reply: generate the photo via AGNES and
 * inline it as markdown; on any failure (backend off, blocked prompt, upstream
 * error) return the reply with the marker cleanly stripped.
 */
export async function resolveSelfie(comp: Comp, replyText: string): Promise<string> {
  const { clean, desc } = extractPhotoMarker(replyText);
  if (!desc) return replyText;
  const { enabled, key } = await agnes.cfgValues();
  if (!enabled || !key) return clean;
  const prompt = appearancePrompt(comp, desc);
  if (agnes.promptBlockedMinor(prompt)) return clean;
  try {
    const refUrl = agnes.publicSourceUrl(comp.imageUrl as string);
    const refs = refUrl ? [refUrl] : undefined;
    const remote = await agnes.generateImage(prompt, agnes.ASPECT_SIZES["3:4"], refs, {
      timeoutMs: 75_000,
      retries: 1,
    });
    const rel = agnes.imageRel(remote);
    const dest = path.join(MEDIA_ROOT, rel);
    if (!fs.existsSync(dest)) await agnes.download(remote, dest);
    if (!fs.existsSync(dest)) return clean;
    const url = `/media/${rel.split(path.sep).join("/")}`;
    return `${clean}\n\n![${desc}](${url})`.trim();
  } catch (e) {
    console.error("selfie generation failed (%s); sending text only", String(e));
    return clean;
  }
}

/** One settings read to gate the selfie system-prompt layer (respond opts). */
export async function selfieEnabled(): Promise<boolean> {
  const { enabled, key } = await agnes.cfgValues();
  return !!(enabled && key);
}
