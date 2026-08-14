import type { ContentCta } from '../content/public-content';
import { isRouteAvailable, routeForTarget, type PublicRoute } from './page-model';
import type { HomeContent } from '../content/public-content';

export type CtaResolution =
  | { kind: 'inquiry' }
  | { kind: 'route'; path: PublicRoute }
  | { kind: 'anchor'; id: string }
  | { kind: 'external'; url: string }
  | { kind: 'unavailable' };

export function resolveCta(cta: ContentCta, home: HomeContent, currentPath: string): CtaResolution {
  if (cta.action === 'inquiry') return { kind: 'inquiry' };
  if (cta.action === 'link') {
    return /^https:\/\//i.test(cta.target) || /^mailto:/i.test(cta.target)
      ? { kind: 'external', url: cta.target }
      : { kind: 'unavailable' };
  }
  const local = document.getElementById(cta.target);
  if (local) return { kind: 'anchor', id: cta.target };
  const path = routeForTarget(cta.target);
  if (!path || !isRouteAvailable(home, path)) return { kind: 'unavailable' };
  if (path === currentPath) return { kind: 'anchor', id: 'main-content' };
  return { kind: 'route', path };
}
