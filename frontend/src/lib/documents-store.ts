import { authFetch } from "./auth";
import type { ChatMessage } from "./document-chat";
import type { DocumentFormData } from "./document-types";

export interface SavedDocumentSummary {
  id: number;
  slug: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavedDocumentDetail extends SavedDocumentSummary {
  fields: DocumentFormData;
  messages: ChatMessage[];
}

export async function fetchMyDocuments(): Promise<SavedDocumentSummary[]> {
  const response = await authFetch("/api/documents/mine");

  if (!response.ok) {
    throw new Error(`Fetching saved documents failed with status ${response.status}`);
  }

  return response.json();
}

export async function fetchDocument(documentId: number): Promise<SavedDocumentDetail> {
  const response = await authFetch(`/api/documents/${documentId}`);

  if (!response.ok) {
    throw new Error(`Fetching document failed with status ${response.status}`);
  }

  return response.json();
}
