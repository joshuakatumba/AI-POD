export function canUseBrowserStorage(): boolean {
  return typeof window !== 'undefined';
}