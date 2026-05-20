const SALT = "CODIFY_SALT_2026!"; // Simple static salt for simplicity, ideally random per user, but since the scope is "simpler auth without verifications", this is fine.

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(password + SALT);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return bufferToHex(hash);
}
