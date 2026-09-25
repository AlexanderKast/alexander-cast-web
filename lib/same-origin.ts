/**
 * Strict same-origin check for public POST endpoints.
 *
 * Unlike the lenient variant, a request WITHOUT Origin/Referer is rejected:
 * browsers always send Origin on cross-origin/POST fetches, so a missing
 * header means a script (curl, bots) that should not reach these endpoints.
 */
export function isSameOriginStrict(headers: Pick<Headers, 'get'>): boolean {
  const host = headers.get('host');
  const origin = headers.get('origin') ?? headers.get('referer');
  if (!host || !origin) return false;
  try {
    return new URL(origin).host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}
