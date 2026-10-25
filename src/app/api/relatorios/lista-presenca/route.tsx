import * as PDF from "@react-pdf/renderer";
import { requirePermission } from "@/lib/rbac";
import { scopeFromUser, scopedCongregationIdsOrNull } from "@/lib/scope";
import { auditLog } from "@/services/audit.service";
import {
  fetchCongregations,
  getMemberReport,
  getReportContext,
} from "@/services/reports.service";
import { AttendancePdfDocument } from "@/components/reports/attendance-pdf";

const FILENAME = "lista-presenca";

const SITUATIONS = [
  "ATIVO",
  "INATIVO",
  "TRANSFERIDO",
  "DESLIGADO",
  "FALECIDO",
] as const;

export async function GET(request: Request) {
  const user = await requirePermission("relatorios.export");
  if (!user.churchId) {
    return new Response("Igreja não encontrada.", { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const subject =
    (searchParams.get("subject") ?? "").trim() || "Lista de presença";
  const dateParam = searchParams.get("date") ?? "";
  const eventDate =
    /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
      ? new Date(`${dateParam}T12:00:00-03:00`)
      : new Date();
  const dateLabel = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(eventDate);
  const requestedSituation = searchParams.get("situation") ?? "ATIVO";
  const situationParam =
    requestedSituation === "TODOS" ||
    SITUATIONS.includes(requestedSituation as (typeof SITUATIONS)[number])
      ? requestedSituation
      : "ATIVO";
  const requestedCongregationIds = searchParams.getAll("congregationId");

  const scope = scopeFromUser(user);
  const allowedIds = await scopedCongregationIdsOrNull(scope);
  const selectedIds =
    allowedIds === null
      ? requestedCongregationIds
      : requestedCongregationIds.filter((id) => allowedIds.includes(id));

  const situation =
    situationParam && situationParam !== "TODOS" ? situationParam : undefined;

  const [context, congregations, report] = await Promise.all([
    getReportContext(user.churchId),
    fetchCongregations(scope),
    getMemberReport(user.churchId, {
      congregationIds: allowedIds,
      selectedCongregationIds: selectedIds,
      situation,
    }),
  ]);

  const selectedNames =
    selectedIds.length > 0
      ? congregations
          .filter((c) => selectedIds.includes(c.id))
          .map((c) => c.name)
      : [];

  const congregationLabel =
    selectedNames.length > 0
      ? selectedNames.join(", ")
      : "Todas as congregações";

  await auditLog({
    userId: user.id,
    churchId: user.churchId,
    action: "EXPORT",
    module: "relatorios",
    entity: "Lista de Presença",
    description: `Gerou lista de presença (${report.total} membro(s))`,
    newValues: {
      subject,
      date: dateParam || dateLabel,
      situation: situation ?? "TODOS",
      congregationIds: selectedIds.length ? selectedIds : null,
    },
  });

  const doc = (
    <AttendancePdfDocument
      context={context}
      subject={subject}
      dateLabel={dateLabel}
      congregationLabel={congregationLabel}
      rows={report.rows.map((row) => ({
        name: row.name,
        code: row.code,
        cpf: row.cpf,
        congregation: row.congregation,
      }))}
    />
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
