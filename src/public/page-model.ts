import type { ContentLocale, HomeBlock, HomeContent } from '../content/public-content';

export type PublicRoute = '/' | '/about' | '/capabilities' | '/into-jiangnan' | '/partners' | '/contact';

export type PublicPage = {
  path: PublicRoute;
  label: string;
  blockTypes: HomeBlock['type'][];
};

const labels: Record<ContentLocale, Record<PublicRoute, string>> = {
  'zh-CN': {
    '/': '首页',
    '/about': '关于观止',
    '/capabilities': '产品与能力',
    '/into-jiangnan': '入江南',
    '/partners': '合作伙伴',
    '/contact': '联系我们',
  },
  en: {
    '/': 'Home',
    '/about': 'About',
    '/capabilities': 'Capabilities',
    '/into-jiangnan': 'Into Jiangnan',
    '/partners': 'Partners',
    '/contact': 'Contact',
  },
};

const routeBlocks: Array<[PublicRoute, HomeBlock['type'][]]> = [
  ['/', ['hero']],
  ['/about', ['about']],
  ['/capabilities', ['capabilities', 'motifs']],
  ['/into-jiangnan', ['jiangnan']],
  ['/partners', ['partners']],
  ['/contact', ['contact']],
];

export function blockMap(home: HomeContent) {
  return new Map(home.blocks.map((block) => [block.type, block]));
}

export function publicPages(home: HomeContent): PublicPage[] {
  const visible = blockMap(home);
  return routeBlocks
    .filter(([path, types]) => path === '/' || types.some((type) => visible.has(type)))
    .map(([path, blockTypes]) => ({ path, blockTypes, label: labels[home.locale][path] }));
}

export function isRouteAvailable(home: HomeContent, path: string) {
  return publicPages(home).some((page) => page.path === path);
}

const legacyTargets: Record<string, PublicRoute> = {
  hero: '/', home: '/', about: '/about', solutions: '/capabilities', capabilities: '/capabilities',
  studio: '/capabilities', lab: '/capabilities', jiangnan: '/into-jiangnan', partners: '/partners',
  contact: '/contact', inquiry: '/contact',
};

export function routeForTarget(target: string): PublicRoute | undefined {
  if (target.startsWith('/')) {
    return routeBlocks.some(([route]) => route === target) ? target as PublicRoute : undefined;
  }
  return legacyTargets[target];
}
