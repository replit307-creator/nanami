export function getSessionToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )nanami_session_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function setSessionToken(token: string, days = 30): void {
  if (typeof document === "undefined") return;
  const maxAge = days * 86400;
  document.cookie = `nanami_session_token=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function clearSessionToken(): void {
  if (typeof document === "undefined") return;
  document.cookie = "nanami_session_token=; path=/; max-age=0; SameSite=Lax";
}
