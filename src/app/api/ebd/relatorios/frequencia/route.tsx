import * as PDF from "@react-pdf/renderer";
import { requirePermission } from "@/lib/rbac";
import { ebdScopeFromUser } from "@/lib/ebd-scope";
import { getAttendanceReport } from "@/services/ebd-lessons.service";
import { getReportContext } from "@/services/reports.service";
import { AttendanceReportPdf } from "@/components/ebd/ebd-report-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await requirePermission("ebd.reports");
  if (!user.churchId) {
    return new Response("Igreja não encontrada.", { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const scope = await ebdScopeFromUser(user);

  const quarterId = searchParams.get("quarterId") || undefined;
  const classId = searchParams.get("classId") || undefined;
  const download = searchParams.get("download") === "1";

  const [report, context] = await Promise.all([
    getAttendanceReport(scope, { quarterId, classId }),
    getReportContext(user.churchId),
  ]);

  const buffer = await PDF.renderToBuffer(
    <AttendanceReportPdf context={context} report={report} />
  );

  return new Response(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `${download ? "attachment" : "inline"}; filename="frequencia-ebd.pdf"`,
      "cache-control": "no-store",
    },
  });
}
