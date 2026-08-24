import { authFetch } from "./auth";
import type { DocumentFormData } from "./document-types";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface DocumentChatResult {
  reply: string;
  fields: DocumentFormData;
  documentId: number;
}

export async function sendDocumentChatMessage(
  slug: string,
  messages: ChatMessage[],
  fields: DocumentFormData,
  documentId: number | null,
): Promise<DocumentChatResult> {
  const response = await authFetch(`/api/documents/${slug}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, fields, documentId }),
  });

  if (!response.ok) {
    throw new Error(`Document chat request failed with status ${response.status}`);
  }

  return response.json();
}
