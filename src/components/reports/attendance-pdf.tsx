import * as PDF from "@react-pdf/renderer";
import { formatCpf } from "@/lib/format";
import type { ReportContext } from "@/services/reports.service";
import { ReportFooter, reportPdfStyles } from "./report-pdf";

export type AttendancePdfRow = {
  name: string;
  code: string;
  cpf: string | null;
  congregation: string;
};

function groupByCongregation(rows: AttendancePdfRow[]) {
  const groups = new Map<string, AttendancePdfRow[]>();
  for (const row of rows) {
    const key = row.congregation || "Sem congregação";
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }
  return Array.from(groups, ([congregation, list]) => ({
    congregation,
    rows: [...list].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
  }));
}

const styles: PDF.Styles = {
  page: {
    ...reportPdfStyles.page,
    paddingTop: 28,
    paddingBottom: 48,
    paddingHorizontal: 32,
    fontSize: 9,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#0f172a",
    borderBottomStyle: "solid",
    paddingBottom: 10,
  },
  logo: { width: 54, height: 54, objectFit: "contain" },
  headerText: { flexGrow: 1 },
  churchName: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  headerMeta: {
    fontSize: 7.5,
    color: "#475569",
    marginTop: 2,
  },
  headerSide: {
    width: 150,
    alignItems: "flex-end",
    borderLeftWidth: 1,
    borderLeftColor: "#cbd5e1",
    paddingLeft: 10,
  },
  docType: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    textAlign: "right",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  docDate: {
    fontSize: 8,
    color: "#475569",
    marginTop: 3,
    textAlign: "right",
  },
  subjectBand: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 4,
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: "#f8fafc",
  },
  subjectLabel: {
    fontSize: 7,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  subjectValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginTop: 1,
  },
  summary: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  summaryItem: {
    minWidth: 110,
    flexGrow: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    paddingVertical: 5,
    paddingHorizontal: 7,
  },
  summaryLabel: {
    fontSize: 6.8,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: "#64748b",
  },
  summaryValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginTop: 1,
  },
  table: { marginTop: 10 },
  tableHeader: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#0f172a",
    borderBottomWidth: 1,
    borderBottomColor: "#0f172a",
    backgroundColor: "#e2e8f0",
    paddingVertical: 5,
    paddingHorizontal: 5,
  },
  th: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    color: "#334155",
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f1f5f9",
    borderBottomWidth: 0.8,
    borderBottomColor: "#94a3b8",
    paddingVertical: 4,
    paddingHorizontal: 5,
    marginTop: 6,
  },
  groupName: {
    fontSize: 7.8,
    fontFamily: "Helvetica-Bold",
    color: "#334155",
    textTransform: "uppercase",
  },
  groupCount: { fontSize: 7, color: "#64748b" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: "#cbd5e1",
    borderBottomStyle: "solid",
    paddingVertical: 7,
    paddingHorizontal: 5,
    minHeight: 27,
  },
  td: { fontSize: 9, color: "#1e293b" },
  tdMuted: { fontSize: 9, color: "#475569" },
  colNum: { width: 28, textAlign: "center" },
  colName: { flex: 3.4 },
  colCode: { width: 52, textAlign: "center" },
  colCpf: { width: 96 },
  colSign: { flex: 2.6 },
  signLine: {
    borderTopWidth: 0.6,
    borderTopColor: "#94a3b8",
    borderTopStyle: "solid",
    marginTop: 9,
  },
  signatureNote: {
    marginTop: 14,
    fontSize: 7.2,
    color: "#64748b",
    textAlign: "center",
  },
  empty: {
    marginTop: 30,
    textAlign: "center",
    fontSize: 10,
    color: "#94a3b8",
  },
  pageNumber: {
    position: "absolute",
    bottom: 14,
    right: 32,
    fontSize: 7.5,
    color: "#94a3b8",
  },
};

export function AttendancePdfDocument({
  context,
  subject,
  dateLabel,
  congregationLabel,
  rows,
}: {
  context: ReportContext;
  subject: string;
  dateLabel: string;
  congregationLabel: string;
  rows: AttendancePdfRow[];
}) {
  const emittedAt = new Intl.DateTimeFormat("pt-BR").format(new Date());
  const groupedRows = groupByCongregation(rows);
  const groups = groupedRows.map((group, groupIndex) => ({
    ...group,
    rows: group.rows.map((row, rowIndex) => ({
      row,
      number:
        groupedRows
          .slice(0, groupIndex)
          .reduce((sum, item) => sum + item.rows.length, 0) +
        rowIndex +
        1,
    })),
  }));
  const contact = [context.churchPhone, context.churchEmail]
    .filter(Boolean)
    .join(" · ");

  return (
    <PDF.Document
      title={`Lista de Presença — ${subject}`}
      author={context.churchName}
      creator="Ecclesia"
    >
      <PDF.Page size="A4" orientation="landscape" style={styles.page} wrap>
        <PDF.View style={styles.header}>
          {context.logoUrl ? (
            <PDF.Image src={context.logoUrl} style={styles.logo} />
          ) : null}
          <PDF.View style={styles.headerText}>
            <PDF.Text style={styles.churchName}>{context.churchName}</PDF.Text>
            {context.churchCnpj ? (
              <PDF.Text style={styles.headerMeta}>
                CNPJ {context.churchCnpj}
              </PDF.Text>
            ) : null}
            {context.addressLine ? (
              <PDF.Text style={styles.headerMeta}>{context.addressLine}</PDF.Text>
            ) : null}
            {contact ? (
              <PDF.Text style={styles.headerMeta}>{contact}</PDF.Text>
            ) : null}
          </PDF.View>
          <PDF.View style={styles.headerSide}>
            <PDF.Text style={styles.docType}>Lista de Presença</PDF.Text>
            <PDF.Text style={styles.docDate}>{dateLabel}</PDF.Text>
            {context.sedeName ? (
              <PDF.Text style={styles.docDate}>{context.sedeName}</PDF.Text>
            ) : null}
          </PDF.View>
        </PDF.View>

        <PDF.View style={styles.subjectBand}>
          <PDF.Text style={styles.subjectLabel}>Do que se trata esta lista</PDF.Text>
          <PDF.Text style={styles.subjectValue}>{subject}</PDF.Text>
        </PDF.View>

        <PDF.View style={styles.summary}>
          <PDF.View style={styles.summaryItem}>
            <PDF.Text style={styles.summaryLabel}>Data</PDF.Text>
            <PDF.Text style={styles.summaryValue}>{dateLabel}</PDF.Text>
          </PDF.View>
          <PDF.View style={styles.summaryItem}>
            <PDF.Text style={styles.summaryLabel}>Congregações</PDF.Text>
            <PDF.Text style={styles.summaryValue}>{congregationLabel}</PDF.Text>
          </PDF.View>
          <PDF.View style={styles.summaryItem}>
            <PDF.Text style={styles.summaryLabel}>Total de membros</PDF.Text>
            <PDF.Text style={styles.summaryValue}>{rows.length}</PDF.Text>
          </PDF.View>
          <PDF.View style={styles.summaryItem}>
            <PDF.Text style={styles.summaryLabel}>Emitido em</PDF.Text>
            <PDF.Text style={styles.summaryValue}>{emittedAt}</PDF.Text>
          </PDF.View>
        </PDF.View>

        {rows.length === 0 ? (
          <PDF.Text style={styles.empty}>
            Nenhum membro encontrado para as congregações selecionadas.
          </PDF.Text>
        ) : (
          <PDF.View style={styles.table}>
            <PDF.View style={styles.tableHeader} fixed>
              <PDF.Text style={[styles.th, styles.colNum]}>Nº</PDF.Text>
              <PDF.Text style={[styles.th, styles.colName]}>
                Nome do membro
              </PDF.Text>
              <PDF.Text style={[styles.th, styles.colCode]}>Rol</PDF.Text>
              <PDF.Text style={[styles.th, styles.colCpf]}>CPF</PDF.Text>
              <PDF.Text style={[styles.th, styles.colSign]}>Assinatura</PDF.Text>
            </PDF.View>

            {groups.map((group) => (
              <PDF.View key={group.congregation}>
                <PDF.View
                  style={styles.groupHeader}
                  wrap={false}
                  minPresenceAhead={36}
                >
                  <PDF.Text style={styles.groupName}>
                    {group.congregation}
                  </PDF.Text>
                  <PDF.Text style={styles.groupCount}>
                    {group.rows.length} membro(s)
                  </PDF.Text>
                </PDF.View>

                {group.rows.map(({ row, number }) => (
                  <PDF.View
                    key={`${group.congregation}-${row.code}-${row.name}`}
                    style={styles.row}
                    wrap={false}
                  >
                    <PDF.Text style={[styles.td, styles.colNum]}>
                      {number}
                    </PDF.Text>
                    <PDF.Text style={[styles.td, styles.colName]}>
                      {row.name}
                    </PDF.Text>
                    <PDF.Text style={[styles.tdMuted, styles.colCode]}>
                      {row.code}
                    </PDF.Text>
                    <PDF.Text style={[styles.tdMuted, styles.colCpf]}>
                      {formatCpf(row.cpf)}
                    </PDF.Text>
                    <PDF.View style={styles.colSign}>
                      <PDF.View style={styles.signLine} />
                    </PDF.View>
                  </PDF.View>
                ))}
              </PDF.View>
            ))}
          </PDF.View>
        )}

        <PDF.Text style={styles.signatureNote} wrap={false}>
          A assinatura de cada membro confirma a presença nesta lista.
        </PDF.Text>

        <ReportFooter context={context} />
        <PDF.Text
          fixed
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) =>
            `Página ${pageNumber} de ${totalPages}`
          }
        />
      </PDF.Page>
    </PDF.Document>
  );
}
