import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { NdaChat } from "./nda-chat";
import { createDefaultNdaFormData, type NdaFormData } from "@/lib/nda-form";

function typeAndSend(text: string) {
  fireEvent.change(screen.getByPlaceholderText("Type your reply…"), {
    target: { value: text },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
}

describe("NdaChat", () => {
  let onFormDataChange: (data: NdaFormData) => void;
  let onSendingChange: (isSending: boolean) => void;

  beforeEach(() => {
    onFormDataChange = vi.fn();
    onSendingChange = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function renderChat(formData: NdaFormData = createDefaultNdaFormData(), isSending = false) {
    render(
      <NdaChat
        formData={formData}
        onFormDataChange={onFormDataChange}
        isSending={isSending}
        onSendingChange={onSendingChange}
      />,
    );
  }

  test("shows a greeting from the assistant on mount", () => {
    renderChat();
    expect(screen.getByText(/I'll help you draft a Mutual NDA/)).toBeInTheDocument();
  });

  test("sends the message, renders the reply, applies returned fields, and reports sending state", async () => {
    const updatedFields: NdaFormData = {
      ...createDefaultNdaFormData(),
      partyA: { ...createDefaultNdaFormData().partyA, legalName: "Acme, Inc." },
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ reply: "Got it, thanks!", fields: updatedFields }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderChat();

    typeAndSend("Party A is Acme, Inc.");

    expect(screen.getByText("Party A is Acme, Inc.")).toBeInTheDocument();
    expect(onSendingChange).toHaveBeenCalledWith(true);
    await waitFor(() => expect(screen.getByText("Got it, thanks!")).toBeInTheDocument());
    expect(onFormDataChange).toHaveBeenCalledWith(updatedFields);
    expect(onSendingChange).toHaveBeenCalledWith(false);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/nda/chat",
      expect.objectContaining({ method: "POST" }),
    );
  });

  test("shows an error and restores the draft when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    renderChat();

    typeAndSend("Party A is Acme, Inc.");

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/Something went wrong/),
    );
    expect(onFormDataChange).not.toHaveBeenCalled();
    expect(onSendingChange).toHaveBeenLastCalledWith(false);
    expect(screen.getByPlaceholderText("Type your reply…")).toHaveValue("Party A is Acme, Inc.");
  });

  test("disables input while a request is in flight", () => {
    renderChat(createDefaultNdaFormData(), true);
    expect(screen.getByPlaceholderText("Type your reply…")).toBeDisabled();
  });
});
