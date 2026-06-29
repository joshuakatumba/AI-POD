export const SUPPORTED_LOCALES = ['en', 'ja'] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = 'en';

export const LOCALE_OVERRIDE_STORAGE_KEY =
  process.env.NEXT_PUBLIC_LOCALE_OVERRIDE_STORAGE_KEY as string;

export const LOCALE_EFFECTIVE_STORAGE_KEY =
  process.env.NEXT_PUBLIC_LOCALE_EFFECTIVE_STORAGE_KEY as string;

export const LOCALE_COOKIE_KEY =
  process.env.NEXT_PUBLIC_LOCALE_COOKIE_KEY as string;

export function isSupportedLocale(
  value: string | null | undefined
): value is AppLocale {
  return Boolean(value && SUPPORTED_LOCALES.includes(value as AppLocale));
}

export function toSupportedLocale(
  value: string | null | undefined
): AppLocale | null {
  return isSupportedLocale(value) ? value : null;
}

export function resolveLocale(
  value: string | null | undefined,
  fallback: AppLocale = DEFAULT_LOCALE
): AppLocale {
  return toSupportedLocale(value) ?? fallback;
}

export function getLocaleFromPath(pathname: string): AppLocale | null {
  const segment = pathname.split('/')[1] ?? null;
  return toSupportedLocale(segment);
}

export function replaceLocaleInPath(pathname: string, locale: AppLocale): string {
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const segments = normalizedPath.split('/');

  if (isSupportedLocale(segments[1])) {
    segments[1] = locale;
    return segments.join('/');
  }

  if (normalizedPath === '/') {
    return `/${locale}`;
  }

  return `/${locale}${normalizedPath}`;
}

import { canUseBrowserStorage } from '@/utils/browserStorage';

export function getLocalOverrideLocale(): AppLocale | null {
  if (!canUseBrowserStorage()) return null;
  return toSupportedLocale(localStorage.getItem(LOCALE_OVERRIDE_STORAGE_KEY));
}

export function setLocalOverrideLocale(locale: AppLocale): void {
  if (!canUseBrowserStorage()) return;
  localStorage.setItem(LOCALE_OVERRIDE_STORAGE_KEY, locale);
}

export function clearLocalOverrideLocale(): void {
  if (!canUseBrowserStorage()) return;
  localStorage.removeItem(LOCALE_OVERRIDE_STORAGE_KEY);
}

export function getEffectiveLocale(): AppLocale | null {
  if (!canUseBrowserStorage()) return null;
  return toSupportedLocale(localStorage.getItem(LOCALE_EFFECTIVE_STORAGE_KEY));
}

export function setEffectiveLocale(locale: AppLocale): void {
  if (!canUseBrowserStorage()) return;
  localStorage.setItem(LOCALE_EFFECTIVE_STORAGE_KEY, locale);
}

export function setLocaleCookie(locale: AppLocale): void {
  if (!canUseBrowserStorage()) return;
  document.cookie = `${LOCALE_COOKIE_KEY}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

export function persistLocale(
  locale: AppLocale,
  options?: { setOverride?: boolean }
): void {
  setEffectiveLocale(locale);

  if (options?.setOverride) {
    setLocalOverrideLocale(locale);
  }
}
