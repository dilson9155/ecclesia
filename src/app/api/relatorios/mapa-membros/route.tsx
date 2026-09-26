import * as PDF from "@react-pdf/renderer";
import * as XLSX from "xlsx";
import { requirePermission } from "@/lib/rbac";
import { scopeFromUser, scopedCongregationIdsOrNull } from "@/lib/scope";
import { auditLog } from "@/services/audit.service";
import {
  getMemberReport,
  getReportContext,
  kindLabel,
  memberReportCsv,
  memberReportSheet,
  type MemberReportRow,
} from "@/services/reports.service";
import {
  PdfSummary,
  PdfTable,
  ReportFooter,
  ReportHeader,
  reportPdfStyles,
} from "@/components/reports/report-pdf";

const FILENAME = "mapa-membros";

export async function GET(request: Request) {
  const user = await requirePermission("relatorios.export");
  if (!user.churchId) return new Response("Igreja não encontrada.", { status: 400 });

  const { searchParams } = new URL(request.url);
  const fmt = searchParams.get("fmt") ?? "pdf";
  const requestedCongregationId = searchParams.get("congregationId") ?? undefined;
  const situation = searchParams.get("situation") ?? undefined;

  const scope = scopeFromUser(user);
  const allowedIds = await scopedCongregationIdsOrNull(scope);
  const congregationId =
    allowedIds === null || !requestedCongregationId || allowedIds.includes(requestedCongregationId)
      ? requestedCongregationId
      : undefined;

  const [context, report] = await Promise.all([
    getReportContext(user.churchId),
    getMemberReport(user.churchId, {
      congregationId,
      congregationIds: allowedIds,
      situation,
    }),
  ]);

  await auditLog({
    userId: user.id,
    churchId: user.churchId,
    action: "EXPORT",
    module: "relatorios",
    entity: "Mapa de Membros",
    description: `Exportou relatório (${fmt.toUpperCase()})`,
    newValues: { fmt, congregationId: congregationId ?? null, situation: situation ?? null },
  });

  if (fmt === "csv") {
    return new Response(memberReportCsv(report.rows), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${FILENAME}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (fmt === "xlsx") {
    const { header, body } = memberReportSheet(report.rows);
    const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Membros");
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

  const pdfRows: Array<Array<string | number>> = report.rows.map((r: MemberReportRow) => [
    r.code,
    r.name,
    r.congregation,
    kindLabel("situation", r.situation),
    r.city ?? "",
    r.phone ?? "",
  ]);

  const subtitle = `Congregação: ${congregationId ? "selecionada" : "todas"} · Situação: ${situation ? kindLabel("situation", situation) : "todos"} · ${report.total} registro(s)`;

  const doc = (
    <PDF.Document title="Mapa de Membros">
      <PDF.Page size="A4" style={reportPdfStyles.page}>
        <ReportHeader context={context} title="Mapa de Membros" subtitle={subtitle} />
        <PDF.View style={reportPdfStyles.body}>
          <PdfSummary items={[{ label: "Total de membros", value: String(report.total) }]} />
          <PdfTable
            headers={["Código", "Nome", "Congregação", "Situação", "Cidade", "Telefone"]}
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