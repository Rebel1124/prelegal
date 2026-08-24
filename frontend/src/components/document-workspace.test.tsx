import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { DocumentWorkspace } from "./document-workspace";
import type { DocumentTypeConfig } from "@/lib/document-types";

const { useSearchParamsMock } = vi.hoisted(() => ({
  useSearchParamsMock: vi.fn(() => new URLSearchParams()),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/documents/mutual-nda",
  useSearchParams: useSearchParamsMock,
}));

const config: DocumentTypeConfig = {
  slug: "mutual-nda",
  name: "Mutual Non-Disclosure Agreement",
  description: "Test fixture",
  parties: [
    { key: "partyA", roleLabel: "Party A" },
    { key: "partyB", roleLabel: "Party B" },
  ],
  fields: [
    { key: "effectiveDate", label: "Effective Date" },
    { key: "purpose", label: "Purpose", textarea: true },
  ],
};

beforeEach(() => {
  useSearchParamsMock.mockReturnValue(new URLSearchParams());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DocumentWorkspace", () => {
  test("disables download until required fields are filled, then enables it", () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));

    render(<DocumentWorkspace config={config} standardTerms={[]} />);

    const downloadButton = screen.getByRole("button", { name: /Download PDF/ });
    expect(downloadButton).toBeDisabled();
    expect(screen.getByText(/Still need:/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Effective date"), {
      target: { value: "2026-03-01" },
    });
    fireEvent.change(screen.getAllByLabelText("Legal name")[0], {
      target: { value: "Acme, Inc." },
    });
    fireEvent.change(screen.getAllByLabelText("Legal name")[1], {
      target: { value: "Globex Corp." },
    });

    expect(downloadButton).toBeEnabled();
    expect(screen.queryByText(/Still need:/)).not.toBeInTheDocument();
  });

  test("resumes a saved document from the documentId query param, and doesn't refetch after a chat reply", async () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams("documentId=7"));

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: 7,
        slug: "mutual-nda",
        name: "Mutual Non-Disclosure Agreement",
        fields: {
          effectiveDate: "2026-03-01",
          purpose: "",
          partyA: { legalName: "Acme, Inc.", noticeAddress: "", signatoryName: "", signatoryTitle: "" },
          partyB: { legalName: "", noticeAddress: "", signatoryName: "", signatoryTitle: "" },
        },
        messages: [
          { role: "assistant", content: "Hi! Who are the parties?" },
          { role: "user", content: "Party A is Acme, Inc." },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<DocumentWorkspace config={config} standardTerms={[]} />);

    expect(screen.getByText(/Loading your document/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Party A is Acme, Inc.")).toBeInTheDocument());
    expect(screen.getByDisplayValue("Acme, Inc.")).toBeInTheDocument();

    // Only the initial GET to load the saved document should have happened — no extra
    // background refetch once the resumed documentId is reflected back into the URL.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/documents/7", expect.anything());
  });
});
