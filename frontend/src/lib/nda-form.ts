export interface PartyInfo {
  legalName: string;
  noticeAddress: string;
  signatoryName: string;
  signatoryTitle: string;
}

export type PartyKey = "partyA" | "partyB";

export interface NdaFormData {
  effectiveDate: string;
  purpose: string;
  mndaTerm: string;
  confidentialityTerm: string;
  governingLaw: string;
  jurisdiction: string;
  partyA: PartyInfo;
  partyB: PartyInfo;
}

// Matches the coverpage_link labels used in src/content/mutual-nda-standard-terms.md.
export type CoverPageFieldLabel =
  | "Purpose"
  | "Effective Date"
  | "MNDA Term"
  | "Term of Confidentiality"
  | "Governing Law"
  | "Jurisdiction";

function createEmptyParty(): PartyInfo {
  return { legalName: "", noticeAddress: "", signatoryName: "", signatoryTitle: "" };
}

export function createDefaultNdaFormData(): NdaFormData {
  return {
    effectiveDate: "",
    purpose: "",
    mndaTerm: "",
    confidentialityTerm: "",
    governingLaw: "",
    jurisdiction: "",
    partyA: createEmptyParty(),
    partyB: createEmptyParty(),
  };
}

export function formatEffectiveDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "";
  // Construct in UTC so a date-only string doesn't shift a day when formatted in a
  // timezone behind UTC.
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(date);
}

export function resolveFieldValue(label: CoverPageFieldLabel, data: NdaFormData): string {
  switch (label) {
    case "Purpose":
      return data.purpose.trim();
    case "Effective Date":
      return formatEffectiveDate(data.effectiveDate);
    case "MNDA Term":
      return data.mndaTerm.trim();
    case "Term of Confidentiality":
      return data.confidentialityTerm.trim();
    case "Governing Law":
      return data.governingLaw.trim();
    case "Jurisdiction":
      return data.jurisdiction.trim();
  }
}
