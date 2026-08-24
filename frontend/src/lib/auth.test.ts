import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { authFetch, getEmail, getToken, isLoggedIn, login, logout, signup } from "./auth";

describe("auth", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("isLoggedIn is false with no session", () => {
    expect(isLoggedIn()).toBe(false);
  });

  test("signup stores the returned token and email", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ token: "abc123", email: "new@example.com" }),
      }),
    );

    await signup("new@example.com", "password123");

    expect(isLoggedIn()).toBe(true);
    expect(getToken()).toBe("abc123");
    expect(getEmail()).toBe("new@example.com");
  });

  test("login stores the returned session", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ token: "xyz789", email: "user@example.com" }),
      }),
    );

    await login("user@example.com", "password123");

    expect(getToken()).toBe("xyz789");
  });

  test("login throws the server's error detail on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ detail: "Invalid email or password" }),
      }),
    );

    await expect(login("user@example.com", "wrong")).rejects.toThrow("Invalid email or password");
    expect(isLoggedIn()).toBe(false);
  });

  test("logout clears the session", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ token: "abc", email: "a@b.com" }) }),
    );
    await login("a@b.com", "password123");

    logout();

    expect(isLoggedIn()).toBe(false);
  });

  test("authFetch attaches the bearer token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ token: "tok-1", email: "a@b.com" }) }),
    );
    await login("a@b.com", "password123");

    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    await authFetch("/api/documents/mine");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/documents/mine",
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer tok-1" }) }),
    );
  });

  test("authFetch logs out on a 401 response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ token: "tok-1", email: "a@b.com" }) }),
    );
    await login("a@b.com", "password123");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));

    await authFetch("/api/documents/mine");

    expect(isLoggedIn()).toBe(false);
  });
});
