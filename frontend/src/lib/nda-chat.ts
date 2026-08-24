import type { NdaFormData } from "./nda-form";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function sendNdaChatMessage(
  messages: ChatMessage[],
  fields: NdaFormData,
): Promise<{ reply: string; fields: NdaFormData }> {
  const response = await fetch("/api/nda/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, fields }),
  });

  if (!response.ok) {
    throw new Error(`NDA chat request failed with status ${response.status}`);
  }

  return response.json();
}
