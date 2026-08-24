# Prelegal frontend

A Next.js app (static export, served by the backend) for drafting legal documents via an AI chat.
A user picks a document type, chats with an assistant to fill in party and deal-term details, sees
a live preview, and downloads it as a PDF.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How it works

- `document-types/<slug>.json` and [`catalog.json`](../catalog.json) (repo root) describe each of
  the 11 supported document types — party roles and field list. `src/lib/document-types-server.ts`
  reads these (and the matching [`templates/<slug>.md`](../templates)) at build time via `node:fs`.
- `src/lib/standard-terms.ts` parses a template's markdown into a renderer-agnostic paragraph/run
  model and resolves each `*_link` span against that document's config — either a fillable field or
  a literal party-role reference (e.g. "Customer"/"Provider", rendered as-is).
- `/documents` is a picker (11 cards from `catalog.json`, plus a free-text box that asks the backend
  for the closest match); `/documents/[slug]` is a statically pre-rendered page per document type.
- `src/components/document-workspace.tsx` holds the form state and renders the live HTML preview
  (`cover-page-view.tsx` + `standard-terms-view.tsx`), driven by a `DocumentTypeConfig`.
- `src/lib/pdf/document-pdf-document.tsx` renders the same data as a PDF via `@react-pdf/renderer`;
  `src/lib/pdf/download.tsx` generates the PDF client-side and triggers the file download.
