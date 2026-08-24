"use client";

import { TextAreaField, TextField } from "@/components/form-fields";
import type { NdaFormData, PartyInfo, PartyKey } from "@/lib/nda-form";

function PartyFieldset({
  title,
  party,
  onChange,
  disabled,
}: {
  title: string;
  party: PartyInfo;
  onChange: (key: keyof PartyInfo, value: string) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset disabled={disabled} className="space-y-4 rounded-lg border border-gray-200 p-4">
      <legend className="px-1 text-sm font-semibold text-gray-900">{title}</legend>
      <TextField
        label="Legal name"
        value={party.legalName}
        onChange={(value) => onChange("legalName", value)}
        placeholder="Acme, Inc."
        required
      />
      <TextAreaField
        label="Notice address"
        value={party.noticeAddress}
        onChange={(value) => onChange("noticeAddress", value)}
        rows={2}
        placeholder="123 Main St, San Francisco, CA 94105"
      />
      <TextField
        label="Signatory name"
        value={party.signatoryName}
        onChange={(value) => onChange("signatoryName", value)}
        placeholder="Jane Doe"
      />
      <TextField
        label="Signatory title"
        value={party.signatoryTitle}
        onChange={(value) => onChange("signatoryTitle", value)}
        placeholder="CEO"
      />
    </fieldset>
  );
}

export function NdaFieldsPanel({
  formData,
  onFormDataChange,
  disabled,
}: {
  formData: NdaFormData;
  onFormDataChange: (data: NdaFormData) => void;
  disabled?: boolean;
}) {
  function updateField<K extends keyof NdaFormData>(key: K, value: NdaFormData[K]) {
    onFormDataChange({ ...formData, [key]: value });
  }

  function updateParty(party: PartyKey, key: keyof PartyInfo, value: string) {
    onFormDataChange({ ...formData, [party]: { ...formData[party], [key]: value } });
  }

  return (
    <details className="rounded-lg border border-gray-200">
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-gray-700">
        Edit details manually
      </summary>
      <div className="space-y-6 border-t border-gray-200 p-4">
        <PartyFieldset
          title="Party A"
          party={formData.partyA}
          onChange={(key, value) => updateParty("partyA", key, value)}
          disabled={disabled}
        />
        <PartyFieldset
          title="Party B"
          party={formData.partyB}
          onChange={(key, value) => updateParty("partyB", key, value)}
          disabled={disabled}
        />

        <fieldset disabled={disabled} className="space-y-4 rounded-lg border border-gray-200 p-4">
          <legend className="px-1 text-sm font-semibold text-gray-900">Deal terms</legend>
          <TextField
            label="Effective date"
            type="date"
            value={formData.effectiveDate}
            onChange={(value) => updateField("effectiveDate", value)}
            required
          />
          <TextAreaField
            label="Purpose"
            value={formData.purpose}
            onChange={(value) => updateField("purpose", value)}
            placeholder="Evaluating a potential business relationship between the parties"
          />
          <TextField
            label="MNDA term"
            value={formData.mndaTerm}
            onChange={(value) => updateField("mndaTerm", value)}
            placeholder="1 year from the Effective Date"
          />
          <TextField
            label="Term of confidentiality"
            value={formData.confidentialityTerm}
            onChange={(value) => updateField("confidentialityTerm", value)}
            placeholder="3 years after the disclosure of the Confidential Information"
          />
          <TextField
            label="Governing law"
            value={formData.governingLaw}
            onChange={(value) => updateField("governingLaw", value)}
            placeholder="Delaware"
          />
          <TextField
            label="Jurisdiction"
            value={formData.jurisdiction}
            onChange={(value) => updateField("jurisdiction", value)}
            placeholder="Wilmington, Delaware"
          />
        </fieldset>
      </div>
    </details>
  );
}
