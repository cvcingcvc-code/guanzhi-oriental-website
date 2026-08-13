import { describe, expect, it } from 'vitest';
import { FALLBACK_HOME_ZH } from '../content/public-content';
import { publicPages, routeForTarget } from './page-model';

describe('public page model', () => {
  it('maps enabled CMS blocks to routes', () => {
    expect(publicPages(FALLBACK_HOME_ZH).map((page) => page.path)).toEqual([
      '/', '/about', '/capabilities', '/into-jiangnan', '/partners', '/contact',
    ]);
  });

  it('removes disabled block routes and navigation entries', () => {
    const home = { ...FALLBACK_HOME_ZH, blocks: FALLBACK_HOME_ZH.blocks.filter((block) => block.type !== 'about' && block.type !== 'partners') };
    expect(publicPages(home).map((page) => page.path)).toEqual(['/', '/capabilities', '/into-jiangnan', '/contact']);
  });

  it('keeps capabilities when either capabilities or motifs is enabled', () => {
    const home = { ...FALLBACK_HOME_ZH, blocks: FALLBACK_HOME_ZH.blocks.filter((block) => block.type !== 'capabilities') };
    expect(publicPages(home).some((page) => page.path === '/capabilities')).toBe(true);
  });

  it('maps legacy CMS scroll targets to routes without changing the contract', () => {
    expect(routeForTarget('solutions')).toBe('/capabilities');
    expect(routeForTarget('contact')).toBe('/contact');
    expect(routeForTarget('missing')).toBeUndefined();
  });
});
