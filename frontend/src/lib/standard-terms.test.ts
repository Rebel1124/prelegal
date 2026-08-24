import { describe, expect, test } from "vitest";
import { createDefaultFormData } from "./document-types";
import { listDocumentTypeSlugs, loadDocumentTypeConfig, loadTemplateMarkdown } from "./document-types-server";
import { fillFieldRuns, parseStandardTerms } from "./standard-terms";

describe("parseStandardTerms + fillFieldRuns", () => {
  test("parses the Mutual NDA's flat numbered items and cover-page fields", () => {
    const config = loadDocumentTypeConfig("mutual-nda");
    const raw = loadTemplateMarkdown("mutual-nda");

    const paragraphs = parseStandardTerms(raw, config);

    const heading = paragraphs.find((p) => p.kind === "heading");
    expect(heading?.runs).toEqual([{ type: "text", text: "Standard Terms" }]);

    const firstItem = paragraphs.find((p) => p.kind === "item");
    expect(firstItem).toMatchObject({ depth: 0, marker: "1" });

    const fieldRun = paragraphs
      .flatMap((p) => p.runs)
      .find((run) => run.type === "field" && run.label === "Purpose");
    expect(fieldRun).toBeDefined();

    const filled = fillFieldRuns(paragraphs, { purpose: "Evaluating a partnership" });
    const filledField = filled
      .flatMap((p) => p.runs)
      .find((run) => run.type === "field" && run.label === "Purpose");
    expect(filledField).toMatchObject({ text: "Evaluating a partnership" });
  });

  test("parses nested numbering (digits, letters, roman numerals) with compound depth-1 markers", () => {
    const config = loadDocumentTypeConfig("pilot-agreement");
    const raw = loadTemplateMarkdown("pilot-agreement");

    const paragraphs = parseStandardTerms(raw, config);
    const items = paragraphs.filter((p) => p.kind === "item");

    expect(items.find((p) => p.depth === 0 && p.marker === "2")).toBeDefined();
    expect(items.find((p) => p.depth === 1 && p.marker === "2.2")).toBeDefined();
    expect(items.find((p) => p.depth === 2 && p.marker === "b")).toBeDefined();
  });

  test("resolves party-role spans as literal pass-through text, not fillable fields", () => {
    const config = loadDocumentTypeConfig("pilot-agreement");
    const raw = loadTemplateMarkdown("pilot-agreement");

    const paragraphs = parseStandardTerms(raw, config);
    const partyRun = paragraphs
      .flatMap((p) => p.runs)
      .find((run) => run.type === "partyRole");

    expect(partyRun).toBeDefined();
    expect((partyRun as { text: string }).text.replace(/[’']s$/, "")).toBe("Customer");
  });

  test("resolves variable spans nested inside bold liability clauses", () => {
    const config = loadDocumentTypeConfig("cloud-service-agreement");
    const raw = loadTemplateMarkdown("cloud-service-agreement");

    const paragraphs = parseStandardTerms(raw, config);

    function collectFieldKeys(runs: import("./standard-terms").DocRun[]): string[] {
      return runs.flatMap((run) => {
        if (run.type === "field") return [run.key];
        if (run.type === "bold") return collectFieldKeys(run.runs);
        return [];
      });
    }

    const allFieldKeys = paragraphs.flatMap((p) => collectFieldKeys(p.runs));
    expect(allFieldKeys).toContain("generalCapAmount");
  });

  test.each(listDocumentTypeSlugs())(
    "parses and fills %s without throwing on unrecognized spans",
    (slug) => {
      const config = loadDocumentTypeConfig(slug);
      const raw = loadTemplateMarkdown(slug);

      expect(() => {
        const paragraphs = parseStandardTerms(raw, config);
        fillFieldRuns(paragraphs, createDefaultFormData(config));
      }).not.toThrow();
    },
  );
});
