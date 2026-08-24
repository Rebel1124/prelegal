"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { CoverPageView } from "@/components/cover-page-view";
import { DocumentChat } from "@/components/document-chat";
import { DocumentFieldsPanel } from "@/components/document-fields-panel";
import { StandardTermsView } from "@/components/standard-terms-view";
import type { ChatMessage } from "@/lib/document-chat";
import {
  type DocumentFormData,
  type DocumentTypeConfig,
  createDefaultFormData,
  missingRequiredFields,
} from "@/lib/document-types";
import { fetchDocument } from "@/lib/documents-store";
import { downloadDocumentPdf } from "@/lib/pdf/download";
import { type DocParagraph, fillFieldRuns } from "@/lib/standard-terms";

export function DocumentWorkspace(props: { config: DocumentTypeConfig; standardTerms: DocParagraph[] }) {
  return (
    <Suspense fallback={<p className="text-sm text-brand-gray">Loading your document…</p>}>
      <DocumentWorkspaceInner {...props} />
    </Suspense>
  );
}

function DocumentWorkspaceInner({
  config,
  standardTerms,
}: {
  config: DocumentTypeConfig;
  standardTerms: DocParagraph[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Captured once on mount: the URL's documentId is only meant to trigger a one-time resume
  // load, not to be re-fetched every time it changes (which happens right after we write a
  // freshly-created document's id back into the URL below).
  const [resumeId] = useState(() => searchParams.get("documentId"));
  const [documentId, setDocumentId] = useState<number | null>(resumeId ? Number(resumeId) : null);
  const [data, setData] = useState<DocumentFormData>(() => createDefaultFormData(config));
  const [initialMessages, setInitialMessages] = useState<ChatMessage[] | undefined>(undefined);
  const [isLoadingSaved, setIsLoadingSaved] = useState(Boolean(resumeId));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    if (!resumeId) return;
    let cancelled = false;

    fetchDocument(Number(resumeId))
      .then((detail) => {
        if (cancelled) return;
        setData(detail.fields);
        setInitialMessages(detail.messages);
      })
      .catch((error) => {
        console.error("Failed to load saved document", error);
        if (!cancelled) setLoadError("Couldn't load that saved document. Starting a new one instead.");
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSaved(false);
      });

    return () => {
      cancelled = true;
    };
  }, [resumeId]);

  function handleDocumentIdChange(id: number) {
    setDocumentId(id);
    if (searchParams.get("documentId") !== String(id)) {
      router.replace(`${pathname}?documentId=${id}`, { scroll: false });
    }
  }

  const filledStandardTerms = useMemo(
    () => fillFieldRuns(standardTerms, data),
    [standardTerms, data],
  );

  const missingFields = missingRequiredFields(config, data);

  async function handleDownload() {
    setIsGeneratingPdf(true);
    setDownloadError(null);
    try {
      await downloadDocumentPdf(config, data, filledStandardTerms);
    } catch (error) {
      console.error("Failed to generate document PDF", error);
      setDownloadError("Something went wrong generating the PDF. Please try again.");
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  if (isLoadingSaved) {
    return <p className="text-sm text-brand-gray">Loading your document…</p>;
  }

  return (
    <div>
      {loadError && (
        <p className="mb-4 text-sm text-red-600" role="alert">
          {loadError}
        </p>
      )}
      <p className="mb-6 rounded-md border border-accent-yellow/40 bg-accent-yellow/10 px-4 py-2 text-xs text-brand-navy">
        This document is a draft generated to help you get started. It has not been reviewed by an
        attorney and should not be relied on as legal advice — have it reviewed by a qualified lawyer
        before use.
      </p>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <DocumentChat
            config={config}
            data={data}
            onDataChange={setData}
            isSending={isSending}
            onSendingChange={setIsSending}
            documentId={documentId}
            onDocumentIdChange={handleDocumentIdChange}
            initialMessages={initialMessages}
          />
          <DocumentFieldsPanel config={config} data={data} onDataChange={setData} disabled={isSending} />
        </div>

        <div className="lg:sticky lg:top-8 lg:self-start">
          <div className="mb-4 flex flex-col items-end gap-1">
            <button
              type="button"
              onClick={handleDownload}
              disabled={isGeneratingPdf || missingFields.length > 0}
              title={missingFields.length > 0 ? `Missing: ${missingFields.join(", ")}` : undefined}
              className="rounded-md bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGeneratingPdf ? "Generating…" : "Download PDF"}
            </button>
            {missingFields.length > 0 && (
              <p className="text-xs text-brand-gray">Still need: {missingFields.join(", ")}</p>
            )}
          </div>
          {downloadError && (
            <p className="mb-4 text-sm text-red-600" role="alert">
              {downloadError}
            </p>
          )}
          <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
            <CoverPageView config={config} data={data} />
            <hr className="my-8 border-gray-200" />
            <StandardTermsView paragraphs={filledStandardTerms} />
          </div>
        </div>
      </div>
    </div>
  );
}
