// Suggestion fragments — curated data
// (data/suggestion_fragments.json, 42 items / 5 categories) with
// composePromptFromSelection / getRandomSelection helpers
// (SuggestionCategories UI). SFW curation for this product:
// lingerie & satin robe dropped, "tight sportswear" softened to "sportswear";
// zh labels added (base labels are en-only, promptFragment stays English —
// it is model-facing prompt text).
export type Fragment = { id: string; label: string; labelZh: string; promptFragment: string };
export type FragmentCategory = { id: string; label: string; labelZh: string; items: Fragment[] };

export const SUGGESTION_CATEGORIES: FragmentCategory[] = [
  {
    id: "outfit",
    label: "Outfit",
    labelZh: "着装",
    items: [
      { id: "bikini", label: "Bikini", labelZh: "比基尼", promptFragment: "wearing a bikini" },
      { id: "skirt", label: "Skirt", labelZh: "短裙", promptFragment: "wearing a skirt" },
      { id: "crop_top", label: "Crop top", labelZh: "露脐上衣", promptFragment: "wearing a crop top" },
      { id: "leather", label: "Leather", labelZh: "皮装", promptFragment: "wearing a leather outfit" },
      { id: "mini_skirt", label: "Mini-skirt", labelZh: "迷你裙", promptFragment: "wearing a mini-skirt" },
      { id: "jeans", label: "Jeans", labelZh: "牛仔裤", promptFragment: "wearing jeans" },
      { id: "summer_dress", label: "Summer dress", labelZh: "夏日连衣裙", promptFragment: "wearing a summer dress" },
      { id: "sportswear", label: "Sportswear", labelZh: "运动装", promptFragment: "wearing sportswear" },
    ],
  },
  {
    id: "action",
    label: "Action",
    labelZh: "动作",
    items: [
      { id: "selfie", label: "Selfie", labelZh: "自拍", promptFragment: "taking a selfie" },
      { id: "walking", label: "Walking", labelZh: "散步", promptFragment: "walking" },
      { id: "dancing", label: "Dancing", labelZh: "跳舞", promptFragment: "dancing" },
      { id: "stretching", label: "Stretching", labelZh: "伸展", promptFragment: "stretching" },
      { id: "lying_down", label: "Lying down", labelZh: "躺着", promptFragment: "lying down" },
      { id: "leaning", label: "Leaning", labelZh: "靠墙", promptFragment: "leaning against a wall" },
      { id: "blowing_kiss", label: "Blowing a kiss", labelZh: "飞吻", promptFragment: "blowing a kiss" },
      { id: "drinking_coffee", label: "Drinking coffee", labelZh: "喝咖啡", promptFragment: "drinking a cup of coffee" },
    ],
  },
  {
    id: "pose",
    label: "Pose",
    labelZh: "姿势",
    items: [
      { id: "hands_on_hips", label: "Hands on hips", labelZh: "叉腰", promptFragment: "with hands on hips" },
      { id: "over_shoulder", label: "Over shoulder", labelZh: "回眸", promptFragment: "looking over her shoulder" },
      { id: "side_profile", label: "Side profile", labelZh: "侧颜", promptFragment: "side profile pose" },
      { id: "arms_crossed", label: "Arms crossed", labelZh: "抱臂", promptFragment: "with arms crossed" },
      { id: "kneeling", label: "Kneeling", labelZh: "跪姿", promptFragment: "kneeling pose" },
      { id: "squatting", label: "Squatting", labelZh: "蹲姿", promptFragment: "squatting pose" },
      { id: "back_view", label: "Back view", labelZh: "背影", promptFragment: "viewed from behind" },
      { id: "sitting", label: "Sitting", labelZh: "坐姿", promptFragment: "sitting down" },
    ],
  },
  {
    id: "accessories",
    label: "Accessories",
    labelZh: "配饰",
    items: [
      { id: "necklace", label: "Necklace", labelZh: "项链", promptFragment: "wearing a necklace" },
      { id: "earrings", label: "Earrings", labelZh: "耳环", promptFragment: "wearing earrings" },
      { id: "glasses", label: "Glasses", labelZh: "眼镜", promptFragment: "wearing glasses" },
      { id: "choker", label: "Choker", labelZh: "颈链", promptFragment: "wearing a choker" },
      { id: "hat", label: "Hat", labelZh: "帽子", promptFragment: "wearing a hat" },
      { id: "sunglasses", label: "Sunglasses", labelZh: "墨镜", promptFragment: "wearing sunglasses" },
    ],
  },
  {
    id: "scene",
    label: "Scene",
    labelZh: "场景",
    items: [
      { id: "garden", label: "Garden", labelZh: "花园", promptFragment: "in a garden" },
      { id: "beach", label: "Beach", labelZh: "海滩", promptFragment: "at the beach" },
      { id: "bedroom", label: "Bedroom", labelZh: "卧室", promptFragment: "in a bedroom" },
      { id: "gym", label: "Gym", labelZh: "健身房", promptFragment: "at the gym" },
      { id: "bar", label: "Bar", labelZh: "酒吧", promptFragment: "at a bar" },
      { id: "kitchen", label: "Kitchen", labelZh: "厨房", promptFragment: "in a kitchen" },
      { id: "restaurant", label: "Restaurant", labelZh: "餐厅", promptFragment: "at a restaurant" },
      { id: "balcony", label: "Balcony", labelZh: "阳台", promptFragment: "on a balcony" },
      { id: "city_street", label: "City street", labelZh: "街头", promptFragment: "on a city street" },
      { id: "pool", label: "Poolside", labelZh: "泳池边", promptFragment: "by the pool" },
    ],
  },
];

/** source composePromptFromSelection: join selected fragments in category order. */
export function composePromptFromSelection(selection: Record<string, string>): string {
  return SUGGESTION_CATEGORIES.filter((c) => selection[c.id])
    .map((c) => c.items.find((i) => i.id === selection[c.id])?.promptFragment)
    .filter(Boolean)
    .join(", ");
}

/** source getRandomSelection: one random item per category. */
export function getRandomSelection(): Record<string, string> {
  const sel: Record<string, string> = {};
  for (const c of SUGGESTION_CATEGORIES) {
    sel[c.id] = c.items[Math.floor(Math.random() * c.items.length)].id;
  }
  return sel;
}
