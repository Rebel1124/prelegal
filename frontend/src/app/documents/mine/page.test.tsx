import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import MyDocumentsPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/documents/mine",
}));

beforeEach(() => {
  window.localStorage.setItem("prelegal_session", JSON.stringify({ token: "tok", email: "a@b.com" }));
});

afterEach(() => {
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

describe("MyDocumentsPage", () => {
  test("shows an empty state when there are no saved documents", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [] }));

    render(<MyDocumentsPage />);

    await waitFor(() => expect(screen.getByText(/haven't started any documents/)).toBeInTheDocument());
  });

  test("lists saved documents with links to resume them", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [
          {
            id: 7,
            slug: "mutual-nda",
            name: "Mutual Non-Disclosure Agreement",
            createdAt: "2026-01-01T00:00:00",
            updatedAt: "2026-01-02T00:00:00",
          },
        ],
      }),
    );

    render(<MyDocumentsPage />);

    const link = await screen.findByRole("link", { name: /Mutual Non-Disclosure Agreement/ });
    expect(link).toHaveAttribute("href", "/documents/mutual-nda?documentId=7");
  });

  test("shows an error message when loading fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    render(<MyDocumentsPage />);

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/Something went wrong/));
  });
});
