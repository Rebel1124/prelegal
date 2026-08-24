import Link from "next/link";
import type { Metadata } from "next";
import { DocumentSuggestBox } from "@/components/document-suggest-box";
import { RequireAuth } from "@/components/require-auth";
import { loadCatalog } from "@/lib/document-types-server";

export const metadata: Metadata = {
  title: "Draft a document",
  description: "Choose a legal document type to draft with the AI assistant.",
};

export default function DocumentsPage() {
  const catalog = loadCatalog();

  return (
    <RequireAuth>
      <main className="min-h-screen bg-gray-50 py-10">
        <div className="mx-auto max-w-4xl px-4">
          <header className="mb-8">
            <h1 className="text-2xl font-semibold text-brand-navy">What do you need to draft?</h1>
            <p className="mt-1 text-sm text-brand-gray">
              Pick a document type below and an AI assistant will chat with you to fill it in.
            </p>
          </header>

          <div className="mb-8">
            <DocumentSuggestBox />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {catalog.map((entry) => (
              <Link
                key={entry.slug}
                href={`/documents/${entry.slug}`}
                className="block rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:border-brand-blue hover:shadow-md"
              >
                <h2 className="text-sm font-semibold text-brand-navy">{entry.name}</h2>
                <p className="mt-1 text-sm text-brand-gray">{entry.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </RequireAuth>
  );
}
