// Edge TTS — Microsoft Edge "Read Aloud" neural voices, free and keyless.
// Protocol (verified against speech.platform.bing.com, 2026-09):
// - WSS /consumer/speech/synthesize/readaloud/edge/v1 with TrustedClientToken
//   + DRM params Sec-MS-GEC (SHA-256 of Windows FILETIME ticks floored to 5min
//   + token, ticks exceed 2^53 so BigInt is required) and Sec-MS-GEC-Version
//   (current Edge stable, lazily refreshed from edgeupdates.microsoft.com;
//   Microsoft raises the minimum from time to time -> stale versions get 403).
// - Send speech.config JSON + SSML speak frames; audio arrives as binary frames
//   (2-byte BE header length + headers + audio/mpeg body); a text frame whose
//   header contains Path:turn.end terminates the stream.
// Output: 24kHz 48kbit mono MP3, cached under media/tts/<hash>.mp3 and in the
// tts_clips table (textHash dedupe) so repeated reads of the same message are free.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import WebSocket from "ws";
import { prisma } from "./prisma";
import { ApiErr } from "./api-error";

// same resolution as api-handlers (kept local to avoid a circular import)
const MEDIA_ROOT = process.env.MEDIA_ROOT || path.join(/* turbopackIgnore: true */ process.cwd(), "..", "media");

const TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4"; // public read-aloud client token
const FALLBACK_VERSION = "1-153.0.4234.32";
const EPOCH_DIFF_MS = 11644473600000; // 1601-01-01 -> 1970-01-01
const SYNTH_TIMEOUT_MS = 30_000;
const MAX_TEXT = 1200;

// lang prefix -> [female, male] neural voices
const VOICE_BY_LANG: Record<string, [string, string]> = {
  zh: ["zh-CN-XiaoxiaoNeural", "zh-CN-YunxiNeural"],
  en: ["en-US-AriaNeural", "en-US-GuyNeural"],
  cs: ["cs-CZ-VlastaNeural", "cs-CZ-AntoninNeural"],
  ja: ["ja-JP-NanamiNeural", "ja-JP-KeitaNeural"],
  ko: ["ko-KR-SunHiNeural", "ko-KR-InJoonNeural"],
  de: ["de-DE-KatjaNeural", "de-DE-ConradNeural"],
  fr: ["fr-FR-DeniseNeural", "fr-FR-HenriNeural"],
  es: ["es-ES-ElviraNeural", "es-ES-AlvaroNeural"],
  pt: ["pt-BR-FranciscaNeural", "pt-BR-AntonioNeural"],
  ru: ["ru-RU-SvetlanaNeural", "ru-RU-DmitryNeural"],
  it: ["it-IT-ElsaNeural", "it-IT-DiegoNeural"],
  pl: ["pl-PL-ZofiaNeural", "pl-PL-MarekNeural"],
  tr: ["tr-TR-EmelNeural", "tr-TR-AhmetNeural"],
  hi: ["hi-IN-SwaraNeural", "hi-IN-MadhurNeural"],
  id: ["id-ID-GadisNeural", "id-ID-ArdiNeural"],
  th: ["th-TH-PremwadeeNeural", "th-TH-NiwatNeural"],
  vi: ["vi-VN-HoaiMyNeural", "vi-VN-NamMinhNeural"],
  ar: ["ar-SA-ZariyahNeural", "ar-SA-HamedNeural"],
  nl: ["nl-NL-FennaNeural", "nl-NL-MaartenNeural"],
  sv: ["sv-SE-SofieNeural", "sv-SE-MattiasNeural"],
};
const DEFAULT_VOICE = "zh-CN-XiaoxiaoNeural"; // site default locale is zh-Hans
const EDGE_NAME_RE = /^[a-z]{2,3}-[A-Za-z]{2,6}-\w+Neural$/;

export type VoicePick = { name: string; lang: string };

// voices-row (or companion-ish record) -> Edge voice. An elevenLabsVoiceId that
// already looks like an Edge neural name wins (admin can pin a voice per row).
export function edgeVoiceFor(row: { gender?: string | null; language?: string | null; elevenLabsVoiceId?: string | null } | null | undefined): VoicePick {
  const direct = String(row?.elevenLabsVoiceId || "");
  if (EDGE_NAME_RE.test(direct)) return { name: direct, lang: direct.slice(0, 5) };
  const langKey = String(row?.language || "").toLowerCase().slice(0, 2);
  const pair = VOICE_BY_LANG[langKey];
  if (pair) return { name: row?.gender === "male" ? pair[1] : pair[0], lang: pair[0].slice(0, 5) };
  return { name: DEFAULT_VOICE, lang: "zh-CN" };
}

// strip markdown/emoji noise so the voice reads clean prose
export function ttsText(raw: string): string {
  return String(raw || "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_~`#>|]/g, "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TEXT);
}

// --- DRM version refresh ---------------------------------------------------
let versionCache = { v: process.env.EDGE_TTS_VERSION || FALLBACK_VERSION, at: 0 };
async function edgeVersion(): Promise<string> {
  if (process.env.EDGE_TTS_VERSION) return process.env.EDGE_TTS_VERSION;
  if (Date.now() - versionCache.at < 6 * 3600_000) return versionCache.v;
  try {
    const r = await fetch("https://edgeupdates.microsoft.com/api/products?view=enterprise", { signal: AbortSignal.timeout(6000) });
    const list = (await r.json()) as { Product?: string; ProductVersion?: string; Releases?: { Platform?: string; ProductVersion?: string }[] }[];
    const stable = list.find((p) => p.Product === "Stable");
    const v = stable?.ProductVersion || stable?.Releases?.[0]?.ProductVersion;
    if (v) versionCache = { v: `1-${v}`, at: Date.now() };
  } catch {
    versionCache = { ...versionCache, at: Date.now() }; // keep fallback, retry in 6h
  }
  return versionCache.v;
}

function secMsGec(): string {
  const ticks = BigInt(Date.now() + EPOCH_DIFF_MS) * 10000n; // FILETIME 100ns units
  const rounded = ticks - (ticks % 3000000000n); // floor to 5-minute window
  return crypto.createHash("sha256").update(rounded.toString() + TOKEN).digest("hex").toUpperCase();
}

function fileTimeNow(): string {
  const d = new Date();
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const p = (n: number) => String(n).padStart(2, "0");
  return `${days[d.getUTCDay()]} ${mon[d.getUTCMonth()]} ${p(d.getUTCDate())} ${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} GMT+0000 (Coordinated Universal Time)`;
}

const xmlEsc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export function synthesize(text: string, voice: VoicePick): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const fail = (e: Error) => { if (!settled) { settled = true; reject(e); } };
    const done = (b: Buffer) => { if (!settled) { settled = true; resolve(b); } };

    (async () => {
      const version = await edgeVersion();
      const gec = secMsGec();
      const connId = crypto.randomBytes(16).toString("hex").toUpperCase();
      const reqId = crypto.randomBytes(16).toString("hex").replace(/(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})/, "$1-$2-$3-$4-$5");
      const url =
        `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1` +
        `?TrustedClientToken=${TOKEN}&Sec-MS-GEC=${gec}&Sec-MS-GEC-Version=${encodeURIComponent(version)}&ConnectionId=${connId}`;
      const ws = new WebSocket(url, {
        headers: {
          Origin: "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
          "User-Agent": `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version.slice(2).split(".")[0]}.0.0.0 Safari/537.36 Edg/${version.slice(2)}`,
          "Sec-MS-GEC": gec,
          "Sec-MS-GEC-Version": version,
          "Accept-Language": "en-US,en;q=0.9",
          Pragma: "no-cache",
          "Cache-Control": "no-cache",
        },
      });
      const chunks: Buffer[] = [];
      const timer = setTimeout(() => { try { ws.terminate(); } catch { /* noop */ } fail(new ApiErr(504, "TTS_TIMEOUT", "edge tts timed out")); }, SYNTH_TIMEOUT_MS);
      ws.on("open", () => {
        const cfg = { context: { synthesis: { audio: { metadataoptions: { sentenceBoundaryEnabled: "false", wordBoundaryEnabled: "false" }, outputFormat: "audio-24khz-48kbitrate-mono-mp3" } } } };
        ws.send(`X-Timestamp:${fileTimeNow()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n${JSON.stringify(cfg)}`);
        const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${voice.lang}'><voice name='${voice.name}'><prosody pitch='+0Hz' rate='+0%' volume='+0%'>${xmlEsc(text)}</prosody></voice></speak>`;
        ws.send(`X-RequestId:${reqId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${fileTimeNow()}\r\nPath:ssml\r\n\r\n${ssml}`);
      });
      ws.on("message", (data: Buffer, isBinary: boolean) => {
        if (!isBinary) {
          const s = data.toString();
          const sep = s.indexOf("\r\n\r\n");
          const head = sep >= 0 ? s.slice(0, sep) : "";
          if (head.includes("Path:turn.end")) {
            clearTimeout(timer);
            try { ws.close(); } catch { /* noop */ }
            const audio = Buffer.concat(chunks);
            if (!audio.length) fail(new ApiErr(502, "TTS_EMPTY", "edge tts returned no audio"));
            else done(audio);
          }
          return;
        }
        if (data.length < 2) return;
        const hl = data.readUInt16BE(0);
        const header = data.slice(2, 2 + hl).toString("utf8");
        if (header.includes("Path:audio")) chunks.push(data.slice(2 + hl));
      });
      ws.on("error", (e: Error) => { clearTimeout(timer); fail(new ApiErr(502, "TTS_FAILED", `edge tts error: ${e.message}`)); });
      ws.on("close", () => {
        clearTimeout(timer);
        const audio = Buffer.concat(chunks);
        if (audio.length) done(audio);
        else fail(new ApiErr(502, "TTS_CLOSED", "edge tts closed before audio"));
      });
      ws.on("unexpected-response", (_req, res) => {
        clearTimeout(timer);
        // stale DRM version -> force refresh on the next attempt
        if (res.statusCode === 403) versionCache = { ...versionCache, at: 0 };
        fail(new ApiErr(502, "TTS_REJECTED", `edge tts handshake rejected: HTTP ${res.statusCode}`));
      });
    })().catch(fail);
  });
}

export type SynthResult = { url: string; cached: boolean; voice: string };

// synthesize with disk+DB caching; returns a /media/tts/*.mp3 URL
export async function synthesizeToMedia(text: string, voice: VoicePick, companionId?: string): Promise<SynthResult> {
  const clean = ttsText(text);
  if (!clean) throw new ApiErr(400, "EMPTY_TEXT", "nothing to read");
  const hash = crypto.createHash("sha256").update(clean + "|" + voice.name).digest("hex").slice(0, 32);
  const rel = `tts/${hash}.mp3`;
  const dest = path.join(MEDIA_ROOT, "tts", `${hash}.mp3`);
  const url = `/media/${rel}`;

  if (fs.existsSync(dest)) {
    // keep the clip index fresh but never re-synthesize
    prisma.ttsClips
      .upsert({ where: { id: `tts-${hash}` }, update: {}, create: { id: `tts-${hash}`, companionId: companionId ?? null, voiceId: voice.name, textHash: hash, url, createdAt: new Date().toISOString().replace(/\.\d+Z$/, "Z") } as never })
      .catch(() => { /* index is best-effort */ });
    return { url, cached: true, voice: voice.name };
  }

  const audio = await synthesize(clean, voice);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, audio);
  await prisma.ttsClips
    .upsert({ where: { id: `tts-${hash}` }, update: { voiceId: voice.name, url, companionId: companionId ?? null }, create: { id: `tts-${hash}`, companionId: companionId ?? null, voiceId: voice.name, textHash: hash, url, createdAt: new Date().toISOString().replace(/\.\d+Z$/, "Z") } as never })
    .catch(() => { /* index is best-effort */ });
  return { url, cached: false, voice: voice.name };
}
