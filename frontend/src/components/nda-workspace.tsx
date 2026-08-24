"use client";

import { useMemo, useState } from "react";
import { CoverPageView } from "@/components/cover-page-view";
import { NdaChat } from "@/components/nda-chat";
import { NdaFieldsPanel } from "@/components/nda-fields-panel";
import { StandardTermsView } from "@/components/standard-terms-view";
import { createDefaultNdaFormData, missingRequiredFields, type NdaFormData } from "@/lib/nda-form";
import { downloadNdaPdf } from "@/lib/pdf/download";
import { type DocParagraph, fillFieldRuns } from "@/lib/standard-terms";

export function NdaWorkspace({ standardTerms }: { standardTerms: DocParagraph[] }) {
  const [formData, setFormData] = useState<NdaFormData>(createDefaultNdaFormData);
  const [isSending, setIsSending] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const filledStandardTerms = useMemo(
    () => fillFieldRuns(standardTerms, formData),
    [standardTerms, formData],
  );

  const missingFields = missingRequiredFields(formData);

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

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div className="space-y-6">
        <NdaChat
          formData={formData}
          onFormDataChange={setFormData}
          isSending={isSending}
          onSendingChange={setIsSending}
        />
        <NdaFieldsPanel formData={formData} onFormDataChange={setFormData} disabled={isSending} />
      </div>

      <div className="lg:sticky lg:top-8 lg:self-start">
        <div className="mb-4 flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={handleDownload}
            disabled={isGeneratingPdf || missingFields.length > 0}
            title={missingFields.length > 0 ? `Missing: ${missingFields.join(", ")}` : undefined}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGeneratingPdf ? "Generating…" : "Download PDF"}
          </button>
          {missingFields.length > 0 && (
            <p className="text-xs text-gray-500">Still need: {missingFields.join(", ")}</p>
          )}
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
