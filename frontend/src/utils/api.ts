/**
 * API utility functions for making authenticated requests to the backend
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface FetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

/**
 * Make an authenticated API request
 * Automatically includes credentials and handles JSON
 */
export async function apiFetch(endpoint: string, options: FetchOptions = {}) {
  const { body, headers, ...restOptions } = options;

  const config: RequestInit = {
    ...restOptions,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body !== undefined) {
    config.body = JSON.stringify(body);
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
