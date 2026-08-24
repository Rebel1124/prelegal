const SESSION_KEY = "prelegal_session";

interface Session {
  token: string;
  email: string;
}

function readSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return readSession() !== null;
}

export function getToken(): string | null {
  return readSession()?.token ?? null;
}

export function getEmail(): string | null {
  return readSession()?.email ?? null;
}

async function authenticate(path: string, email: string, password: string): Promise<void> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? `Request failed with status ${response.status}`);
  }

  const session: Session = await response.json();
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function signup(email: string, password: string): Promise<void> {
  return authenticate("/api/auth/signup", email, password);
}

export function login(email: string, password: string): Promise<void> {
  return authenticate("/api/auth/login", email, password);
}

export function logout(): void {
  window.localStorage.removeItem(SESSION_KEY);
}

/** fetch wrapper that attaches the session's bearer token and sends the user back to sign in on a 401. */
export async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      Authorization: `Bearer ${getToken()}`,
    },
  });

  if (response.status === 401) {
    logout();
    window.location.href = "/";
  }

  return response;
}
