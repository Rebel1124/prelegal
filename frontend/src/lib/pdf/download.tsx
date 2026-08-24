"use client";

import { pdf } from "@react-pdf/renderer";
import type { NdaFormData } from "../nda-form";
import type { DocParagraph } from "../standard-terms";
import { NdaPdfDocument } from "./nda-pdf-document";

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildFileName(formData: NdaFormData): string {
  const partyA = slugify(formData.partyA.legalName);
  const partyB = slugify(formData.partyB.legalName);
  return partyA && partyB ? `mutual-nda-${partyA}-${partyB}.pdf` : "mutual-nda.pdf";
}

export async function downloadNdaPdf(
  formData: NdaFormData,
  standardTerms: DocParagraph[],
): Promise<void> {
  const blob = await pdf(
    <NdaPdfDocument formData={formData} standardTerms={standardTerms} />,
  ).toBlob();

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = buildFileName(formData);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
