const TOKEN_KEY_PREFIX = "resume_session_token_";

export function storeSessionToken(sessionId: string, token: string): void {
  try {
    localStorage.setItem(`${TOKEN_KEY_PREFIX}${sessionId}`, token);
  } catch {
  }
}

export function getSessionToken(sessionId: string): string | undefined {
  try {
    return localStorage.getItem(`${TOKEN_KEY_PREFIX}${sessionId}`) ?? undefined;
  } catch {
    return undefined;
  }
}

export function clearSessionToken(sessionId: string): void {
  try {
    localStorage.removeItem(`${TOKEN_KEY_PREFIX}${sessionId}`);
  } catch {
  }
}
