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
    return JSON.parse(atob(b64Payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}
