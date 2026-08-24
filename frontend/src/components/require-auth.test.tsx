import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { RequireAuth } from "./require-auth";

const replaceMock = vi.fn();
const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: pushMock }),
  usePathname: () => "/documents",
}));

describe("RequireAuth", () => {
  beforeEach(() => {
    window.localStorage.clear();
    replaceMock.mockClear();
    pushMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("redirects to / when there is no session", () => {
    render(
      <RequireAuth>
        <p>Protected content</p>
      </RequireAuth>,
    );

    expect(replaceMock).toHaveBeenCalledWith("/");
  });

  test("renders children and the signed-in user's email when a session exists", () => {
    window.localStorage.setItem("prelegal_session", JSON.stringify({ token: "tok", email: "a@b.com" }));

    render(
      <RequireAuth>
        <p>Protected content</p>
      </RequireAuth>,
    );

    expect(replaceMock).not.toHaveBeenCalled();
    expect(screen.getByText("Protected content")).toBeInTheDocument();
    expect(screen.getByText("a@b.com")).toBeInTheDocument();
  });
});
