/**
 * Product branding.
 *
 * Declared once and rendered in three places — the launcher boot screen, the
 * About window and the status bar — so the attribution cannot drift between
 * them and cannot be reduced to a console log that nobody sees.
 */

/** Injected by Vite/Vitest from `engine/package.json` at build time. */
declare const __CYRE_ENGINE_VERSION__: string | undefined;
/** Injected by Vite/Vitest from `studio/package.json` at build time. */
declare const __CYRE_STUDIO_VERSION__: string | undefined;

function injectedVersion(name: '__CYRE_ENGINE_VERSION__' | '__CYRE_STUDIO_VERSION__'): string {
  // `typeof` on an undeclared identifier is safe and yields 'undefined', which
  // is what happens if the build did not define it. Reporting 'unknown' beats
  // inventing a number.
  if (name === '__CYRE_ENGINE_VERSION__' && typeof __CYRE_ENGINE_VERSION__ !== 'undefined') {
    return __CYRE_ENGINE_VERSION__;
  }
  if (name === '__CYRE_STUDIO_VERSION__' && typeof __CYRE_STUDIO_VERSION__ !== 'undefined') {
    return __CYRE_STUDIO_VERSION__;
  }
  return 'unknown';
}

export const CYRE_BRANDING = {
  product: 'CYRE Studio',
  productTagline: 'Cybersecurity simulation editor for the CYRE engine',
  company: 'Forgex4',
  developer: 'Kian Mansouri Jamshidi',
  developerRole: 'Founder of Forgex4',
  copyrightYear: new Date().getFullYear(),
} as const;

/** The engine version the Studio was built against. */
export function engineVersion(): string {
  return injectedVersion('__CYRE_ENGINE_VERSION__');
}

/** The Studio's own version. */
export function studioVersion(): string {
  return injectedVersion('__CYRE_STUDIO_VERSION__');
}

/** One-line attribution, e.g. "Kian Mansouri Jamshidi · Founder of Forgex4". */
export function attribution(): string {
  return `${CYRE_BRANDING.developer} · ${CYRE_BRANDING.developerRole}`;
}

/** Copyright line, e.g. "© 2026 Forgex4". */
export function copyrightLine(): string {
  return `© ${CYRE_BRANDING.copyrightYear} ${CYRE_BRANDING.company}`;
}
