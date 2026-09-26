import * as PDF from "@react-pdf/renderer";
import * as XLSX from "xlsx";
import { requirePermission } from "@/lib/rbac";
import { scopeFromUser, scopedCongregationIdsOrNull } from "@/lib/scope";
import { auditLog } from "@/services/audit.service";
import {
  defaultRange,
  financialReportCsv,
  financialReportSheet,
  getFinancialReport,
  getReportContext,
} from "@/services/reports.service";
import { formatMoney } from "@/lib/format";
import {
  PdfSummary,
  PdfTable,
  ReportFooter,
  ReportHeader,
  reportPdfStyles,
} from "@/components/reports/report-pdf";

const FILENAME = "relatorio-financeiro";

export async function GET(request: Request) {
  const user = await requirePermission("relatorios.export");
  if (!user.churchId) return new Response("Igreja não encontrada.", { status: 400 });

  const { searchParams } = new URL(request.url);
  const fmt = searchParams.get("fmt") ?? "pdf";
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const requestedCongregationId = searchParams.get("congregationId") ?? undefined;

  const scope = scopeFromUser(user);
  const allowedIds = await scopedCongregationIdsOrNull(scope);
  const congregationId =
    allowedIds === null || !requestedCongregationId || allowedIds.includes(requestedCongregationId)
      ? requestedCongregationId
      : undefined;

  const { from: fromDefault, to: toDefault } = defaultRange();
  const [context, report] = await Promise.all([
    getReportContext(user.churchId),
    getFinancialReport(user.churchId, {
      from: from ? new Date(`${from}T00:00:00`) : undefined,
      to: to ? new Date(`${to}T23:59:59`) : undefined,
      congregationId: congregationId || undefined,
      congregationIds: allowedIds,
    }),
  ]);

  await auditLog({
    userId: user.id,
    churchId: user.churchId,
    action: "EXPORT",
    module: "relatorios",
    entity: "Relatório Financeiro",
    description: `Exportou relatório (${fmt.toUpperCase()})`,
    newValues: { fmt, from: from ?? null, to: to ?? null, congregationId: congregationId ?? null },
  });

  if (fmt === "csv") {
    return new Response(financialReportCsv(report), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${FILENAME}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (fmt === "xlsx") {
    const { header, body } = financialReportSheet(report);
    const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Financeiro");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as unknown as ArrayBuffer;
    return new Response(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${FILENAME}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const pdfRows: Array<Array<string | number>> = report.rows.map((r) => [
    r.name,
    r.nature === "ENTRADA" ? "Receita" : "Despesa",
    formatMoney(r.revenue),
    formatMoney(r.expense),
    formatMoney(r.balance),
  ]);
  pdfRows.push([
    "TOTAL",
    "",
    formatMoney(report.totals.revenue),
    formatMoney(report.totals.expense),
    formatMoney(report.totals.balance),
  ]);

  const rangeLabel = `${from ?? fromDefault.toISOString().slice(0, 10)} a ${
    to ?? toDefault.toISOString().slice(0, 10)
  }`;

  const doc = (
    <PDF.Document title="Relatório Financeiro">
      <PDF.Page size="A4" style={reportPdfStyles.page}>
        <ReportHeader
          context={context}
          title="Relatório Financeiro"
          subtitle={`Período: ${rangeLabel} · ${report.entries.length} lançamento(s)`}
        />
        <PDF.View style={reportPdfStyles.body}>
          <PdfSummary
            items={[
              { label: "Entradas", value: formatMoney(report.totals.revenue, true) },
              { label: "Saídas", value: formatMoney(report.totals.expense, true) },
              { label: "Saldo do período", value: formatMoney(report.totals.balance, true) },
            ]}
          />
          <PdfTable
            headers={["Conta", "Natureza", "Entradas (R$)", "Saídas (R$)", "Saldo (R$)"]}
            align={["left", "left", "right", "right", "right"]}
            rows={pdfRows}
          />
        </PDF.View>
        <ReportFooter context={context} />
      </PDF.Page>
    </PDF.Document>
  );

  const buffer = await PDF.renderToBuffer(doc);
  return new Response(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${FILENAME}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}