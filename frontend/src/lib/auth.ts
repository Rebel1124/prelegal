const SESSION_KEY = "prelegal_fake_session";

export function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SESSION_KEY) === "1";
}

export function login(): void {
  window.localStorage.setItem(SESSION_KEY, "1");
}

export function logout(): void {
  window.localStorage.removeItem(SESSION_KEY);
}
