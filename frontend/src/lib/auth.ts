type TokenProvider = () => Promise<string | null>;

let tokenProvider: TokenProvider | null = null;

export function setAuthTokenProvider(provider: TokenProvider): void {
  tokenProvider = provider;
}

export function clearAuthTokenProvider(): void {
  tokenProvider = null;
}

export async function resolveAuthToken(): Promise<string | null> {
  if (!tokenProvider) {
    return null;
  }

  try {
    return await tokenProvider();
  } catch {
    return null;
  }
}
