import * as PDF from "@react-pdf/renderer";
import type { ReportContext } from "@/services/reports.service";

const styles: PDF.Styles = {
  page: {
    paddingTop: 44,
    paddingBottom: 44,
    paddingHorizontal: 40,
    fontSize: 10,
    lineHeight: 1.6,
    color: "#1e293b",
    fontFamily: "Helvetica",
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: "#0f172a",
    borderBottomStyle: "solid",
    paddingBottom: 10,
    marginBottom: 8,
  },
  churchName: { fontSize: 15, fontFamily: "Helvetica-Bold", color: "#0f172a" },
  meta: { fontSize: 8.5, color: "#64748b", marginTop: 3 },
  title: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 12, color: "#0f172a" },
  filters: { fontSize: 8.5, color: "#64748b", marginTop: 2 },
  body: { marginTop: 14 },
  summaryRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  summaryCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    padding: 8,
  },
  summaryLabel: { fontSize: 7.5, textTransform: "uppercase", color: "#64748b" },
  summaryValue: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#0f172a", marginTop: 2 },
  table: { marginTop: 6 },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#0f172a",
    borderBottomStyle: "solid",
    backgroundColor: "#f1f5f9",
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
    borderBottomStyle: "solid",
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  th: { fontSize: 7.5, fontFamily: "Helvetica-Bold", textTransform: "uppercase", color: "#334155", flex: 1 },
  thRight: { fontSize: 7.5, fontFamily: "Helvetica-Bold", textTransform: "uppercase", color: "#334155", flex: 1, textAlign: "right" },
  td: { fontSize: 8.5, color: "#1e293b", flex: 1 },
  tdRight: { fontSize: 8.5, color: "#1e293b", flex: 1, textAlign: "right" },
  empty: { textAlign: "center", color: "#94a3b8", marginTop: 24 },
  footer: {
    position: "absolute",
    bottom: 32,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    borderTopStyle: "solid",
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: "#94a3b8",
  },
};

export function ReportHeader({
  context,
  title,
  subtitle,
}: {
  context: ReportContext;
  title: string;
  subtitle?: string;
}) {
  return (
    <PDF.View style={styles.header}>
      <PDF.Text style={styles.churchName}>{context.churchName}</PDF.Text>
      <PDF.Text style={styles.meta}>
        {context.sedeName ? `${context.sedeName} · ` : ""}
        {context.churchCnpj ? `CNPJ ${context.churchCnpj} · ` : ""}
        Emitido em {new Intl.DateTimeFormat("pt-BR").format(new Date())}
      </PDF.Text>
      <PDF.Text style={styles.title}>{title}</PDF.Text>
      {subtitle ? <PDF.Text style={styles.filters}>{subtitle}</PDF.Text> : null}
    </PDF.View>
  );
}

export function PdfSummaryCards() {
  return null;
}

export function PdfSummary({
  items,
}: {
  items: Array<{ label: string; value: string }>;
}) {
  return (
    <PDF.View style={styles.summaryRow}>
      {items.map((item) => (
        <PDF.View key={item.label} style={styles.summaryCard}>
          <PDF.Text style={styles.summaryLabel}>{item.label}</PDF.Text>
          <PDF.Text style={styles.summaryValue}>{item.value}</PDF.Text>
        </PDF.View>
      ))}
    </PDF.View>
  );
}

export function PdfTable({
  headers,
  align,
  rows,
}: {
  headers: string[];
  align?: ("left" | "right")[];
  rows: Array<Array<string | number>>;
}) {
  const aligns = align ?? headers.map(() => "left");
  if (rows.length === 0) {
    return (
      <PDF.View style={styles.body}>
        <PDF.Text style={styles.empty}>Nenhum registro encontrado para os filtros informados.</PDF.Text>
      </PDF.View>
    );
  }
  return (
    <PDF.View style={styles.table}>
      <PDF.View style={styles.tableHeader}>
        {headers.map((h, i) => (
          <PDF.Text key={h} style={aligns[i] === "right" ? styles.thRight : styles.th}>
            {h}
          </PDF.Text>
        ))}
      </PDF.View>
      {rows.map((row, ri) => (
        <PDF.View key={ri} style={styles.tableRow} wrap={false}>
          {row.map((cell, ci) => (
            <PDF.Text key={ci} style={aligns[ci] === "right" ? styles.tdRight : styles.td}>
              {cell}
            </PDF.Text>
          ))}
        </PDF.View>
      ))}
    </PDF.View>
  );
}

export function ReportFooter({ context }: { context: ReportContext }) {
  return (
    <PDF.View style={styles.footer} fixed>
      <PDF.Text>{context.churchName} · Relatório gerado automaticamente</PDF.Text>
      <PDF.Text>Ecclesia — Gestão de Igrejas</PDF.Text>
    </PDF.View>
  );
}

export { styles as reportPdfStyles };