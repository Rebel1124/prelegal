"use client";

import { type FormEvent, useState } from "react";
import { type ChatMessage, sendDocumentChatMessage } from "@/lib/document-chat";
import type { DocumentFormData, DocumentTypeConfig } from "@/lib/document-types";

export function DocumentChat({
  config,
  data,
  onDataChange,
  isSending,
  onSendingChange,
  documentId,
  onDocumentIdChange,
  initialMessages,
}: {
  config: DocumentTypeConfig;
  data: DocumentFormData;
  onDataChange: (data: DocumentFormData) => void;
  isSending: boolean;
  onSendingChange: (isSending: boolean) => void;
  documentId: number | null;
  onDocumentIdChange: (documentId: number) => void;
  initialMessages?: ChatMessage[];
}) {
  const [greeting] = useState(
    () =>
      `Hi! I'll help you draft a ${config.name}. Who are the parties involved, and when should it take effect?`,
  );
  const [messages, setMessages] = useState<ChatMessage[]>(
    () => initialMessages ?? [{ role: "assistant", content: greeting }],
  );
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || isSending) return;

    const nextMessages = [...messages, { role: "user" as const, content }];
    setMessages(nextMessages);
    setDraft("");
    onSendingChange(true);
    setError(null);

    try {
      const result = await sendDocumentChatMessage(config.slug, nextMessages, data, documentId);
      setMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
      onDataChange(result.fields);
      onDocumentIdChange(result.documentId);
    } catch (err) {
      console.error("Document chat request failed", err);
      setError("Something went wrong sending that message. Please try again.");
      setMessages((prev) => prev.slice(0, -1));
      setDraft(content);
    } finally {
      onSendingChange(false);
    }
  }

  return (
    <div className="flex h-[36rem] flex-col rounded-lg border border-gray-200 bg-white">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <p
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-line ${
                message.role === "user"
                  ? "bg-brand-blue text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              {message.content}
            </p>
          </div>
        ))}
        {isSending && <p className="text-sm text-gray-500">Thinking…</p>}
      </div>
      {error && (
        <p className="px-4 pb-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-gray-200 p-3">
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Type your reply…"
          disabled={isSending}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={isSending || !draft.trim()}
          className="rounded-md bg-brand-purple px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </div>
  );
}
