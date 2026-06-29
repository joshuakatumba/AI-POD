import { notFound } from 'next/navigation';

export const locales = ['en', 'ja'] as const;
export type Locale = (typeof locales)[number]; // "en" | "ja"
export const defaultLocale: Locale = 'en';

export async function getMessages(locale: string) {
  if (!locales.includes(locale as Locale)) notFound();

  return (await import(`../messages/${locale}.json`)).default;
}
