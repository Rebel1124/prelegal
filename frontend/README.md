# Mutual NDA Creator

A Next.js prototype (Jira [PL-3](https://desiganr.atlassian.net/browse/PL-3)) for generating a
Mutual Non-Disclosure Agreement. A user fills in party and deal-term details, sees a live preview
of the completed document, and downloads it as a PDF. Everything runs client-side — there is no
backend or persistence.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How it works

- `src/content/mutual-nda-standard-terms.md` is a copy of the canonical
  [`templates/mutual-nda.md`](../templates/mutual-nda.md) Standard Terms. If the canonical
  template changes, re-copy it here.
- `src/lib/standard-terms.ts` parses that markdown into a renderer-agnostic paragraph/run model
  and fills in the `coverpage_link` placeholders (Purpose, Effective Date, MNDA Term, Term of
  Confidentiality, Governing Law, Jurisdiction) with the values entered in the form.
- `src/components/nda-form.tsx` holds the form state and renders the live HTML preview
  (`cover-page-view.tsx` + `standard-terms-view.tsx`).
- `src/lib/pdf/nda-pdf-document.tsx` renders the same data as a PDF via `@react-pdf/renderer`;
  `src/lib/pdf/download.tsx` generates the PDF client-side and triggers the file download.
