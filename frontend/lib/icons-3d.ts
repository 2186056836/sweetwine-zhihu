// publicStorageUrl + ICONS_3D / GIFT_IMAGE_BY_ID.
// NEXT_PUBLIC_STATIC_ASSETS_URL overrides the
// asset origin; this build points it at /sb so the Next rewrite proxies
// storage objects to the local media root.
const BASE =
  (process.env.NEXT_PUBLIC_STATIC_ASSETS_URL ?? "/sb").replace(/\/+$/, "");

export function publicStorageUrl(path: string): string {
  const p = path.replace(/^\/+/, "");
  return `${BASE}/storage/v1/object/public/${p}`;
}

function icon(file: string): string {
  return publicStorageUrl(`web-resources/3d-icons/${file}`);
}

export const ICONS_3D = {
  bankStatement: icon("bank-icon2.svg"),
  bikini: icon("bikini-icon.png"),
  cancelSub: icon("cancel-icon2.svg"),
  chatBubble: icon("chat-bubble-icon.png"),
  chocolate: icon("chocolate-icon.png"),
  diamondNecklace: icon("diamond-necklace-icon.png"),
  diamondRing: icon("diamond-ring-icon.png"),
  dog: icon("dog-icon.png"),
  fire: icon("fire-icon.png"),
  gameController: icon("game-controller-icon.png"),
  gift: icon("gift-icon.png"),
  groupchat: icon("groupchat-icon.png"),
  hearth: icon("hearth-icon.png"),
  lightning: icon("lightning-icon.png"),
  loveLetter: icon("love-letter-icon.png"),
  loveLetter2: icon("love-letter2-icon.png"),
  loveLock: icon("love-lock-icon.png"),
  memory: icon("memory-icon.png"),
  perfume: icon("perfume-icon.png"),
  phone: icon("phone-icon.png"),
  roseBouquet: icon("rose-bouquet-icon.png"),
  rose: icon("rose-icon.png"),
  sound: icon("sound-icon.png"),
  sparkle: icon("sparkle-icon.png"),
  teddyBear: icon("teddy-bear-icon.png"),
  webcam: icon("webcam-icon.png"),
} as const;

export const GIFT_IMAGE_BY_ID: Record<string, string> = {
  "red-rose": ICONS_3D.rose,
  "box-of-chocolates": ICONS_3D.chocolate,
  "love-letter": ICONS_3D.loveLetter,
  "bouquet-of-roses": ICONS_3D.roseBouquet,
  perfume: ICONS_3D.perfume,
  "teddy-bear": ICONS_3D.teddyBear,
  "giant-teddy-bear": ICONS_3D.teddyBear,
  "gold-heart-locket": ICONS_3D.gift,
  "diamond-necklace": ICONS_3D.diamondNecklace,
  "diamond-ring": ICONS_3D.diamondRing,
  puppy: ICONS_3D.dog,
};
