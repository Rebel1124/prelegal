import type { Metadata } from "next";
import { DocumentWorkspace } from "@/components/document-workspace";
import { RequireAuth } from "@/components/require-auth";
import { listDocumentTypeSlugs, loadDocumentTypeConfig, loadTemplateMarkdown } from "@/lib/document-types-server";
import { parseStandardTerms } from "@/lib/standard-terms";

export function generateStaticParams() {
  return listDocumentTypeSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const config = loadDocumentTypeConfig(slug);
  return {
    title: `${config.name} — Draft`,
    description: `Chat with an AI assistant to generate and download a ${config.name}.`,
  };
}

export default async function DocumentTypePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const config = loadDocumentTypeConfig(slug);
  const raw = loadTemplateMarkdown(slug);
  const standardTerms = parseStandardTerms(raw, config);

  return (
    <RequireAuth>
      <main className="min-h-screen bg-gray-50 py-10">
        <div className="mx-auto max-w-6xl px-4">
          <header className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-900">{config.name} Creator</h1>
            <p className="mt-1 text-sm text-gray-600">
              Chat with the assistant to fill in the document, preview it, and download a PDF copy.
            </p>
          </header>
          <DocumentWorkspace config={config} standardTerms={standardTerms} />
        </div>
      </main>
    </RequireAuth>
  );
}
