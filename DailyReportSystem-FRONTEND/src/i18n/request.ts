// i18n request configuration for next-intl
import { getRequestConfig } from 'next-intl/server';

type RequestWithUrl = {
  nextUrl?: { pathname?: string };
  url?: string;
};

export default getRequestConfig(async (req) => {
  // req.url may be undefined in some Next.js invocation contexts.
  // Prefer nextUrl.pathname when available; otherwise fall back to req.url parsing or default to '/'.
  const request = req as RequestWithUrl;
  const pathname = request.nextUrl?.pathname ?? (request.url ? new URL(request.url).pathname : '/');
  const parts = pathname.split('/').filter(Boolean);
  const locale = parts.length && (parts[0] === 'en' || parts[0] === 'ja') ? parts[0] : 'en';

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});