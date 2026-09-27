// Pure, framework-free helpers for the docs plugin marketplace page.
// Kept in a separate .ts module so they can be unit-tested with Vitest
// (the .vue component itself is not part of the typecheck/test surface).

import { PLATFORM_LOGOS } from '../../../../src/core/icons/platformLogos';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  category: string;
  homepage?: string;
  matches: string[];
  theme?: { brand?: string };
  i18n?: Record<string, { name?: string; description?: string }>;
}

export interface PlatformMark {
  viewBox: string;
  paths: readonly string[];
}

export interface Platform {
  key: string;
  label: string;
  color: string;
  mark: PlatformMark;
}

// Grok is the one supported host the extension's shared logo set leaves out.
const GROK: PlatformMark & { label: string; brand: string } = {
  label: 'Grok',
  brand: '#111827',
  viewBox: '0 0 24 24',
  paths: [
    'M9.27 15.29l7.978-5.897c.391-.29.95-.177 1.137.272.98 2.369.542 5.215-1.41 7.169-1.951 1.954-4.667 2.382-7.149 1.406l-2.711 1.257c3.889 2.661 8.611 2.003 11.562-.953 2.341-2.344 3.066-5.539 2.388-8.42l.006.007c-.983-4.232.242-5.924 2.75-9.383.06-.082.12-.164.179-.248l-3.301 3.305v-.01L9.267 15.292M7.623 16.723c-2.792-2.67-2.31-6.801.071-9.184 1.761-1.763 4.647-2.483 7.166-1.425l2.705-1.25a7.808 7.808 0 00-1.829-1A8.975 8.975 0 005.984 5.83c-2.533 2.536-3.33 6.436-1.962 9.764 1.022 2.487-.653 4.246-2.34 6.022-.599.63-1.199 1.259-1.682 1.925l7.62-6.815',
  ],
};

// Marks, labels and brand colours come from the extension's own
// `src/core/icons/platformLogos.ts`, so the store and the popup draw the same logos.
const PLATFORM_HOSTS: { key: keyof typeof PLATFORM_LOGOS | 'grok'; hosts: string[] }[] = [
  { key: 'claude', hosts: ['claude.ai'] },
  { key: 'chatgpt', hosts: ['chatgpt.com', 'chat.openai.com'] },
  { key: 'deepseek', hosts: ['chat.deepseek.com'] },
  { key: 'gemini', hosts: ['gemini.google.com'] },
  { key: 'aistudio', hosts: ['aistudio.google.com'] },
  { key: 'grok', hosts: ['grok.com', 'x.com'] },
];

function platformFor(key: keyof typeof PLATFORM_LOGOS | 'grok'): Platform {
  const logo = key === 'grok' ? GROK : PLATFORM_LOGOS[key];
  return {
    key,
    label: logo.label,
    color: ('brand' in logo && logo.brand) || 'currentColor',
    mark: { viewBox: logo.viewBox, paths: logo.paths },
  };
}

const PLATFORMS = PLATFORM_HOSTS.map(({ key, hosts }) => ({ ...platformFor(key), hosts }));

function hostFromMatch(pattern: string): string {
  try {
    return new URL(pattern.replace(/\*/g, 'x')).hostname.toLowerCase();
  } catch {
    return pattern.toLowerCase();
  }
}

function hostMatchesSuffix(host: string, suffix: string): boolean {
  return host === suffix || host.endsWith(`.${suffix}`);
}

/** Map a manifest's `matches` patterns to a deduped list of known platforms. */
export function platformsFromMatches(matches: readonly string[] | undefined): Platform[] {
  if (!matches) return [];
  const found = new Map<string, Platform>();
  for (const pattern of matches) {
    const host = hostFromMatch(pattern);
    for (const { hosts, ...platform } of PLATFORMS) {
      if (!found.has(platform.key) && hosts.some((h) => hostMatchesSuffix(host, h))) {
        found.set(platform.key, platform);
      }
    }
  }
  return [...found.values()];
}

const PLATFORM_PREFIX = new RegExp(
  `^(${PLATFORMS.map((p) => p.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\s*[·:|]\\s*`,
  'i',
);

/** Strip a redundant "Claude · " / "DeepSeek · " platform prefix (the logo shows it). */
export function displayName(name: string): string {
  return name.replace(PLATFORM_PREFIX, '');
}

/**
 * A merged card keeps its first member's description, which usually names that
 * member's platform ("Adds a timeline to Claude"). Swap that name for the whole
 * list in the page's language so the text matches the platforms on the card.
 */
export function describeForPlatforms(
  description: string,
  ownLabels: readonly string[],
  allLabels: readonly string[],
  lang: string,
): string {
  if (allLabels.length < 2) return description;
  const own = ownLabels.find((label) => description.includes(label));
  if (!own) return description;
  const list = new Intl.ListFormat(lang, { style: 'long', type: 'conjunction' })
    .format(allLabels)
    // ICU joins "ChatGPT和DeepSeek" tightly; CJK copy on this site spaces Latin words.
    .replace(/([A-Za-z0-9])([\u3400-\u9fff])/g, '$1 $2')
    .replace(/([\u3400-\u9fff])([A-Za-z0-9])/g, '$1 $2');
  return description.replace(own, list);
}

/**
 * Group plugins by feature. The same feature shipped per-site (e.g. the Claude
 * and ChatGPT "Comfortable Reading Width" CSS plugins) shares one display name
 * once the platform prefix is stripped, so they collapse into a single group —
 * letting the marketplace show one card per feature with the union of its
 * platforms. Insertion order is preserved; each group keeps its members' order.
 */
export function groupPluginsByFeature<T extends { name: string }>(plugins: readonly T[]): T[][] {
  const groups = new Map<string, T[]>();
  for (const plugin of plugins) {
    const key = displayName(plugin.name);
    const existing = groups.get(key);
    if (existing) existing.push(plugin);
    else groups.set(key, [plugin]);
  }
  return [...groups.values()];
}

/** Path prefix for a locale, used to build locale-aware doc links. */
export function localePrefix(lang: string): string {
  const map: Record<string, string> = {
    'zh-CN': '',
    'zh-TW': '/zh_TW',
    'en-US': '/en',
    'ja-JP': '/ja',
    'ko-KR': '/ko',
    'fr-FR': '/fr',
    'es-ES': '/es',
    'pt-PT': '/pt',
    'ar-SA': '/ar',
    'ru-RU': '/ru',
  };
  return map[lang] ?? '';
}

/** Catalog i18n locale code for a VitePress lang (matches the extension's 10 codes). */
export function localeKey(lang: string): string {
  const map: Record<string, string> = {
    'zh-CN': 'zh',
    'zh-TW': 'zh_TW',
    'en-US': 'en',
    'ja-JP': 'ja',
    'ko-KR': 'ko',
    'fr-FR': 'fr',
    'es-ES': 'es',
    'pt-PT': 'pt',
    'ar-SA': 'ar',
    'ru-RU': 'ru',
  };
  return map[lang] ?? 'en';
}

/**
 * Native (JS-backed) first-party plugins, mirrored from the extension's
 * `src/features/plugins/builtin/index.ts`. They are bundled inside the
 * extension rather than served from `marketplace.json`, so the public
 * marketplace page lists them here to keep parity. Brand colours and platform
 * mapping fall through the same `platformsFromMatches` path as catalog plugins.
 */
export const NATIVE_PLUGINS: (PluginManifest & { official: boolean })[] = [
  {
    id: 'voyager.formula-copy',
    name: 'Formula Copy',
    version: '1.0.0',
    description: "Click an inline or block formula to copy its LaTeX; hover shows it's clickable.",
    category: 'productivity',
    homepage: 'https://github.com/voyager-crew/voyager/tree/main/src/features/plugins/builtin',
    matches: ['https://claude.ai/*', 'https://chatgpt.com/*', 'https://chat.openai.com/*'],
    official: true,
    i18n: {
      zh: {
        name: '公式复制',
        description: '点击行内或块级公式即可复制 LaTeX；悬停时会提示可点击。',
      },
      zh_TW: {
        name: '公式複製',
        description: '點擊行內或區塊公式即可複製 LaTeX；滑鼠懸停時會提示可點擊。',
      },
      ja: {
        name: '数式コピー',
        description:
          'インラインまたはブロック数式をクリックして LaTeX をコピーできます。ホバーするとクリック可能であることが分かります。',
      },
      ko: {
        name: '수식 복사',
        description:
          '인라인 또는 블록 수식을 클릭해 LaTeX를 복사합니다. 마우스를 올리면 클릭 가능함을 표시합니다.',
      },
      fr: {
        name: 'Copie de formules',
        description:
          "Cliquez sur une formule en ligne ou en bloc pour copier son LaTeX ; le survol indique qu'elle est cliquable.",
      },
      es: {
        name: 'Copia de fórmulas',
        description:
          'Haz clic en una fórmula en línea o en bloque para copiar su LaTeX; al pasar el cursor se muestra que se puede hacer clic.',
      },
      pt: {
        name: 'Cópia de fórmulas',
        description:
          'Clique em uma fórmula inline ou em bloco para copiar o LaTeX; ao passar o cursor, ela indica que pode ser clicada.',
      },
      ru: {
        name: 'Копирование формул',
        description:
          'Нажмите на строчную или блочную формулу, чтобы скопировать её LaTeX; при наведении видно, что её можно нажать.',
      },
      ar: {
        name: 'نسخ الصيغ',
        description:
          'انقر على صيغة مضمنة أو كتلية لنسخ LaTeX الخاص بها؛ ويظهر عند التحويم أنها قابلة للنقر.',
      },
    },
  },
  {
    id: 'voyager.claude-timeline',
    name: 'Claude · Timeline',
    version: '1.0.0',
    description: 'Adds a compact conversation timeline to Claude with starred messages and search.',
    category: 'productivity',
    homepage:
      'https://github.com/voyager-crew/voyager/tree/main/src/features/plugins/builtin/claudeTimeline',
    matches: ['https://claude.ai/*'],
    official: true,
    i18n: {
      zh: {
        name: 'Claude · 时间线',
        description: '为 Claude 添加紧凑的对话时间线，支持星标消息和搜索。',
      },
      zh_TW: {
        name: 'Claude · 時間線',
        description: '為 Claude 加入緊湊的對話時間線，支援星標訊息與搜尋。',
      },
      ja: {
        name: 'Claude · タイムライン',
        description:
          'Claude にコンパクトな会話タイムラインを追加し、スター付きメッセージと検索に対応します。',
      },
      ko: {
        name: 'Claude · 타임라인',
        description: 'Claude에 별표 메시지와 검색을 지원하는 간단한 대화 타임라인을 추가합니다.',
      },
      fr: {
        name: 'Claude · Timeline',
        description: 'Ajoute une timeline compacte à Claude avec messages favoris et recherche.',
      },
      es: {
        name: 'Claude · Línea de tiempo',
        description:
          'Añade a Claude una línea de tiempo compacta con mensajes destacados y búsqueda.',
      },
      pt: {
        name: 'Claude · Linha do tempo',
        description:
          'Adiciona ao Claude uma linha do tempo compacta com mensagens favoritas e busca.',
      },
      ru: {
        name: 'Claude · Таймлайн',
        description: 'Добавляет в Claude компактную шкалу диалога со звёздами и поиском.',
      },
      ar: {
        name: 'Claude · المخطط الزمني',
        description: 'يضيف إلى Claude مخططًا زمنيًا موجزًا مع الرسائل المميزة والبحث.',
      },
    },
  },
];

/**
 * Category labels not present in the page's built-in `categories` maps (and the
 * "all" filter label). Keyed by the same locale codes as {@link localeKey} so
 * the component can fall back here before defaulting to "other".
 */
export const CATEGORY_FALLBACKS: Record<string, Record<string, string>> = {
  zh: { all: '全部', productivity: '效率' },
  zh_TW: { all: '全部', productivity: '效率' },
  en: { all: 'All', productivity: 'Productivity' },
  ja: { all: 'すべて', productivity: '生産性' },
  ko: { all: '전체', productivity: '생산성' },
  fr: { all: 'Tout', productivity: 'Productivité' },
  es: { all: 'Todos', productivity: 'Productividad' },
  pt: { all: 'Todos', productivity: 'Produtividade' },
  ar: { all: 'الكل', productivity: 'الإنتاجية' },
  ru: { all: 'Все', productivity: 'Продуктивность' },
};

/**
 * Copy for the in-grid "contribute a plugin" tile. Keyed by {@link localeKey}.
 * Replaces the old VitePress `::: tip` callout that used to sit above the page.
 */
export const CONTRIBUTE: Record<string, { title: string; body: string; cta: string }> = {
  zh: {
    title: '想贡献插件？',
    body: '推荐先从声明式 CSS + JSON 插件开始。',
    cta: '插件贡献说明',
  },
  zh_TW: {
    title: '想貢獻外掛？',
    body: '推薦先從宣告式 CSS + JSON 外掛開始。',
    cta: '外掛貢獻說明',
  },
  en: {
    title: 'Want to contribute a plugin?',
    body: 'We recommend starting with a declarative CSS + JSON plugin.',
    cta: 'Plugin Contribution Guide',
  },
  ja: {
    title: 'プラグインを貢献したいですか？',
    body: 'まずは宣言型 CSS + JSON プラグインから始めるのがおすすめです。',
    cta: 'プラグイン貢献ガイド',
  },
  ko: {
    title: '플러그인을 기여하고 싶나요?',
    body: '선언형 CSS + JSON 플러그인부터 시작하는 것을 권장합니다.',
    cta: '플러그인 기여 가이드',
  },
  fr: {
    title: 'Envie de contribuer un plugin ?',
    body: 'Nous recommandons de commencer par un plugin déclaratif CSS + JSON.',
    cta: 'Guide de contribution',
  },
  es: {
    title: '¿Quieres contribuir un plugin?',
    body: 'Recomendamos empezar con un plugin declarativo CSS + JSON.',
    cta: 'Guía de contribución',
  },
  pt: {
    title: 'Quer contribuir com um plugin?',
    body: 'Recomendamos começar com um plugin declarativo CSS + JSON.',
    cta: 'Guia de contribuição',
  },
  ru: {
    title: 'Хотите предложить плагин?',
    body: 'Рекомендуем начать с декларативного плагина CSS + JSON.',
    cta: 'Руководство по участию',
  },
  ar: {
    title: 'هل تريد المساهمة بإضافة؟',
    body: 'نوصي بالبدء بإضافة تعريفية من CSS + JSON.',
    cta: 'دليل المساهمة',
  },
};
