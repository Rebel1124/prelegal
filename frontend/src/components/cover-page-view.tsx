import {
  type DocumentFormData,
  type DocumentTypeConfig,
  type PartyInfo,
  displayValue,
  getCoverPageFields,
  getFieldValue,
  getPartyValue,
} from "@/lib/document-types";

function Filled({ children }: { children: string }) {
  return <span className="underline decoration-dotted underline-offset-2">{children}</span>;
}

function PartyBlock({ title, party }: { title: string; party: PartyInfo }) {
  return (
    <div className="space-y-1 text-sm text-gray-800">
      <p className="font-medium text-gray-900">{title}</p>
      <p>{displayValue(party.legalName, "[Legal Name]")}</p>
      <p className="whitespace-pre-line text-gray-600">
        {displayValue(party.noticeAddress, "[Notice Address]")}
      </p>
      <div className="mt-4 border-t border-gray-300 pt-2 text-gray-600">
        <p>Signature: ____________________</p>
        <p>Name: {displayValue(party.signatoryName, "[Signatory Name]")}</p>
        <p>Title: {displayValue(party.signatoryTitle, "[Signatory Title]")}</p>
      </div>
    </div>
  );
}

export function CoverPageView({
  config,
  data,
}: {
  config: DocumentTypeConfig;
  data: DocumentFormData;
}) {
  const { effectiveDate, partyA, partyB, detailFields } = getCoverPageFields(config, data);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{config.name}</h1>
        <p className="text-sm text-gray-500">Cover Page</p>
      </div>

      <p className="text-sm leading-relaxed text-gray-800">
        This Cover Page is entered into as of{" "}
        <Filled>{displayValue(effectiveDate, "[Effective Date]")}</Filled> (the &ldquo;Effective
        Date&rdquo;) between{" "}
        <Filled>
          {displayValue(getPartyValue(data, partyA.key).legalName, `[${partyA.roleLabel} Legal Name]`)}
        </Filled>{" "}
        (&ldquo;{partyA.roleLabel}&rdquo;) and{" "}
        <Filled>
          {displayValue(getPartyValue(data, partyB.key).legalName, `[${partyB.roleLabel} Legal Name]`)}
        </Filled>{" "}
        (&ldquo;{partyB.roleLabel}&rdquo;), and incorporates the Standard Terms below to form the
        Agreement.
      </p>

      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        {detailFields.map((field) => (
          <div key={field.key}>
            <dt className="font-medium text-gray-500">{field.label}</dt>
            <dd className="text-gray-900">
              <Filled>{displayValue(getFieldValue(data, field.key), `[${field.label}]`)}</Filled>
            </dd>
          </div>
        ))}
      </dl>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <PartyBlock title={partyA.roleLabel} party={getPartyValue(data, partyA.key)} />
        <PartyBlock title={partyB.roleLabel} party={getPartyValue(data, partyB.key)} />
      </div>
    </section>
  );
}
