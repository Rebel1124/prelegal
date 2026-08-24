import type { DocumentFormData } from "./document-types";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function sendDocumentChatMessage(
  slug: string,
  messages: ChatMessage[],
  fields: DocumentFormData,
): Promise<{ reply: string; fields: DocumentFormData }> {
  const response = await fetch(`/api/documents/${slug}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, fields }),
  });

  if (!response.ok) {
    throw new Error(`Document chat request failed with status ${response.status}`);
  }

  return response.json();
}
