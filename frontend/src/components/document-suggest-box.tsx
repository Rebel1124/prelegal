"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { suggestDocumentType } from "@/lib/document-suggest";

export function DocumentSuggestBox() {
  const [description, setDescription] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{ matchedSlug: string | null; reply: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = description.trim();
    if (!content || isSending) return;

    setIsSending(true);
    setError(null);
    setResult(null);

    try {
      const suggestion = await suggestDocumentType(content);
      setResult(suggestion);
    } catch (err) {
      console.error("Document suggestion request failed", err);
      setError("Something went wrong finding a match. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-900">Not sure which one you need?</h2>
      <p className="mt-1 text-sm text-gray-600">
        Describe what you&apos;re trying to do and we&apos;ll point you to the closest match.
      </p>
      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input
          type="text"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="e.g. I need to hire a contractor to build a website"
          disabled={isSending}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={isSending || !description.trim()}
          className="rounded-md bg-[#753991] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSending ? "Thinking…" : "Ask"}
        </button>
      </form>
      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {result && (
        <p className="mt-3 text-sm text-gray-800">
          {result.reply}
          {result.matchedSlug && (
            <>
              {" "}
              <Link href={`/documents/${result.matchedSlug}`} className="font-medium text-[#209dd7] underline">
                Start drafting it →
              </Link>
            </>
          )}
        </p>
      )}
    </div>
  );
}
