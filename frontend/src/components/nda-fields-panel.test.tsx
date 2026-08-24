import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { NdaFieldsPanel } from "./nda-fields-panel";
import { createDefaultNdaFormData } from "@/lib/nda-form";

describe("NdaFieldsPanel", () => {
  test("editing a field calls onFormDataChange with the updated data", () => {
    const formData = createDefaultNdaFormData();
    const onFormDataChange = vi.fn();

    render(<NdaFieldsPanel formData={formData} onFormDataChange={onFormDataChange} />);

    fireEvent.change(screen.getAllByLabelText("Legal name")[0], {
      target: { value: "Acme, Inc." },
    });

    expect(onFormDataChange).toHaveBeenCalledWith({
      ...formData,
      partyA: { ...formData.partyA, legalName: "Acme, Inc." },
    });
  });

  test("disables all fields while disabled is true", () => {
    render(
      <NdaFieldsPanel formData={createDefaultNdaFormData()} onFormDataChange={vi.fn()} disabled />,
    );

    expect(screen.getAllByLabelText("Legal name")[0]).toBeDisabled();
    expect(screen.getByLabelText("Effective date")).toBeDisabled();
  });
});
