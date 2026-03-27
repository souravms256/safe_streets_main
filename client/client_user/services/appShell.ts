"use client";

export const AUTH_CHANGE_EVENT = "safe-streets-auth-change";

export const APP_ROUTES = [
  "/dashboard",
  "/map",
  "/report",
  "/pending",
  "/profile",
  "/notifications",
  "/leaderboard",
] as const;

export function getAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem("access_token");
}

export function isLoggedInClient(): boolean {
  return !!getAccessToken();
}

export function emitAuthChange() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}
