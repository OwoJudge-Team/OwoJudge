/**
 * API utility functions for making authenticated requests to the backend
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface FetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

/**
 * Make an authenticated API request.
 * Default: Assumes multipart/form-data (no header set, no JSON stringify).
 * Explicit: If Content-Type is application/json, it stringifies the body.
 */
export async function apiFetch(endpoint: string, options: FetchOptions = {}) {
  const { body, headers, ...restOptions } = options;

  const incomingHeaders = (headers as Record<string, string>) || {};
  
  const isJson = incomingHeaders["Content-Type"] === "application/json";

  const config: RequestInit = {
    ...restOptions,
    credentials: "include",
    headers: headers,
  };

  if (body !== undefined) {
    config.body = isJson ? JSON.stringify(body) : (body as any);
  }

  const url = `${API_URL}${endpoint}`;
  return fetch(url, config);
}

/**
 * GET request
 */
export async function apiGet(
  endpoint: string,
  options: Omit<FetchOptions, "method" | "body"> = {}
) {
  return apiFetch(endpoint, { ...options, method: "GET" });
}

/**
 * POST request
 */
export async function apiPost(
  endpoint: string,
  body?: unknown,
  options: Omit<FetchOptions, "method" | "body"> = {}
) {
  return apiFetch(endpoint, { ...options, method: "POST", body });
}

/**
 * PUT request
 */
export async function apiPut(
  endpoint: string,
  body?: unknown,
  options: Omit<FetchOptions, "method" | "body"> = {}
) {
  return apiFetch(endpoint, { ...options, method: "PUT", body });
}

/**
 * DELETE request
 */
export async function apiDelete(
  endpoint: string,
  options: Omit<FetchOptions, "method" | "body"> = {}
) {
  return apiFetch(endpoint, { ...options, method: "DELETE" });
}

/**
 * Auth-specific API calls
 */
export const authApi = {
  login: (username: string, password: string) => apiPost("/api/auth", { username, password }),

  logout: () => apiPost("/api/auth/logout"),

  getStatus: () => apiGet("/api/auth/status"),
};
