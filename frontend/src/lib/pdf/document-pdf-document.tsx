import { Document, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import {
  type DocumentFormData,
  type DocumentTypeConfig,
  displayValue,
  getCoverPageFields,
  getFieldValue,
  getPartyValue,
} from "../document-types";
import type { DocParagraph, DocRun } from "../standard-terms";

const styles = StyleSheet.create({
  page: { paddingVertical: 48, paddingHorizontal: 56, fontSize: 10, lineHeight: 1.5, color: "#111827" },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#6b7280", marginBottom: 16 },
  disclaimer: { fontSize: 8, color: "#888888", marginBottom: 16, fontStyle: "italic" },
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
  indent1: { marginLeft: 12 },
  indent2: { marginLeft: 24 },
  indent3: { marginLeft: 36 },
});

const INDENT_STYLES = [undefined, styles.indent1, styles.indent2, styles.indent3];

function RunsInline({ runs }: { runs: DocRun[] }) {
  return (
    <>
      {runs.map((run, index) => {
        switch (run.type) {
          case "bold":
            return (
              <Text key={index} style={styles.bold}>
                <RunsInline runs={run.runs} />
              </Text>
            );
          case "field":
            return (
              <Text key={index} style={styles.underline}>
                {run.text}
              </Text>
            );
          case "partyRole":
            return (
              <Text key={index} style={styles.bold}>
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

interface DocumentPdfDocumentProps {
  config: DocumentTypeConfig;
  data: DocumentFormData;
  standardTerms: DocParagraph[];
}

export function DocumentPdfDocument({ config, data, standardTerms }: DocumentPdfDocumentProps) {
  const { effectiveDate, partyA, partyB, detailFields } = getCoverPageFields(config, data);

  return (
    <Document title={config.name}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{config.name}</Text>
        <Text style={styles.subtitle}>Cover Page</Text>
        <Text style={styles.disclaimer}>
          This is a draft generated to help you get started. It has not been reviewed by an attorney
          and should not be relied on as legal advice — have it reviewed by a qualified lawyer before
          use.
        </Text>

        <Text style={styles.paragraph}>
          This Cover Page is entered into as of{" "}
          <Text style={styles.underline}>{displayValue(effectiveDate, "[Effective Date]")}</Text> (the
          &ldquo;Effective Date&rdquo;) between{" "}
          <Text style={styles.underline}>
            {displayValue(getPartyValue(data, partyA.key).legalName, `[${partyA.roleLabel} Legal Name]`)}
          </Text>{" "}
          (&ldquo;{partyA.roleLabel}&rdquo;) and{" "}
          <Text style={styles.underline}>
            {displayValue(getPartyValue(data, partyB.key).legalName, `[${partyB.roleLabel} Legal Name]`)}
          </Text>{" "}
          (&ldquo;{partyB.roleLabel}&rdquo;), and incorporates the Standard Terms below to form the
          Agreement.
        </Text>

        {detailFields.map((field) => (
          <View key={field.key} style={styles.detailRow}>
            <Text style={styles.detailLabel}>{field.label}</Text>
            <Text style={styles.detailValue}>
              {displayValue(getFieldValue(data, field.key), `[${field.label}]`)}
            </Text>
          </View>
        ))}

        <View style={styles.partiesRow}>
          {config.parties.map((party) => {
            const partyData = getPartyValue(data, party.key);
            return (
              <View key={party.key} style={styles.partyBlock}>
                <Text style={styles.bold}>{party.roleLabel}</Text>
                <Text>{displayValue(partyData.legalName, "[Legal Name]")}</Text>
                <Text>{displayValue(partyData.noticeAddress, "[Notice Address]")}</Text>
                <View style={styles.sigBlock}>
                  <Text>Signature: ____________________</Text>
                  <Text>Name: {displayValue(partyData.signatoryName, "[Signatory Name]")}</Text>
                  <Text>Title: {displayValue(partyData.signatoryTitle, "[Signatory Title]")}</Text>
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

          const indentStyle =
            paragraph.kind === "item" ? INDENT_STYLES[Math.min(paragraph.depth, 3)] : undefined;

          return (
            <Text key={paragraph.id} style={indentStyle ? [styles.paragraph, indentStyle] : styles.paragraph}>
              {paragraph.kind === "item" ? `${paragraph.marker}. ` : ""}
              <RunsInline runs={paragraph.runs} />
            </Text>
          );
        })}
      </Page>
    </Document>
  );
}
