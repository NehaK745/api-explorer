export interface AuthSettings {
  baseUrl: string;
  scheme: string;   // 'Bearer', 'Token', or '' to send the raw token
}

const LOCAL_HTTP = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/;

export function applyAuth(
  headers: Record<string, string>,
  token: string | undefined,
  settings: AuthSettings
): Record<string, string> {
  if (!token) {
    return headers;
  }
  const secure = settings.baseUrl.startsWith('https://') || LOCAL_HTTP.test(settings.baseUrl);
  if (!secure) {
    throw new Error('Refusing to send the token over a non-HTTPS URL.');
  }
  const scheme = settings.scheme.trim();
  return { ...headers, Authorization: scheme ? `${scheme} ${token}` : token };
}