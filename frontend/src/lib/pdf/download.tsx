"use client";

import { pdf } from "@react-pdf/renderer";
import { type DocumentFormData, type DocumentTypeConfig, getPartyValue } from "../document-types";
import type { DocParagraph } from "../standard-terms";
import { DocumentPdfDocument } from "./document-pdf-document";

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildFileName(config: DocumentTypeConfig, data: DocumentFormData): string {
  const partyNames = config.parties
    .map((party) => slugify(getPartyValue(data, party.key).legalName))
    .filter(Boolean);
  return partyNames.length === config.parties.length
    ? `${config.slug}-${partyNames.join("-")}.pdf`
    : `${config.slug}.pdf`;
}

export async function downloadDocumentPdf(
  config: DocumentTypeConfig,
  data: DocumentFormData,
  standardTerms: DocParagraph[],
): Promise<void> {
  const blob = await pdf(
    <DocumentPdfDocument config={config} data={data} standardTerms={standardTerms} />,
  ).toBlob();

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = buildFileName(config, data);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
