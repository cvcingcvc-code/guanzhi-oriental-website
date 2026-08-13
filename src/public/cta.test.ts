import { afterEach, describe, expect, it } from 'vitest';
import { FALLBACK_HOME_ZH } from '../content/public-content';
import { resolveCta } from './cta';

afterEach(() => document.body.innerHTML = '');

describe('CMS CTA dispatcher', () => {
  it('opens inquiry action', () => expect(resolveCta({ label: 'Talk', action: 'inquiry', target: 'inquiry' }, FALLBACK_HOME_ZH, '/')).toEqual({ kind: 'inquiry' }));
  it('maps internal legacy anchors to routes', () => expect(resolveCta({ label: 'Capabilities', action: 'scroll', target: 'solutions' }, FALLBACK_HOME_ZH, '/')).toEqual({ kind: 'route', path: '/capabilities' }));
  it('scrolls to a real section on the current page', () => {
    document.body.innerHTML = '<div id="details"></div>';
    expect(resolveCta({ label: 'Details', action: 'scroll', target: 'details' }, FALLBACK_HOME_ZH, '/')).toEqual({ kind: 'anchor', id: 'details' });
  });
  it('accepts contract-approved external links', () => expect(resolveCta({ label: 'External', action: 'link', target: 'https://example.com' }, FALLBACK_HOME_ZH, '/')).toEqual({ kind: 'external', url: 'https://example.com' }));
  it('fails closed for invalid or disabled targets', () => {
    const home = { ...FALLBACK_HOME_ZH, blocks: FALLBACK_HOME_ZH.blocks.filter((block) => block.type !== 'about') };
    expect(resolveCta({ label: 'About', action: 'scroll', target: 'about' }, home, '/')).toEqual({ kind: 'unavailable' });
    expect(resolveCta({ label: 'Bad', action: 'link', target: 'javascript:alert(1)' }, home, '/')).toEqual({ kind: 'unavailable' });
  });
});
