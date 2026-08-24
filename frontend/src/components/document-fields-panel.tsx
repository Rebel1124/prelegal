"use client";

import { TextAreaField, TextField } from "@/components/form-fields";
import {
  type DocumentFormData,
  type DocumentTypeConfig,
  type PartyInfo,
  getFieldValue,
  getPartyValue,
} from "@/lib/document-types";

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

export function DocumentFieldsPanel({
  config,
  data,
  onDataChange,
  disabled,
}: {
  config: DocumentTypeConfig;
  data: DocumentFormData;
  onDataChange: (data: DocumentFormData) => void;
  disabled?: boolean;
}) {
  function updateField(key: string, value: string) {
    onDataChange({ ...data, [key]: value });
  }

  function updateParty(partyKey: string, key: keyof PartyInfo, value: string) {
    onDataChange({ ...data, [partyKey]: { ...getPartyValue(data, partyKey), [key]: value } });
  }

  return (
    <details className="rounded-lg border border-gray-200">
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-gray-700">
        Edit details manually
      </summary>
      <div className="space-y-6 border-t border-gray-200 p-4">
        {config.parties.map((party) => (
          <PartyFieldset
            key={party.key}
            title={party.roleLabel}
            party={getPartyValue(data, party.key)}
            onChange={(key, value) => updateParty(party.key, key, value)}
            disabled={disabled}
          />
        ))}

        <fieldset disabled={disabled} className="space-y-4 rounded-lg border border-gray-200 p-4">
          <legend className="px-1 text-sm font-semibold text-gray-900">Deal terms</legend>
          {config.fields.map((field) =>
            field.key === "effectiveDate" ? (
              <TextField
                key={field.key}
                label="Effective date"
                type="date"
                value={getFieldValue(data, field.key)}
                onChange={(value) => updateField(field.key, value)}
                required
              />
            ) : field.textarea ? (
              <TextAreaField
                key={field.key}
                label={field.label}
                value={getFieldValue(data, field.key)}
                onChange={(value) => updateField(field.key, value)}
              />
            ) : (
              <TextField
                key={field.key}
                label={field.label}
                value={getFieldValue(data, field.key)}
                onChange={(value) => updateField(field.key, value)}
              />
            ),
          )}
        </fieldset>
      </div>
    </details>
  );
}
