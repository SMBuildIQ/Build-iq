const TOKEN_COOKIE = "bq_token";
const SESSION_COOKIE = "bq_session";
const MAX_AGE = 60 * 60 * 24 * 14;

export function setAuthCookies(token: string, sessionValue = "1") {
  if (typeof document === "undefined") return;
  document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
  document.cookie = `${SESSION_COOKIE}=${encodeURIComponent(sessionValue)}; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
}

export function clearAuthCookies() {
  if (typeof document === "undefined") return;
  document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

export function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function getClientToken(): string | null {
  return readCookie(TOKEN_COOKIE);
}

export { TOKEN_COOKIE, SESSION_COOKIE };
