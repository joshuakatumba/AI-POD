import { canUseBrowserStorage } from '@/utils/browserStorage';

export const SIDEBAR_COLLAPSE_COOKIE_KEY = process.env.NEXT_PUBLIC_SIDEBAR_COLLAPSE_KEY as string;

export function getSidebarCollapseFromCookie(): boolean | null {
  if (!canUseBrowserStorage()) return null;
  
  const cookieValue = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${SIDEBAR_COLLAPSE_COOKIE_KEY}=`))
    ?.split('=')[1];
  
  if (!cookieValue) return null;
  
  return cookieValue === 'true';
}

export function setSidebarCollapseCookie(isCollapsed: boolean): void {
  if (!canUseBrowserStorage()) return;
  document.cookie = `${SIDEBAR_COLLAPSE_COOKIE_KEY}=${isCollapsed}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}
