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

  const response = await fetch(path, {
    method: options.method ?? "GET",
    headers,
    body,
    credentials: "include"
  });

  const payload = (await response.json().catch(() => null)) as ApiResponse<TData> | null;

  if (!response.ok) {
    const message = payload?.message ?? `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  if (!payload) {
    throw new Error("Empty response from server.");
  }

  return payload;
}
