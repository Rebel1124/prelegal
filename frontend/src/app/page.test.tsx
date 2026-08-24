import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import LoginPage from "./page";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

function fillAndSubmit(email: string, password: string) {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: /^(Sign in|Create account)$/ }));
}

describe("LoginPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    pushMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("signs in and redirects to /documents on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ token: "tok", email: "a@b.com" }) }),
    );

    render(<LoginPage />);
    fillAndSubmit("a@b.com", "password123");

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/documents"));
  });

  test("shows the server's error message on failed sign in", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ detail: "Invalid email or password" }),
      }),
    );

    render(<LoginPage />);
    fillAndSubmit("a@b.com", "wrong-password");

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Invalid email or password"));
    expect(pushMock).not.toHaveBeenCalled();
  });

  test("toggling to sign up calls the signup endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: "tok", email: "new@example.com" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<LoginPage />);
    fireEvent.click(screen.getByRole("button", { name: /Need an account/ }));
    fillAndSubmit("new@example.com", "password123");

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/documents"));
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/signup", expect.objectContaining({ method: "POST" }));
  });
});
