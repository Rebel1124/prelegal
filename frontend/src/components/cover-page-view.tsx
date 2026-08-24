import {
  type CoverPageFieldLabel,
  type NdaFormData,
  type PartyInfo,
  formatEffectiveDate,
  resolveFieldValue,
} from "@/lib/nda-form";

const DETAIL_LABELS: CoverPageFieldLabel[] = [
  "Purpose",
  "MNDA Term",
  "Term of Confidentiality",
  "Governing Law",
  "Jurisdiction",
];

function display(value: string, placeholder: string) {
  return value.trim().length > 0 ? value : placeholder;
}

function Filled({ children }: { children: string }) {
  return <span className="underline decoration-dotted underline-offset-2">{children}</span>;
}

function PartyBlock({ title, party }: { title: string; party: PartyInfo }) {
  return (
    <div className="space-y-1 text-sm text-gray-800">
      <p className="font-medium text-gray-900">{title}</p>
      <p>{display(party.legalName, "[Legal Name]")}</p>
      <p className="whitespace-pre-line text-gray-600">
        {display(party.noticeAddress, "[Notice Address]")}
      </p>
      <div className="mt-4 border-t border-gray-300 pt-2 text-gray-600">
        <p>Signature: ____________________</p>
        <p>Name: {display(party.signatoryName, "[Signatory Name]")}</p>
        <p>Title: {display(party.signatoryTitle, "[Signatory Title]")}</p>
      </div>
    </div>
  );
}

export function CoverPageView({ formData }: { formData: NdaFormData }) {
  const effectiveDate = formatEffectiveDate(formData.effectiveDate);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Mutual Non-Disclosure Agreement</h1>
        <p className="text-sm text-gray-500">Cover Page</p>
      </div>

      <p className="text-sm leading-relaxed text-gray-800">
        This Cover Page is entered into as of{" "}
        <Filled>{display(effectiveDate, "[Effective Date]")}</Filled> (the &ldquo;Effective
        Date&rdquo;) between <Filled>{display(formData.partyA.legalName, "[Party A Legal Name]")}</Filled>{" "}
        (&ldquo;Party A&rdquo;) and{" "}
        <Filled>{display(formData.partyB.legalName, "[Party B Legal Name]")}</Filled> (&ldquo;Party
        B&rdquo;), and incorporates the Standard Terms below to form the MNDA.
      </p>

      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        {DETAIL_LABELS.map((label) => (
          <div key={label}>
            <dt className="font-medium text-gray-500">{label}</dt>
            <dd className="text-gray-900">
              <Filled>{display(resolveFieldValue(label, formData), `[${label}]`)}</Filled>
            </dd>
          </div>
        ))}
      </dl>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <PartyBlock title="Party A" party={formData.partyA} />
        <PartyBlock title="Party B" party={formData.partyB} />
      </div>
    </section>
  );
}
