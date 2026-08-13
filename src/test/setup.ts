import '@testing-library/jest-dom/vitest';

if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', { value: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) });
}
window.scrollTo = () => undefined;
Element.prototype.scrollIntoView = () => undefined;
