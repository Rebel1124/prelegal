import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { DocumentWorkspace } from "./document-workspace";
import type { DocumentTypeConfig } from "@/lib/document-types";

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

vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));

describe("DocumentWorkspace", () => {
  test("disables download until required fields are filled, then enables it", () => {
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
});
