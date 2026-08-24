export interface SuggestionResult {
  matchedSlug: string | null;
  reply: string;
}

export async function suggestDocumentType(description: string): Promise<SuggestionResult> {
  const response = await fetch("/api/documents/suggest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description }),
  });

  if (!response.ok) {
    throw new Error(`Document suggestion request failed with status ${response.status}`);
  }

  return response.json();
}
