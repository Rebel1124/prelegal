import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { DocumentChat } from "./document-chat";
import {
  createDefaultFormData,
  getPartyValue,
  type DocumentFormData,
  type DocumentTypeConfig,
} from "@/lib/document-types";

const config: DocumentTypeConfig = {
  slug: "mutual-nda",
  name: "Mutual Non-Disclosure Agreement",
  description: "Test fixture",
  parties: [
    { key: "partyA", roleLabel: "Party A" },
    { key: "partyB", roleLabel: "Party B" },
  ],
  fields: [
    { key: "effectiveDate", label: "Effective Date" },
    { key: "purpose", label: "Purpose", textarea: true },
  ],
};

function typeAndSend(text: string) {
  fireEvent.change(screen.getByPlaceholderText("Type your reply…"), {
    target: { value: text },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
}

describe("DocumentChat", () => {
  let onDataChange: (data: DocumentFormData) => void;
  let onSendingChange: (isSending: boolean) => void;
  let onDocumentIdChange: (documentId: number) => void;

  beforeEach(() => {
    onDataChange = vi.fn();
    onSendingChange = vi.fn();
    onDocumentIdChange = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function renderChat(data: DocumentFormData = createDefaultFormData(config), isSending = false) {
    render(
      <DocumentChat
        config={config}
        data={data}
        onDataChange={onDataChange}
        isSending={isSending}
        onSendingChange={onSendingChange}
        documentId={null}
        onDocumentIdChange={onDocumentIdChange}
      />,
    );
  }

  test("shows a greeting from the assistant on mount, naming the document type", () => {
    renderChat();
    expect(screen.getByText(/I'll help you draft a Mutual Non-Disclosure Agreement/)).toBeInTheDocument();
  });

  test("sends the message, renders the reply, applies returned fields, and reports sending state", async () => {
    const updatedFields: DocumentFormData = {
      ...createDefaultFormData(config),
      partyA: { ...getPartyValue(createDefaultFormData(config), "partyA"), legalName: "Acme, Inc." },
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ reply: "Got it, thanks!", fields: updatedFields, documentId: 42 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderChat();

    typeAndSend("Party A is Acme, Inc.");

    expect(screen.getByText("Party A is Acme, Inc.")).toBeInTheDocument();
    expect(onSendingChange).toHaveBeenCalledWith(true);
    await waitFor(() => expect(screen.getByText("Got it, thanks!")).toBeInTheDocument());
    expect(onDataChange).toHaveBeenCalledWith(updatedFields);
    expect(onDocumentIdChange).toHaveBeenCalledWith(42);
    expect(onSendingChange).toHaveBeenCalledWith(false);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/documents/mutual-nda/chat",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"documentId":null'),
      }),
    );
  });

  test("shows an error and restores the draft when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    renderChat();

    typeAndSend("Party A is Acme, Inc.");

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/Something went wrong/),
    );
    expect(onDataChange).not.toHaveBeenCalled();
    expect(onSendingChange).toHaveBeenLastCalledWith(false);
    expect(screen.getByPlaceholderText("Type your reply…")).toHaveValue("Party A is Acme, Inc.");
  });

  test("disables input while a request is in flight", () => {
    renderChat(createDefaultFormData(config), true);
    expect(screen.getByPlaceholderText("Type your reply…")).toBeDisabled();
  });
});
