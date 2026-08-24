import type { DocParagraph } from "@/lib/standard-terms";
import { DocumentRunsView } from "./document-runs";

export function StandardTermsView({ paragraphs }: { paragraphs: DocParagraph[] }) {
  return (
    <section className="space-y-4">
      {paragraphs.map((paragraph) => {
        if (paragraph.kind === "heading") {
          return (
            <h2 key={paragraph.id} className="text-lg font-semibold text-gray-900">
              <DocumentRunsView runs={paragraph.runs} />
            </h2>
          );
        }

        if (paragraph.kind === "item") {
          return (
            <p key={paragraph.id} className="text-sm leading-relaxed text-gray-800">
              <span className="font-semibold">{paragraph.number}. </span>
              <DocumentRunsView runs={paragraph.runs} />
            </p>
          );
        }

        return (
          <p key={paragraph.id} className="text-xs text-gray-500">
            <DocumentRunsView runs={paragraph.runs} />
          </p>
        );
      })}
    </section>
  );
}
