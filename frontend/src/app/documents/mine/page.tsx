"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/require-auth";
import { type SavedDocumentSummary, fetchMyDocuments } from "@/lib/documents-store";

export default function MyDocumentsPage() {
  const [documents, setDocuments] = useState<SavedDocumentSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyDocuments()
      .then(setDocuments)
      .catch((err) => {
        console.error("Failed to load saved documents", err);
        setError("Something went wrong loading your documents. Please try again.");
      });
  }, []);

  return (
    <RequireAuth>
      <main className="min-h-screen bg-gray-50 py-10">
        <div className="mx-auto max-w-4xl px-4">
          <header className="mb-8">
            <h1 className="text-2xl font-semibold text-brand-navy">My documents</h1>
            <p className="mt-1 text-sm text-brand-gray">
              Documents you&apos;ve started drafting. Pick one up where you left off.
            </p>
          </header>

          {error && (
            <p className="mb-4 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          {documents === null && !error && <p className="text-sm text-brand-gray">Loading…</p>}

          {documents && documents.length === 0 && (
            <p className="text-sm text-brand-gray">
              You haven&apos;t started any documents yet.{" "}
              <Link href="/documents" className="font-medium text-brand-blue underline">
                Browse document types
              </Link>
              .
            </p>
          )}

          {documents && documents.length > 0 && (
            <ul className="space-y-3">
              {documents.map((doc) => (
                <li key={doc.id}>
                  <Link
                    href={`/documents/${doc.slug}?documentId=${doc.id}`}
                    className="block rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:border-brand-blue hover:shadow-md"
                  >
                    <h2 className="text-sm font-semibold text-brand-navy">{doc.name}</h2>
                    <p className="mt-1 text-xs text-brand-gray">
                      Last updated {new Date(doc.updatedAt).toLocaleString()}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </RequireAuth>
  );
}
