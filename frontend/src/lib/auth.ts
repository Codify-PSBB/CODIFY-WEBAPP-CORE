type TokenProvider = () => Promise<string | null>;

let tokenProvider: TokenProvider | null = null;

export function setAuthTokenProvider(provider: TokenProvider): void {
  tokenProvider = provider;
}

export function clearAuthTokenProvider(): void {
  tokenProvider = null;
}

export async function resolveAuthToken(): Promise<string | null> {
  const localToken = localStorage.getItem("codify_token");
  if (localToken) return localToken;

  if (!tokenProvider) {
    return null;
  }

  try {
    return await tokenProvider();
  } catch {
    return null;
  }
}

export function setLocalToken(token: string) {
  localStorage.setItem("codify_token", token);
  window.dispatchEvent(new Event("local-auth-change"));
}

export function clearLocalToken() {
  localStorage.removeItem("codify_token");
  window.dispatchEvent(new Event("local-auth-change"));
}

export function getLocalTokenPayload(): any | null {
  const token = localStorage.getItem("codify_token");
  if (!token) return null;
  try {
    const b64Payload = token.split(".")[1];
    return JSON.parse(atob(b64Payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

