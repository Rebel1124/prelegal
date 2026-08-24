import type { DocRun } from "@/lib/standard-terms";

export function DocumentRunsView({ runs }: { runs: DocRun[] }) {
  return (
    <>
      {runs.map((run, index) => {
        switch (run.type) {
          case "bold":
            return (
              <strong key={index}>
                <DocumentRunsView runs={run.runs} />
              </strong>
            );
          case "link":
            return (
              <a
                key={index}
                href={run.href}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                {run.text}
              </a>
            );
          case "field":
            return (
              <span
                key={index}
                className="underline decoration-dotted underline-offset-2 font-medium text-gray-900"
              >
                {run.text}
              </span>
            );
          case "partyRole":
            return (
              <span key={index} className="font-medium text-gray-900">
                {run.text}
              </span>
            );
          case "text":
            return <span key={index}>{run.text}</span>;
        }
      })}
    </>
  );
}
