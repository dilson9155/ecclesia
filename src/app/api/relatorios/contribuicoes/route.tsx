import * as PDF from "@react-pdf/renderer";
import * as XLSX from "xlsx";
import { requirePermission } from "@/lib/rbac";
import { auditLog } from "@/services/audit.service";
import {
  contributionsReportCsv,
  contributionsReportSheet,
  defaultRange,
  getContributionsReport,
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

const FILENAME = "contribuicoes";

export async function GET(request: Request) {
  const user = await requirePermission("relatorios.export");
  if (!user.churchId) return new Response("Igreja não encontrada.", { status: 400 });

  const { searchParams } = new URL(request.url);
  const fmt = searchParams.get("fmt") ?? "pdf";
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const congregationId = searchParams.get("congregationId") ?? undefined;
  const type = searchParams.get("type") ?? "ambos";

  const { from: fromDefault, to: toDefault } = defaultRange();
  const [context, report] = await Promise.all([
    getReportContext(user.churchId),
    getContributionsReport(user.churchId, {
      from: from ? new Date(`${from}T00:00:00`) : undefined,
      to: to ? new Date(`${to}T23:59:59`) : undefined,
      congregationId: congregationId || undefined,
      type,
    }),
  ]);

  await auditLog({
    userId: user.id,
    churchId: user.churchId,
    action: "EXPORT",
    module: "relatorios",
    entity: "Contribuições",
    description: `Exportou relatório (${fmt.toUpperCase()})`,
    newValues: { fmt, from: from ?? null, to: to ?? null, congregationId: congregationId ?? null, type },
  });

  if (fmt === "csv") {
    return new Response(contributionsReportCsv(report), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${FILENAME}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (fmt === "xlsx") {
    const { header, body } = contributionsReportSheet(report);
    const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contribuições");
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
    r.date,
    r.kind,
    r.contributor,
    r.code ?? "",
    r.congregation,
    formatMoney(r.value),
  ]);

  const rangeLabel = `${from ?? fromDefault.toISOString().slice(0, 10)} a ${
    to ?? toDefault.toISOString().slice(0, 10)
  }`;
  const typeLabel = type === "dizimos" ? "Dízimos" : type === "ofertas" ? "Ofertas" : "Dízimos e ofertas";

  const doc = (
    <PDF.Document title="Contribuições">
      <PDF.Page size="A4" style={reportPdfStyles.page}>
        <ReportHeader
          context={context}
          title="Relatório de Contribuições"
          subtitle={`${typeLabel} · Período: ${rangeLabel} · ${report.rows.length} lançamento(s)`}
        />
        <PDF.View style={reportPdfStyles.body}>
          <PdfSummary
            items={[
              { label: "Dízimos", value: formatMoney(report.totals.tithe, true) },
              { label: "Ofertas", value: formatMoney(report.totals.offering, true) },
              { label: "Total", value: formatMoney(report.totals.total, true) },
            ]}
          />
          <PdfTable
            headers={["Data", "Tipo", "Membro/Contribuinte", "Código", "Congregação", "Valor (R$)"]}
            align={["left", "left", "left", "left", "left", "right"]}
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