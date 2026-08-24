import {
  type CoverPageFieldLabel,
  type NdaFormData,
  isCoverPageFieldLabel,
  resolveFieldValue,
} from "./nda-form";

export type DocRun =
  | { type: "text"; text: string }
  | { type: "bold"; text: string }
  | { type: "link"; text: string; href: string }
  | { type: "field"; label: CoverPageFieldLabel; text: string };

export type DocParagraph =
  | { kind: "heading"; id: string; runs: DocRun[] }
  | { kind: "item"; id: string; number: number; runs: DocRun[] }
  | { kind: "paragraph"; id: string; runs: DocRun[] };

const INLINE_TOKEN_REGEX =
  /\*\*(.+?)\*\*|<span class="coverpage_link">(.+?)<\/span>|\[(.+?)\]\((.+?)\)/g;

function parseInline(text: string): DocRun[] {
  const runs: DocRun[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(INLINE_TOKEN_REGEX)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      runs.push({ type: "text", text: text.slice(lastIndex, index) });
    }

    const [full, boldText, fieldLabel, linkText, linkHref] = match;
    if (boldText !== undefined) {
      runs.push({ type: "bold", text: boldText });
    } else if (fieldLabel !== undefined) {
      if (!isCoverPageFieldLabel(fieldLabel)) {
        throw new Error(
          `Unrecognized coverpage_link label "${fieldLabel}" in Standard Terms content`,
        );
      }
      runs.push({ type: "field", label: fieldLabel, text: fieldLabel });
    } else if (linkText !== undefined && linkHref !== undefined) {
      runs.push({ type: "link", text: linkText, href: linkHref });
    }

    lastIndex = index + full.length;
  }

  if (lastIndex < text.length) {
    runs.push({ type: "text", text: text.slice(lastIndex) });
  }

  return runs;
}

/** Parses the Standard Terms markdown into a renderer-agnostic paragraph/run model. */
export function parseStandardTerms(raw: string): DocParagraph[] {
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return lines.map((line, index) => {
    const headingMatch = line.match(/^#\s+(.*)$/);
    if (headingMatch) {
      return { kind: "heading", id: `heading-${index}`, runs: parseInline(headingMatch[1]) };
    }

    const itemMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (itemMatch) {
      return {
        kind: "item",
        id: `item-${itemMatch[1]}`,
        number: Number(itemMatch[1]),
        runs: parseInline(itemMatch[2]),
      };
    }

    return { kind: "paragraph", id: `paragraph-${index}`, runs: parseInline(line) };
  });
}

/** Replaces each coverpage_link field run's placeholder text with the entered value. */
export function fillFieldRuns(paragraphs: DocParagraph[], data: NdaFormData): DocParagraph[] {
  return paragraphs.map((paragraph) => ({
    ...paragraph,
    runs: paragraph.runs.map((run) =>
      run.type === "field"
        ? { ...run, text: resolveFieldValue(run.label, data) || `[${run.label}]` }
        : run,
    ),
  }));
}
