/**
 * Decode and validate JWT expiration
 * Works in both server and client environments
 */
export function isTokenExpired(token: string): boolean {
  try {
    const payload = token.split('.')[1];

    if (!payload) {
      return true;
    }

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(
      normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
    );
    const data = JSON.parse(decoded) as { exp?: number };

    if (typeof data.exp !== 'number') {
      return true;
    }

    return data.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}
