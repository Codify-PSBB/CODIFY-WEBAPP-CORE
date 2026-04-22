import { resolveAuthToken } from "./auth";

export interface ApiResponse<TData> {
  status: "success" | "error";
  data?: TData;
  message?: string;
}

interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").trim().replace(/\/+$/, "");

function buildApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return API_BASE_URL ? `${API_BASE_URL}${normalizedPath}` : normalizedPath;
}

function trimServerText(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 200);
}

export async function apiRequest<TData>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<TData>> {
  const headers = new Headers();
  const token = await resolveAuthToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let body: string | undefined;
  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.body);
  }

  const requestUrl = buildApiUrl(path);

  let response: Response;
  try {
    response = await fetch(requestUrl, {
      method: options.method ?? "GET",
      headers,
      body,
      credentials: API_BASE_URL ? "omit" : "include"
    });
  } catch {
    const modeHint = API_BASE_URL
      ? `Unable to reach API server at ${API_BASE_URL}.`
      : "Unable to reach /api. Ensure the Worker is running or API routing is configured.";

    throw new Error(`${modeHint} Check VITE_API_BASE_URL and network connectivity.`);
  }

  const contentType = response.headers.get("Content-Type") ?? "";
  const isJson = contentType.toLowerCase().includes("application/json");

  const payload = isJson
    ? ((await response.json().catch(() => null)) as ApiResponse<TData> | null)
    : null;

  const rawText = isJson ? "" : await response.text().catch(() => "");

  if (!response.ok) {
    const message =
      payload?.message ??
      (rawText ? `${trimServerText(rawText)} (status ${response.status})` : `Request failed with status ${response.status} for ${requestUrl}`);

    // Include status code in error for better handling
    const error = new Error(message);
    (error as any).status = response.status;
    throw error;
  }

  if (!payload) {
    const hint = API_BASE_URL
      ? "Empty or non-JSON response from API server."
      : "Empty or non-JSON response from /api. Ensure /api is proxied/routed to the Worker (Vite proxy or deployment routing), or set VITE_API_BASE_URL at build time.";

    throw new Error(hint);
  }

  return payload;
}
