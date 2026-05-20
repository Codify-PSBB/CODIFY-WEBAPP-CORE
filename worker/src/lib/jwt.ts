function base64url(source: Uint8Array): string {
  let result = btoa(String.fromCharCode(...source));
  return result.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64urlDecode(source: string): Uint8Array {
  let s = source.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) {
    s += "=";
  }
  const decoded = atob(s);
  const bytes = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i++) {
    bytes[i] = decoded.charCodeAt(i);
  }
  return bytes;
}

export async function signJwt(payload: any, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const header = { alg: "HS256", typ: "CUSTOM_JWT" };
  const strHeader = JSON.stringify(header);
  const strPayload = JSON.stringify(payload);
  
  const b64Header = base64url(enc.encode(strHeader));
  const b64Payload = base64url(enc.encode(strPayload));
  const signatureInput = `${b64Header}.${b64Payload}`;
  
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(signatureInput));
  const b64Signature = base64url(new Uint8Array(signature));
  
  return `${signatureInput}.${b64Signature}`;
}

export async function verifyCustomJwt(token: string, secret: string): Promise<any | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    
    const [b64Header, b64Payload, b64Signature] = parts;
    const headerStr = new TextDecoder().decode(base64urlDecode(b64Header));
    const header = JSON.parse(headerStr);
    
    if (header.typ !== "CUSTOM_JWT") return null;
    
    const enc = new TextEncoder();
    const signatureInput = `${b64Header}.${b64Payload}`;
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    
    const signatureBytes = base64urlDecode(b64Signature);
    const isValid = await crypto.subtle.verify("HMAC", key, signatureBytes, enc.encode(signatureInput));
    
    if (!isValid) return null;
    
    const payloadStr = new TextDecoder().decode(base64urlDecode(b64Payload));
    return JSON.parse(payloadStr);
  } catch (e) {
    return null;
  }
}
