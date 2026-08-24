import type { DocumentTypeConfig } from "./document-types";

export type DocRun =
  | { type: "text"; text: string }
  | { type: "bold"; runs: DocRun[] }
  | { type: "link"; text: string; href: string }
  | { type: "field"; key: string; label: string; text: string }
  | { type: "partyRole"; partyKey: string; text: string };

export type DocParagraph =
  | { kind: "heading"; id: string; runs: DocRun[] }
  | { kind: "item"; id: string; depth: number; marker: string; runs: DocRun[] }
  | { kind: "paragraph"; id: string; runs: DocRun[] };

const BOLD_SPLIT_REGEX = /\*\*([\s\S]+?)\*\*/g;
const SPAN_OR_LINK_REGEX = /<span([^>]*)>([\s\S]*?)<\/span>|\[(.+?)\]\((.+?)\)/g;
const ANCHOR_ONLY_SPAN_REGEX = /<span(?![^>]*\bclass=)[^>]*>([\s\S]*?)<\/span>/g;

/** Strips spans that carry only an `id` anchor (no `class`), keeping their inner content in place. */
function unwrapAnchorOnlySpans(line: string): string {
  return line.replace(ANCHOR_ONLY_SPAN_REGEX, "$1");
}

function resolveVariableSpan(rawText: string, config: DocumentTypeConfig): DocRun {
  const normalized = rawText.replace(/[’']s$/i, "");

  const party = config.parties.find((candidate) => candidate.roleLabel === normalized);
  if (party) {
    return { type: "partyRole", partyKey: party.key, text: rawText };
  }

  const field = config.fields.find(
    (candidate) => candidate.label === rawText || candidate.aliases?.includes(rawText),
  );
  if (field) {
    return { type: "field", key: field.key, label: field.label, text: field.label };
  }

  throw new Error(`Unrecognized variable "${rawText}" in Standard Terms content for "${config.slug}"`);
}

/** Parses spans and links (but not `**bold**`, already split out by the caller). */
function parseSpansAndLinks(text: string, config: DocumentTypeConfig): DocRun[] {
  const runs: DocRun[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(SPAN_OR_LINK_REGEX)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      runs.push({ type: "text", text: text.slice(lastIndex, index) });
    }

    const [full, spanAttrs, spanContent, linkText, linkHref] = match;
    if (spanAttrs !== undefined) {
      const classMatch = /class="([\w-]+)"/.exec(spanAttrs);
      const className = classMatch?.[1];
      if (!className) {
        // Anchor-only spans are unwrapped upstream; keep any stray content as plain text.
        if (spanContent) runs.push({ type: "text", text: spanContent });
      } else if (className === "header_2" || className === "header_3") {
        runs.push({ type: "bold", runs: [{ type: "text", text: spanContent }] });
      } else if (className.endsWith("_link")) {
        runs.push(resolveVariableSpan(spanContent, config));
      } else {
        throw new Error(`Unrecognized span class "${className}" in Standard Terms content for "${config.slug}"`);
      }
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

/** Parses inline markdown/HTML into runs, recursing into `**bold**` so nested spans still resolve. */
function parseInline(text: string, config: DocumentTypeConfig): DocRun[] {
  const runs: DocRun[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(BOLD_SPLIT_REGEX)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      runs.push(...parseSpansAndLinks(text.slice(lastIndex, index), config));
    }
    runs.push({ type: "bold", runs: parseSpansAndLinks(match[1], config) });
    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) {
    runs.push(...parseSpansAndLinks(text.slice(lastIndex), config));
  }

  return runs;
}

/** Parses the Standard Terms markdown into a renderer-agnostic paragraph/run model. */
export function parseStandardTerms(raw: string, config: DocumentTypeConfig): DocParagraph[] {
  const rawLines = raw.split("\n").filter((line) => line.trim().length > 0);

  let currentTopMarker = "";

  return rawLines.map((rawLine, index) => {
    const indent = rawLine.length - rawLine.trimStart().length;
    const depth = Math.floor(indent / 4);
    const cleaned = unwrapAnchorOnlySpans(rawLine.trim());

    const headingMatch = cleaned.match(/^#\s+(.*)$/);
    if (headingMatch) {
      return { kind: "heading", id: `heading-${index}`, runs: parseInline(headingMatch[1], config) };
    }

    const itemMatch = cleaned.match(/^(\S+)\.\s+(.*)$/);
    if (itemMatch) {
      const [, token, rest] = itemMatch;
      let marker: string;
      if (depth === 0) {
        currentTopMarker = token;
        marker = token;
      } else if (depth === 1) {
        marker = `${currentTopMarker}.${token}`;
      } else {
        marker = token;
      }
      return { kind: "item", id: `item-${index}`, depth, marker, runs: parseInline(rest, config) };
    }

    return { kind: "paragraph", id: `paragraph-${index}`, runs: parseInline(cleaned, config) };
  });
}

/** Replaces each field run's placeholder text with the entered value; party-role runs pass through unchanged. */
export function fillFieldRuns(paragraphs: DocParagraph[], data: Record<string, unknown>): DocParagraph[] {
  function fillRun(run: DocRun): DocRun {
    if (run.type === "bold") return { ...run, runs: run.runs.map(fillRun) };
    if (run.type !== "field") return run;
    const value = String((data[run.key] as string | undefined) ?? "").trim();
    return { ...run, text: value || `[${run.label}]` };
  }

  return paragraphs.map((paragraph) => ({ ...paragraph, runs: paragraph.runs.map(fillRun) }));
}
