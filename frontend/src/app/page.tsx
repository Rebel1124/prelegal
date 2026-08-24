import fs from "node:fs";
import path from "node:path";
import { NdaForm } from "@/components/nda-form";
import { parseStandardTerms } from "@/lib/standard-terms";

export default function Home() {
  const templatePath = path.join(process.cwd(), "src", "content", "mutual-nda-standard-terms.md");
  const raw = fs.readFileSync(templatePath, "utf8");
  const standardTerms = parseStandardTerms(raw);

  return (
    <main className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-6xl px-4">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Mutual NDA Creator</h1>
          <p className="mt-1 text-sm text-gray-600">
            Fill in the details below to generate a Mutual Non-Disclosure Agreement, preview it,
            and download a PDF copy.
          </p>
        </header>
        <NdaForm standardTerms={standardTerms} />
      </div>
    </main>
  );
}
