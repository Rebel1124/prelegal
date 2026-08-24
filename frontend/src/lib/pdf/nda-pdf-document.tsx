import { Document, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import {
  type CoverPageFieldLabel,
  type NdaFormData,
  formatEffectiveDate,
  resolveFieldValue,
} from "../nda-form";
import type { DocParagraph, DocRun } from "../standard-terms";

const DETAIL_LABELS: CoverPageFieldLabel[] = [
  "Purpose",
  "MNDA Term",
  "Term of Confidentiality",
  "Governing Law",
  "Jurisdiction",
];

const styles = StyleSheet.create({
  page: { paddingVertical: 48, paddingHorizontal: 56, fontSize: 10, lineHeight: 1.5, color: "#111827" },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#6b7280", marginBottom: 16 },
  h2: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 20, marginBottom: 10 },
  paragraph: { marginBottom: 8 },
  detailRow: { flexDirection: "row", marginBottom: 4 },
  detailLabel: { width: 150, fontFamily: "Helvetica-Bold" },
  detailValue: { flex: 1, textDecoration: "underline" },
  bold: { fontFamily: "Helvetica-Bold" },
  underline: { textDecoration: "underline" },
  partiesRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  partyBlock: { width: "47%" },
  sigBlock: { marginTop: 20, borderTopWidth: 1, borderTopColor: "#111827", paddingTop: 6 },
  divider: { borderBottomWidth: 1, borderBottomColor: "#d1d5db", marginVertical: 20 },
});

function display(value: string, placeholder: string) {
  return value.trim().length > 0 ? value : placeholder;
}

function RunsInline({ runs }: { runs: DocRun[] }) {
  return (
    <>
      {runs.map((run, index) => {
        switch (run.type) {
          case "bold":
            return (
              <Text key={index} style={styles.bold}>
                {run.text}
              </Text>
            );
          case "field":
            return (
              <Text key={index} style={styles.underline}>
                {run.text}
              </Text>
            );
          case "link":
            return (
              <Link key={index} src={run.href} style={styles.underline}>
                {run.text}
              </Link>
            );
          case "text":
            return <Text key={index}>{run.text}</Text>;
        }
      })}
    </>
  );
}

interface NdaPdfDocumentProps {
  formData: NdaFormData;
  standardTerms: DocParagraph[];
}

export function NdaPdfDocument({ formData, standardTerms }: NdaPdfDocumentProps) {
  const effectiveDate = formatEffectiveDate(formData.effectiveDate);

  return (
    <Document title="Mutual Non-Disclosure Agreement">
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Mutual Non-Disclosure Agreement</Text>
        <Text style={styles.subtitle}>Cover Page</Text>

        <Text style={styles.paragraph}>
          This Cover Page is entered into as of{" "}
          <Text style={styles.underline}>{display(effectiveDate, "[Effective Date]")}</Text> (the
          &ldquo;Effective Date&rdquo;) between{" "}
          <Text style={styles.underline}>
            {display(formData.partyA.legalName, "[Party A Legal Name]")}
          </Text>{" "}
          (&ldquo;Party A&rdquo;) and{" "}
          <Text style={styles.underline}>
            {display(formData.partyB.legalName, "[Party B Legal Name]")}
          </Text>{" "}
          (&ldquo;Party B&rdquo;), and incorporates the Standard Terms below to form the MNDA.
        </Text>

        {DETAIL_LABELS.map((label) => (
          <View key={label} style={styles.detailRow}>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={styles.detailValue}>
              {display(resolveFieldValue(label, formData), `[${label}]`)}
            </Text>
          </View>
        ))}

        <View style={styles.partiesRow}>
          {(["partyA", "partyB"] as const).map((key, index) => {
            const party = formData[key];
            return (
              <View key={key} style={styles.partyBlock}>
                <Text style={styles.bold}>{index === 0 ? "Party A" : "Party B"}</Text>
                <Text>{display(party.legalName, "[Legal Name]")}</Text>
                <Text>{display(party.noticeAddress, "[Notice Address]")}</Text>
                <View style={styles.sigBlock}>
                  <Text>Signature: ____________________</Text>
                  <Text>Name: {display(party.signatoryName, "[Signatory Name]")}</Text>
                  <Text>Title: {display(party.signatoryTitle, "[Signatory Title]")}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.divider} />

        {standardTerms.map((paragraph) => {
          if (paragraph.kind === "heading") {
            return (
              <Text key={paragraph.id} style={styles.h2}>
                <RunsInline runs={paragraph.runs} />
              </Text>
            );
          }

          return (
            <Text key={paragraph.id} style={styles.paragraph}>
              {paragraph.kind === "item" ? `${paragraph.number}. ` : ""}
              <RunsInline runs={paragraph.runs} />
            </Text>
          );
        })}
      </Page>
    </Document>
  );
}
