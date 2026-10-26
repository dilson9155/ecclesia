import * as PDF from "@react-pdf/renderer";
import { requirePermission } from "@/lib/rbac";
import { ebdScopeFromUser } from "@/lib/ebd-scope";
import { getBirthdays } from "@/services/ebd-lessons.service";
import { listClasses } from "@/services/ebd.service";
import { getReportContext } from "@/services/reports.service";
import { BirthdaysReportPdf } from "@/components/ebd/ebd-report-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await requirePermission("ebd.reports");
  if (!user.churchId) {
    return new Response("Igreja não encontrada.", { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const scope = await ebdScopeFromUser(user);

  const monthParam = Number(searchParams.get("month"));
  const month =
    Number.isFinite(monthParam) && monthParam >= 1 && monthParam <= 12
      ? monthParam
      : new Date().getMonth() + 1;
  const classId = searchParams.get("classId") || undefined;
  const download = searchParams.get("download") === "1";

  const [birthdays, context, classes] = await Promise.all([
    getBirthdays(scope, { month, classId }),
    getReportContext(user.churchId),
    listClasses(scope),
  ]);

  const className = classId
    ? classes.find((item) => item.id === classId)?.name ?? "Classe selecionada"
    : "Todas as classes";

  const buffer = await PDF.renderToBuffer(
    <BirthdaysReportPdf
      context={context}
      month={birthdays.month}
      className={className}
      rows={birthdays.rows}
    />
  );

  return new Response(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `${download ? "attachment" : "inline"}; filename="aniversariantes-ebd.pdf"`,
      "cache-control": "no-store",
    },
  });
}
