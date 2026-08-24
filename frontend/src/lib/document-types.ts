export interface PartyRoleSpec {
  key: string;
  roleLabel: string;
}

export interface FieldSpec {
  key: string;
  label: string;
  aliases?: string[];
  textarea?: boolean;
}

export interface DocumentTypeConfig {
  slug: string;
  name: string;
  description: string;
  parties: [PartyRoleSpec, PartyRoleSpec];
  fields: FieldSpec[];
}

export interface PartyInfo {
  legalName: string;
  noticeAddress: string;
  signatoryName: string;
  signatoryTitle: string;
}

/** Keyed by field key (string values) and party key (PartyInfo values), matching the chat API's wire shape. */
export type DocumentFormData = Record<string, string | PartyInfo>;

function createEmptyParty(): PartyInfo {
  return { legalName: "", noticeAddress: "", signatoryName: "", signatoryTitle: "" };
}

export function createDefaultFormData(config: DocumentTypeConfig): DocumentFormData {
  const data: DocumentFormData = {};
  for (const field of config.fields) data[field.key] = "";
  for (const party of config.parties) data[party.key] = createEmptyParty();
  return data;
}

export function getFieldValue(data: DocumentFormData, key: string): string {
  return (data[key] as string | undefined) ?? "";
}

export function getPartyValue(data: DocumentFormData, key: string): PartyInfo {
  return (data[key] as PartyInfo | undefined) ?? createEmptyParty();
}

export function displayValue(value: string, placeholder: string): string {
  return value.trim().length > 0 ? value : placeholder;
}

export function formatEffectiveDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "";
  // Construct in UTC so a date-only string doesn't shift a day when formatted in a
  // timezone behind UTC.
  const date = new Date(Date.UTC(year, month - 1, day));
  // Date.UTC silently rolls over out-of-range components (e.g. day 30 in February), so
  // confirm the constructed date still matches what was entered before formatting it.
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return "";
  }
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(date);
}

/** The fields required before a document can be downloaded: effective date plus every party's legal name. */
export function missingRequiredFields(config: DocumentTypeConfig, data: DocumentFormData): string[] {
  const missing: string[] = [];
  if (!getFieldValue(data, "effectiveDate").trim()) missing.push("Effective date");
  for (const party of config.parties) {
    if (!getPartyValue(data, party.key).legalName.trim()) missing.push(`${party.roleLabel} legal name`);
  }
  return missing;
}

/** Shared cover-page derivation used by both the HTML preview and the PDF renderer. */
export function getCoverPageFields(config: DocumentTypeConfig, data: DocumentFormData) {
  const [partyA, partyB] = config.parties;
  return {
    effectiveDate: formatEffectiveDate(getFieldValue(data, "effectiveDate")),
    partyA,
    partyB,
    detailFields: config.fields.filter((field) => field.key !== "effectiveDate"),
  };
}
