// the full locale
// registry (62 locales, ready flags, flags paths, helper converters).
export type LocaleDef = {
  name: string;
  nativeName: string;
  flag: string;
  ogLocale: string;
  dir: string;
  tier: number;
  ready: boolean;
  fallback: string | null;
  region: string;
};

  const FLAG_BASE = "/resources/flags";
  const t: Record<string, LocaleDef> = {
    en: {
      name: "English",
      nativeName: "English",
      flag: `${FLAG_BASE}/186-united%20states.svg`,
      ogLocale: "en_US",
      dir: "ltr",
      tier: 1,
      ready: true,
      fallback: null,
      region: "americas"
    },
    de: {
      name: "German",
      nativeName: "Deutsch",
      flag: `${FLAG_BASE}/208-germany.svg`,
      ogLocale: "de_DE",
      dir: "ltr",
      tier: 1,
      ready: true,
      fallback: null,
      region: "europe"
    },
    fr: {
      name: "French",
      nativeName: "Français",
      flag: `${FLAG_BASE}/197-france.svg`,
      ogLocale: "fr_FR",
      dir: "ltr",
      tier: 1,
      ready: true,
      fallback: null,
      region: "europe"
    },
    "es-ES": {
      name: "Spanish (Spain)",
      nativeName: "Español (España)",
      flag: `${FLAG_BASE}/230-spain.svg`,
      ogLocale: "es_ES",
      dir: "ltr",
      tier: 1,
      ready: true,
      fallback: null,
      region: "europe"
    },
    "es-419": {
      name: "Spanish (Latin America)",
      nativeName: "Español (Latinoamérica)",
      flag: `${FLAG_BASE}/033-mexico.svg`,
      ogLocale: "es_ES",
      dir: "ltr",
      tier: 1,
      ready: true,
      fallback: "es-ES",
      region: "americas"
    },
    "pt-BR": {
      name: "Portuguese (Brazil)",
      nativeName: "Português (Brasil)",
      flag: `${FLAG_BASE}/022-brazil.svg`,
      ogLocale: "pt_BR",
      dir: "ltr",
      tier: 1,
      ready: true,
      fallback: null,
      region: "americas"
    },
    it: {
      name: "Italian",
      nativeName: "Italiano",
      flag: `${FLAG_BASE}/263-italy.svg`,
      ogLocale: "it_IT",
      dir: "ltr",
      tier: 1,
      ready: true,
      fallback: null,
      region: "europe"
    },
    nl: {
      name: "Dutch",
      nativeName: "Nederlands",
      flag: `${FLAG_BASE}/077-netherlands.svg`,
      ogLocale: "nl_NL",
      dir: "ltr",
      tier: 1,
      ready: true,
      fallback: null,
      region: "europe"
    },
    pl: {
      name: "Polish",
      nativeName: "Polski",
      flag: `${FLAG_BASE}/165-poland.svg`,
      ogLocale: "pl_PL",
      dir: "ltr",
      tier: 1,
      ready: true,
      fallback: null,
      region: "europe"
    },
    cs: {
      name: "Czech",
      nativeName: "Čeština",
      flag: `${FLAG_BASE}/202-czech%20republic.svg`,
      ogLocale: "cs_CZ",
      dir: "ltr",
      tier: 1,
      ready: true,
      fallback: null,
      region: "europe"
    },
    ja: {
      name: "Japanese",
      nativeName: "日本語",
      flag: `${FLAG_BASE}/241-japan.svg`,
      ogLocale: "ja_JP",
      dir: "ltr",
      tier: 1,
      ready: true,
      fallback: null,
      region: "asiaPacific"
    },
    ko: {
      name: "Korean",
      nativeName: "한국어",
      flag: `${FLAG_BASE}/219-south%20korea.svg`,
      ogLocale: "ko_KR",
      dir: "ltr",
      tier: 1,
      ready: true,
      fallback: null,
      region: "asiaPacific"
    },
    ru: {
      name: "Russian",
      nativeName: "Русский",
      flag: `${FLAG_BASE}/044-russia.svg`,
      ogLocale: "ru_RU",
      dir: "ltr",
      tier: 1,
      ready: true,
      fallback: null,
      region: "europe"
    },
    tr: {
      name: "Turkish",
      nativeName: "Türkçe",
      flag: `${FLAG_BASE}/154-turkey.svg`,
      ogLocale: "tr_TR",
      dir: "ltr",
      tier: 1,
      ready: true,
      fallback: null,
      region: "europe"
    },
    "zh-Hans": {
      name: "Chinese (Simplified)",
      nativeName: "简体中文",
      flag: `${FLAG_BASE}/011-china.svg`,
      ogLocale: "zh_CN",
      dir: "ltr",
      tier: 1,
      ready: true,
      fallback: null,
      region: "asiaPacific"
    },
    "zh-Hant": {
      name: "Chinese (Traditional)",
      nativeName: "繁體中文",
      flag: `${FLAG_BASE}/183-taiwan.svg`,
      ogLocale: "zh_TW",
      dir: "ltr",
      tier: 2,
      ready: true,
      fallback: "zh-Hans",
      region: "asiaPacific"
    },
    "pt-PT": {
      name: "Portuguese (Portugal)",
      nativeName: "Português (Portugal)",
      flag: `${FLAG_BASE}/098-portugal.svg`,
      ogLocale: "pt_PT",
      dir: "ltr",
      tier: 2,
      ready: true,
      fallback: "pt-BR",
      region: "europe"
    },
    ar: {
      name: "Arabic",
      nativeName: "العربية",
      flag: `${FLAG_BASE}/204-saudi%20arabia.svg`,
      ogLocale: "ar_AR",
      dir: "rtl",
      tier: 2,
      ready: true,
      fallback: null,
      region: "middleEast"
    },
    hi: {
      name: "Hindi",
      nativeName: "हिन्दी",
      flag: `${FLAG_BASE}/055-india.svg`,
      ogLocale: "hi_IN",
      dir: "ltr",
      tier: 2,
      ready: true,
      fallback: null,
      region: "asiaPacific"
    },
    id: {
      name: "Indonesian",
      nativeName: "Bahasa Indonesia",
      flag: `${FLAG_BASE}/185-indonesia.svg`,
      ogLocale: "id_ID",
      dir: "ltr",
      tier: 2,
      ready: true,
      fallback: null,
      region: "asiaPacific"
    },
    vi: {
      name: "Vietnamese",
      nativeName: "Tiếng Việt",
      flag: `${FLAG_BASE}/109-vietnam.svg`,
      ogLocale: "vi_VN",
      dir: "ltr",
      tier: 2,
      ready: true,
      fallback: null,
      region: "asiaPacific"
    },
    th: {
      name: "Thai",
      nativeName: "ไทย",
      flag: `${FLAG_BASE}/088-thailand.svg`,
      ogLocale: "th_TH",
      dir: "ltr",
      tier: 2,
      ready: true,
      fallback: null,
      region: "asiaPacific"
    },
    sv: {
      name: "Swedish",
      nativeName: "Svenska",
      flag: `${FLAG_BASE}/190-sweden.svg`,
      ogLocale: "sv_SE",
      dir: "ltr",
      tier: 2,
      ready: true,
      fallback: null,
      region: "europe"
    },
    da: {
      name: "Danish",
      nativeName: "Dansk",
      flag: `${FLAG_BASE}/191-denmark.svg`,
      ogLocale: "da_DK",
      dir: "ltr",
      tier: 2,
      ready: true,
      fallback: null,
      region: "europe"
    },
    nb: {
      name: "Norwegian (Bokmål)",
      nativeName: "Norsk bokmål",
      flag: `${FLAG_BASE}/205-norway.svg`,
      ogLocale: "nb_NO",
      dir: "ltr",
      tier: 2,
      ready: true,
      fallback: null,
      region: "europe"
    },
    fi: {
      name: "Finnish",
      nativeName: "Suomi",
      flag: `${FLAG_BASE}/211-finland.svg`,
      ogLocale: "fi_FI",
      dir: "ltr",
      tier: 2,
      ready: true,
      fallback: null,
      region: "europe"
    },
    el: {
      name: "Greek",
      nativeName: "Ελληνικά",
      flag: `${FLAG_BASE}/192-greece.svg`,
      ogLocale: "el_GR",
      dir: "ltr",
      tier: 2,
      ready: true,
      fallback: null,
      region: "europe"
    },
    hu: {
      name: "Hungarian",
      nativeName: "Magyar",
      flag: `${FLAG_BASE}/210-hungary.svg`,
      ogLocale: "hu_HU",
      dir: "ltr",
      tier: 2,
      ready: true,
      fallback: null,
      region: "europe"
    },
    ro: {
      name: "Romanian",
      nativeName: "Română",
      flag: `${FLAG_BASE}/213-romania.svg`,
      ogLocale: "ro_RO",
      dir: "ltr",
      tier: 2,
      ready: true,
      fallback: null,
      region: "europe"
    },
    uk: {
      name: "Ukrainian",
      nativeName: "Українська",
      flag: `${FLAG_BASE}/198-ukraine.svg`,
      ogLocale: "uk_UA",
      dir: "ltr",
      tier: 2,
      ready: true,
      fallback: null,
      region: "europe"
    },
    he: {
      name: "Hebrew",
      nativeName: "עברית",
      flag: `${FLAG_BASE}/203-israel.svg`,
      ogLocale: "he_IL",
      dir: "rtl",
      tier: 2,
      ready: true,
      fallback: null,
      region: "middleEast"
    },
    sk: {
      name: "Slovak",
      nativeName: "Slovenčina",
      flag: `${FLAG_BASE}/218-slovakia.svg`,
      ogLocale: "sk_SK",
      dir: "ltr",
      tier: 2,
      ready: true,
      fallback: "cs",
      region: "europe"
    },
    bg: {
      name: "Bulgarian",
      nativeName: "Български",
      flag: `${FLAG_BASE}/127-bulgaria.svg`,
      ogLocale: "bg_BG",
      dir: "ltr",
      tier: 2,
      ready: true,
      fallback: null,
      region: "europe"
    },
    hr: {
      name: "Croatian",
      nativeName: "Hrvatski",
      flag: `${FLAG_BASE}/128-croatia.svg`,
      ogLocale: "hr_HR",
      dir: "ltr",
      tier: 2,
      ready: true,
      fallback: null,
      region: "europe"
    },
    fil: {
      name: "Filipino",
      nativeName: "Filipino",
      flag: `${FLAG_BASE}/187-philippines.svg`,
      ogLocale: "fil_PH",
      dir: "ltr",
      tier: 2,
      ready: true,
      fallback: null,
      region: "asiaPacific"
    },
    ms: {
      name: "Malay",
      nativeName: "Bahasa Melayu",
      flag: `${FLAG_BASE}/207-malaysia.svg`,
      ogLocale: "ms_MY",
      dir: "ltr",
      tier: 3,
      ready: true,
      fallback: null,
      region: "asiaPacific"
    },
    ca: {
      name: "Catalan",
      nativeName: "Català",
      flag: `${FLAG_BASE}/230-spain.svg`,
      ogLocale: "ca_ES",
      dir: "ltr",
      tier: 3,
      ready: true,
      fallback: "es-ES",
      region: "europe"
    },
    sl: {
      name: "Slovenian",
      nativeName: "Slovenščina",
      flag: `${FLAG_BASE}/259-slovenia.svg`,
      ogLocale: "sl_SI",
      dir: "ltr",
      tier: 3,
      ready: true,
      fallback: null,
      region: "europe"
    },
    lt: {
      name: "Lithuanian",
      nativeName: "Lietuvių",
      flag: `${FLAG_BASE}/238-lithuania.svg`,
      ogLocale: "lt_LT",
      dir: "ltr",
      tier: 3,
      ready: true,
      fallback: null,
      region: "europe"
    },
    lv: {
      name: "Latvian",
      nativeName: "Latviešu",
      flag: `${FLAG_BASE}/231-latvia.svg`,
      ogLocale: "lv_LV",
      dir: "ltr",
      tier: 3,
      ready: true,
      fallback: null,
      region: "europe"
    },
    et: {
      name: "Estonian",
      nativeName: "Eesti",
      flag: `${FLAG_BASE}/004-estonia.svg`,
      ogLocale: "et_EE",
      dir: "ltr",
      tier: 3,
      ready: true,
      fallback: null,
      region: "europe"
    },
    sr: {
      name: "Serbian",
      nativeName: "Српски",
      flag: `${FLAG_BASE}/228-serbia.svg`,
      ogLocale: "sr_RS",
      dir: "ltr",
      tier: 3,
      ready: true,
      fallback: null,
      region: "europe"
    },
    bs: {
      name: "Bosnian",
      nativeName: "Bosanski",
      flag: `${FLAG_BASE}/149-bosnia%20and%20herzegovina.svg`,
      ogLocale: "bs_BA",
      dir: "ltr",
      tier: 3,
      ready: true,
      fallback: "hr",
      region: "europe"
    },
    mk: {
      name: "Macedonian",
      nativeName: "Македонски",
      flag: `${FLAG_BASE}/038-republic%20of%20macedonia.svg`,
      ogLocale: "mk_MK",
      dir: "ltr",
      tier: 3,
      ready: true,
      fallback: null,
      region: "europe"
    },
    sq: {
      name: "Albanian",
      nativeName: "Shqip",
      flag: `${FLAG_BASE}/145-albania.svg`,
      ogLocale: "sq_AL",
      dir: "ltr",
      tier: 3,
      ready: true,
      fallback: null,
      region: "europe"
    },
    is: {
      name: "Icelandic",
      nativeName: "Íslenska",
      flag: `${FLAG_BASE}/222-iceland.svg`,
      ogLocale: "is_IS",
      dir: "ltr",
      tier: 3,
      ready: true,
      fallback: null,
      region: "europe"
    },
    ga: {
      name: "Irish",
      nativeName: "Gaeilge",
      flag: `${FLAG_BASE}/193-ireland.svg`,
      ogLocale: "ga_IE",
      dir: "ltr",
      tier: 3,
      ready: true,
      fallback: null,
      region: "europe"
    },
    mt: {
      name: "Maltese",
      nativeName: "Malti",
      flag: `${FLAG_BASE}/251-malta.svg`,
      ogLocale: "mt_MT",
      dir: "ltr",
      tier: 3,
      ready: true,
      fallback: null,
      region: "europe"
    },
    be: {
      name: "Belarusian",
      nativeName: "Беларуская",
      flag: `${FLAG_BASE}/152-belarus.svg`,
      ogLocale: "be_BY",
      dir: "ltr",
      tier: 3,
      ready: true,
      fallback: null,
      region: "europe"
    },
    fa: {
      name: "Persian (Farsi)",
      nativeName: "فارسی",
      flag: `${FLAG_BASE}/200-iran.svg`,
      ogLocale: "fa_IR",
      dir: "rtl",
      tier: 3,
      ready: true,
      fallback: null,
      region: "middleEast"
    },
    bn: {
      name: "Bengali",
      nativeName: "বাংলা",
      flag: `${FLAG_BASE}/134-bangladesh.svg`,
      ogLocale: "bn_BD",
      dir: "ltr",
      tier: 3,
      ready: true,
      fallback: null,
      region: "asiaPacific"
    },
    ur: {
      name: "Urdu",
      nativeName: "اردو",
      flag: `${FLAG_BASE}/232-pakistan.svg`,
      ogLocale: "ur_PK",
      dir: "rtl",
      tier: 3,
      ready: true,
      fallback: null,
      region: "asiaPacific"
    },
    pa: {
      name: "Punjabi",
      nativeName: "ਪੰਜਾਬੀ",
      flag: `${FLAG_BASE}/055-india.svg`,
      ogLocale: "pa_IN",
      dir: "ltr",
      tier: 3,
      ready: true,
      fallback: null,
      region: "asiaPacific"
    },
    ta: {
      name: "Tamil",
      nativeName: "தமிழ்",
      flag: `${FLAG_BASE}/055-india.svg`,
      ogLocale: "ta_IN",
      dir: "ltr",
      tier: 3,
      ready: true,
      fallback: null,
      region: "asiaPacific"
    },
    te: {
      name: "Telugu",
      nativeName: "తెలుగు",
      flag: `${FLAG_BASE}/055-india.svg`,
      ogLocale: "te_IN",
      dir: "ltr",
      tier: 3,
      ready: true,
      fallback: null,
      region: "asiaPacific"
    },
    mr: {
      name: "Marathi",
      nativeName: "मराठी",
      flag: `${FLAG_BASE}/055-india.svg`,
      ogLocale: "mr_IN",
      dir: "ltr",
      tier: 3,
      ready: true,
      fallback: null,
      region: "asiaPacific"
    },
    gu: {
      name: "Gujarati",
      nativeName: "ગુજરાતી",
      flag: `${FLAG_BASE}/055-india.svg`,
      ogLocale: "gu_IN",
      dir: "ltr",
      tier: 3,
      ready: true,
      fallback: null,
      region: "asiaPacific"
    },
    kn: {
      name: "Kannada",
      nativeName: "ಕನ್ನಡ",
      flag: `${FLAG_BASE}/055-india.svg`,
      ogLocale: "kn_IN",
      dir: "ltr",
      tier: 3,
      ready: true,
      fallback: null,
      region: "asiaPacific"
    },
    ml: {
      name: "Malayalam",
      nativeName: "മലയാളം",
      flag: `${FLAG_BASE}/055-india.svg`,
      ogLocale: "ml_IN",
      dir: "ltr",
      tier: 3,
      ready: true,
      fallback: null,
      region: "asiaPacific"
    },
    ne: {
      name: "Nepali",
      nativeName: "नेपाली",
      flag: `${FLAG_BASE}/012-nepal.svg`,
      ogLocale: "ne_NP",
      dir: "ltr",
      tier: 3,
      ready: true,
      fallback: null,
      region: "asiaPacific"
    },
    si: {
      name: "Sinhala",
      nativeName: "සිංහල",
      flag: `${FLAG_BASE}/023-sri%20lanka.svg`,
      ogLocale: "si_LK",
      dir: "ltr",
      tier: 3,
      ready: true,
      fallback: null,
      region: "asiaPacific"
    },
    my: {
      name: "Burmese",
      nativeName: "မြန်မာ",
      flag: `${FLAG_BASE}/235-myanmar.svg`,
      ogLocale: "my_MM",
      dir: "ltr",
      tier: 3,
      ready: true,
      fallback: null,
      region: "asiaPacific"
    },
    km: {
      name: "Khmer",
      nativeName: "ខ្មែរ",
      flag: `${FLAG_BASE}/130-cambodia.svg`,
      ogLocale: "km_KH",
      dir: "ltr",
      tier: 3,
      ready: true,
      fallback: null,
      region: "asiaPacific"
    },
    lo: {
      name: "Lao",
      nativeName: "ລາວ",
      flag: `${FLAG_BASE}/194-laos.svg`,
      ogLocale: "lo_LA",
      dir: "ltr",
      tier: 3,
      ready: true,
      fallback: null,
      region: "asiaPacific"
    },
    mn: {
      name: "Mongolian",
      nativeName: "Монгол",
      flag: `${FLAG_BASE}/010-mongolia.svg`,
      ogLocale: "mn_MN",
      dir: "ltr",
      tier: 3,
      ready: true,
      fallback: null,
      region: "asiaPacific"
    },
    az: {
      name: "Azerbaijani",
      nativeName: "Azərbaycan",
      flag: `${FLAG_BASE}/137-azerbaijan.svg`,
      ogLocale: "az_AZ",
      dir: "ltr",
      tier: 3,
      ready: true,
      fallback: null,
      region: "europe"
    },
    kk: {
      name: "Kazakh",
      nativeName: "Қазақ",
      flag: `${FLAG_BASE}/229-kazakhstan.svg`,
      ogLocale: "kk_KZ",
      dir: "ltr",
      tier: 3,
      ready: true,
      fallback: null,
      region: "asiaPacific"
    },
    uz: {
      name: "Uzbek",
      nativeName: "Oʻzbek",
      flag: `${FLAG_BASE}/041-uzbekist%C3%A1n.svg`,
      ogLocale: "uz_UZ",
      dir: "ltr",
      tier: 3,
      ready: true,
      fallback: null,
      region: "asiaPacific"
    },
    ka: {
      name: "Georgian",
      nativeName: "ქართული",
      flag: `${FLAG_BASE}/005-georgia.svg`,
      ogLocale: "ka_GE",
      dir: "ltr",
      tier: 3,
      ready: true,
      fallback: null,
      region: "europe"
    },
    sw: {
      name: "Swahili",
      nativeName: "Kiswahili",
      flag: `${FLAG_BASE}/260-tanzania.svg`,
      ogLocale: "sw_KE",
      dir: "ltr",
      tier: 3,
      ready: true,
      fallback: null,
      region: "africa"
    }
  };
  const r = Object.keys(t);
  let i = r.filter(e => t[e].ready);
  Object.fromEntries(r.map(e => [e, t[e].name]));
  const l: Record<string, string> = {
    "es-419": "es-MX",
    "zh-Hans": "zh-Hans",
    "zh-Hant": "zh-Hant",
    ar: "ar",
    be: "be",
    nb: "nb-NO"
  };
  const n: Record<string, string> = {
    nb: "no"
  };
  const o = new Set(["en", "de", "fr", "es", "pt", "it", "nl", "pl", "cs", "ja", "ko", "ru", "tr", "zh", "ar", "hi", "id", "vi", "th", "sv", "da", "no", "fi", "el", "hu", "ro", "uk", "he", "sk", "bg", "hr", "fil", "ms", "ca", "sl", "lt", "lv", "et", "sr", "bs", "mk", "is", "ga", "be", "fa", "bn", "ur", "pa", "ta", "te", "mr", "gu", "kn", "ml", "ne", "az", "kk", "ka", "sw"]);

export const DEFAULT_LOCALE = "en";
export const READY_LOCALES = r.filter((e) => t[e].ready);
export const REGION_ORDER = ["americas", "europe", "middleEast", "africa", "asiaPacific"];
export function toElevenLabsLanguageSupported(e: string): string {
    let a;
    let t = n[a = e.split("-")[0].toLowerCase()] ?? a;
  if (o.has(t)) {
    return t;
  }
  return "en";
}
export function toAvatarVendorDynLang(e: string): string {
  const special = l[e];
  if (special) {
    return special;
  }
  const def = t[e];
  if (def) {
    return def.ogLocale.replace("_", "-");
  }
  return e;
}

export { t as LOCALE_CONFIG };
export const LOCALE_NAMES = Object.fromEntries(r.map((e) => [e, t[e].name]));
