// import { cookies } from 'next/headers';

import { isTokenExpired } from './jwt';

const BASE_URL =
  typeof window === 'undefined'
    ? process.env.SERVER_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function getClientToken() {
  if (typeof document === 'undefined') {
    return undefined;
  }

  return document.cookie
    .split('; ')
    .find((row) => row.startsWith('token='))
    ?.split('=')[1];
}

function redirectToLogin() {
  if (typeof window === 'undefined') {
    return;
  }

  const locale = window.location.pathname.match(/^\/(en|ja)(?:\/|$)/)?.[1] ?? 'en';
  window.location.href = `/${locale}/login`;
}


/**
 * Server-Safe un-authenticated Fetch
 */
export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${BASE_URL}${endpoint}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers: defaultHeaders,
  });

  return response
}

/**
 * Server-Safe Authenticated Fetch
 */
export async function authFetch(endpoint: string, options: RequestInit = {}) {
  let token: string | undefined;

  if (typeof window === 'undefined') {
    // We are on the Server
    // const { cookies } = await import('next/headers');
    // const cookieStore = await cookies();
    // token = cookieStore.get('accessToken')?.value;
  } else {
    // We are on the Client (optional: if you still use localStorage)
    token = getClientToken();
  }

  if (token && isTokenExpired(token)) {
    redirectToLogin();
    throw new Error('Authentication token expired');
  }

  const authHeaders = {
    ...options.headers,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };

  const response = await apiFetch(endpoint, { ...options, headers: authHeaders });

  if (response.status === 401) {
    redirectToLogin();
  }

  return response;
}
