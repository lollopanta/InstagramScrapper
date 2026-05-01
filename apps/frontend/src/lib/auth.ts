import type { AuthResponse } from "./api";

const tokenKey = "datareach_token";
const userKey = "datareach_user";
const workspaceKey = "datareach_workspace";

export function persistAuth(auth: AuthResponse) {
  localStorage.setItem(tokenKey, auth.token);
  localStorage.setItem(userKey, JSON.stringify(auth.user));
  localStorage.setItem(workspaceKey, JSON.stringify(auth.workspace));
}

export function clearAuth() {
  localStorage.removeItem(tokenKey);
  localStorage.removeItem(userKey);
  localStorage.removeItem(workspaceKey);
}

export function getToken() {
  return localStorage.getItem(tokenKey);
}

export function getStoredUser(): AuthResponse["user"] | null {
  const raw = localStorage.getItem(userKey);
  return raw ? (JSON.parse(raw) as AuthResponse["user"]) : null;
}

export function getStoredWorkspace(): AuthResponse["workspace"] | null {
  const raw = localStorage.getItem(workspaceKey);
  return raw ? (JSON.parse(raw) as AuthResponse["workspace"]) : null;
}
