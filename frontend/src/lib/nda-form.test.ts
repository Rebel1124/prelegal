import { describe, expect, test } from "vitest";
import { createDefaultNdaFormData, missingRequiredFields } from "./nda-form";

describe("missingRequiredFields", () => {
  test("lists all required fields when nothing is filled", () => {
    expect(missingRequiredFields(createDefaultNdaFormData())).toEqual([
      "Effective date",
      "Party A legal name",
      "Party B legal name",
    ]);
  });

  test("lists only the remaining required fields", () => {
    const data = createDefaultNdaFormData();
    data.effectiveDate = "2026-03-01";
    data.partyA.legalName = "Acme, Inc.";

    expect(missingRequiredFields(data)).toEqual(["Party B legal name"]);
  });

  test("is empty once all required fields are filled", () => {
    const data = createDefaultNdaFormData();
    data.effectiveDate = "2026-03-01";
    data.partyA.legalName = "Acme, Inc.";
    data.partyB.legalName = "Globex Corp.";

    expect(missingRequiredFields(data)).toEqual([]);
  });

  test("treats whitespace-only values as missing", () => {
    const data = createDefaultNdaFormData();
    data.effectiveDate = "2026-03-01";
    data.partyA.legalName = "   ";
    data.partyB.legalName = "Globex Corp.";

    expect(missingRequiredFields(data)).toEqual(["Party A legal name"]);
  });
});
