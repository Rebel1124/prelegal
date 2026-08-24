import fs from "node:fs";
import path from "node:path";
import type { DocumentTypeConfig, FieldSpec, PartyRoleSpec } from "./document-types";

const REPO_ROOT = path.join(process.cwd(), "..");

interface CatalogEntry {
  name: string;
  description: string;
  filename: string;
}

interface DocumentTypeSchema {
  parties: [PartyRoleSpec, PartyRoleSpec];
  fields: FieldSpec[];
}

function slugFromFilename(filename: string): string {
  return filename.replace(/\.md$/, "");
}

function readCatalog(): CatalogEntry[] {
  const raw = fs.readFileSync(path.join(REPO_ROOT, "catalog.json"), "utf8");
  return JSON.parse(raw) as CatalogEntry[];
}

export function listDocumentTypeSlugs(): string[] {
  return readCatalog().map((entry) => slugFromFilename(entry.filename));
}

export function loadCatalog(): { slug: string; name: string; description: string }[] {
  return readCatalog().map((entry) => ({
    slug: slugFromFilename(entry.filename),
    name: entry.name,
    description: entry.description,
  }));
}

export function loadDocumentTypeConfig(slug: string): DocumentTypeConfig {
  const entry = readCatalog().find((candidate) => slugFromFilename(candidate.filename) === slug);
  if (!entry) throw new Error(`Unknown document type: ${slug}`);

  const schemaRaw = fs.readFileSync(path.join(REPO_ROOT, "document-types", `${slug}.json`), "utf8");
  const schema = JSON.parse(schemaRaw) as DocumentTypeSchema;

  return {
    slug,
    name: entry.name,
    description: entry.description,
    parties: schema.parties,
    fields: schema.fields,
  };
}

export function loadTemplateMarkdown(slug: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, "templates", `${slug}.md`), "utf8");
}
