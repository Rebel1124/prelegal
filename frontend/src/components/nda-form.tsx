"use client";

import { type FormEvent, useMemo, useState } from "react";
import { CoverPageView } from "@/components/cover-page-view";
import { TextAreaField, TextField } from "@/components/form-fields";
import { StandardTermsView } from "@/components/standard-terms-view";
import { createDefaultNdaFormData, type NdaFormData, type PartyInfo, type PartyKey } from "@/lib/nda-form";
import { downloadNdaPdf } from "@/lib/pdf/download";
import { type DocParagraph, fillFieldRuns } from "@/lib/standard-terms";

function PartyFieldset({
  title,
  party,
  onChange,
}: {
  title: string;
  party: PartyInfo;
  onChange: (key: keyof PartyInfo, value: string) => void;
}) {
  return (
    <fieldset className="space-y-4 rounded-lg border border-gray-200 p-4">
      <legend className="px-1 text-sm font-semibold text-gray-900">{title}</legend>
      <TextField
        label="Legal name"
        value={party.legalName}
        onChange={(value) => onChange("legalName", value)}
        placeholder="Acme, Inc."
        required
      />
      <TextAreaField
        label="Notice address"
        value={party.noticeAddress}
        onChange={(value) => onChange("noticeAddress", value)}
        rows={2}
        placeholder="123 Main St, San Francisco, CA 94105"
      />
      <TextField
        label="Signatory name"
        value={party.signatoryName}
        onChange={(value) => onChange("signatoryName", value)}
        placeholder="Jane Doe"
      />
      <TextField
        label="Signatory title"
        value={party.signatoryTitle}
        onChange={(value) => onChange("signatoryTitle", value)}
        placeholder="CEO"
      />
    </fieldset>
  );
}

export function NdaForm({ standardTerms }: { standardTerms: DocParagraph[] }) {
  const [formData, setFormData] = useState<NdaFormData>(createDefaultNdaFormData);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const filledStandardTerms = useMemo(
    () => fillFieldRuns(standardTerms, formData),
    [standardTerms, formData],
  );

  function updateField<K extends keyof NdaFormData>(key: K, value: NdaFormData[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  function updateParty(party: PartyKey, key: keyof PartyInfo, value: string) {
    setFormData((prev) => ({ ...prev, [party]: { ...prev[party], [key]: value } }));
  }

  async function handleDownload() {
    setIsGeneratingPdf(true);
    setDownloadError(null);
    try {
      await downloadNdaPdf(formData, filledStandardTerms);
    } catch (error) {
      console.error("Failed to generate NDA PDF", error);
      setDownloadError("Something went wrong generating the PDF. Please try again.");
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await handleDownload();
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <form id="nda-form" className="space-y-6" onSubmit={handleSubmit}>
        <PartyFieldset
          title="Party A"
          party={formData.partyA}
          onChange={(key, value) => updateParty("partyA", key, value)}
        />
        <PartyFieldset
          title="Party B"
          party={formData.partyB}
          onChange={(key, value) => updateParty("partyB", key, value)}
        />

        <fieldset className="space-y-4 rounded-lg border border-gray-200 p-4">
          <legend className="px-1 text-sm font-semibold text-gray-900">Deal terms</legend>
          <TextField
            label="Effective date"
            type="date"
            value={formData.effectiveDate}
            onChange={(value) => updateField("effectiveDate", value)}
            required
          />
          <TextAreaField
            label="Purpose"
            value={formData.purpose}
            onChange={(value) => updateField("purpose", value)}
            placeholder="Evaluating a potential business relationship between the parties"
          />
          <TextField
            label="MNDA term"
            value={formData.mndaTerm}
            onChange={(value) => updateField("mndaTerm", value)}
            placeholder="1 year from the Effective Date"
          />
          <TextField
            label="Term of confidentiality"
            value={formData.confidentialityTerm}
            onChange={(value) => updateField("confidentialityTerm", value)}
            placeholder="3 years after the disclosure of the Confidential Information"
          />
          <TextField
            label="Governing law"
            value={formData.governingLaw}
            onChange={(value) => updateField("governingLaw", value)}
            placeholder="Delaware"
          />
          <TextField
            label="Jurisdiction"
            value={formData.jurisdiction}
            onChange={(value) => updateField("jurisdiction", value)}
            placeholder="Wilmington, Delaware"
          />
        </fieldset>
      </form>

      <div className="lg:sticky lg:top-8 lg:self-start">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-700">Live preview</h2>
          <button
            type="submit"
            form="nda-form"
            disabled={isGeneratingPdf}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGeneratingPdf ? "Generating…" : "Download PDF"}
          </button>
        </div>
        {downloadError && (
          <p className="mb-4 text-sm text-red-600" role="alert">
            {downloadError}
          </p>
        )}
        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
          <CoverPageView formData={formData} />
          <hr className="my-8 border-gray-200" />
          <StandardTermsView paragraphs={filledStandardTerms} />
        </div>
      </div>
    </div>
  );
}
