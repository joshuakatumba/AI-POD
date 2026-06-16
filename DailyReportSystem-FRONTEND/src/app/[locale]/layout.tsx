// import { NextIntlClientProvider } from 'next-intl';
// import { getMessages, locales } from '@/i18n';

// export function generateStaticParams() {
//   return locales.map(locale => ({ locale }));
// }

// export default async function LocaleLayout({
//   children,
//   params: { locale }
// }: {
//   children: React.ReactNode;
//   params: { locale: string };
// }) {
//   const messages = await getMessages(locale);

//   return (
//     <html lang={locale}>
//       <body>
//         <NextIntlClientProvider locale={locale} messages={messages}>
//           {children}
//         </NextIntlClientProvider>
//       </body>
//     </html>
//   );
// }

import { NextIntlClientProvider } from 'next-intl';
import { getMessages, locales } from '@/i18n';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout(props: {
  children: React.ReactNode;
  params: { locale: string } | Promise<{ locale: string }>;
}) {
  const { children, params } = props;
  const { locale } = await params;
  const messages = await getMessages(locale);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
