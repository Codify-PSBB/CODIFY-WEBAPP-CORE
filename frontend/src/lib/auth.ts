/**
 * Auth helpers for the custom JWT-based auth system.
 * The token is stored in localStorage under "codify_token".
 * All users (admins and members) use the same username+password login.
 */

export function resolveAuthToken(): string | null {
  return localStorage.getItem("codify_token");
}

export function setLocalToken(token: string): void {
  localStorage.setItem("codify_token", token);
  window.dispatchEvent(new Event("local-auth-change"));
}

export function clearLocalToken(): void {
  localStorage.removeItem("codify_token");
  window.dispatchEvent(new Event("local-auth-change"));
}

export function getLocalTokenPayload(): {
  sub: string;
  email: string;
  role: "admin" | "member";
  name: string;
  exp: number;
} | null {
  const token = localStorage.getItem("codify_token");
  if (!token) return null;
  try {
    const b64Payload = token.split(".")[1];
    if (!b64Payload) return null;
    const payload = JSON.parse(atob(b64Payload.replace(/-/g, "+").replace(/_/g, "/")));
    
    // Check expiration locally
    if (payload && typeof payload.exp === "number") {
      if (Math.floor(Date.now() / 1000) > payload.exp) {
        // Automatically clear expired token
        localStorage.removeItem("codify_token");
        return null;
      }
    }
    return payload;
  } catch {
    return null;
  }
}
