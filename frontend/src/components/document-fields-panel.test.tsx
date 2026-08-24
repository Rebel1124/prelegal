import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { DocumentFieldsPanel } from "./document-fields-panel";
import { createDefaultFormData, type DocumentTypeConfig } from "@/lib/document-types";

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

describe("DocumentFieldsPanel", () => {
  test("editing a field calls onDataChange with the updated data", () => {
    const data = createDefaultFormData(config);
    const onDataChange = vi.fn();

    render(<DocumentFieldsPanel config={config} data={data} onDataChange={onDataChange} />);

    fireEvent.change(screen.getAllByLabelText("Legal name")[0], {
      target: { value: "Acme, Inc." },
    });

    expect(onDataChange).toHaveBeenCalledWith({
      ...data,
      partyA: { ...(data.partyA as object), legalName: "Acme, Inc." },
    });
  });

  test("renders one fieldset per configured party, labeled by role", () => {
    render(
      <DocumentFieldsPanel config={config} data={createDefaultFormData(config)} onDataChange={vi.fn()} />,
    );

    expect(screen.getByText("Party A")).toBeInTheDocument();
    expect(screen.getByText("Party B")).toBeInTheDocument();
  });

  test("disables all fields while disabled is true", () => {
    render(
      <DocumentFieldsPanel
        config={config}
        data={createDefaultFormData(config)}
        onDataChange={vi.fn()}
        disabled
      />,
    );

    expect(screen.getAllByLabelText("Legal name")[0]).toBeDisabled();
    expect(screen.getByLabelText("Effective date")).toBeDisabled();
  });
});
