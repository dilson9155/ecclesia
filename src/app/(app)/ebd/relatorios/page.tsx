import { requirePermission } from "@/lib/rbac";
import { ebdScopeFromUser } from "@/lib/ebd-scope";
import { listClasses } from "@/services/ebd.service";
import {
  getBirthdays,
  getPerformanceReport,
  getRanking,
  listQuarters,
} from "@/services/ebd-lessons.service";
import {
  ReportsManager,
  type EbdReportTab,
} from "@/components/ebd/reports-manager";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    tab?: string;
    quarterId?: string;
    classId?: string;
    month?: string;
  }>;
};

const TABS: EbdReportTab[] = ["boletim", "ranking", "aniversariantes"];

export default async function EbdReportsPage({ searchParams }: Props) {
  const user = await requirePermission("ebd.reports");
  if (!user.churchId) return null;

  const sp = await searchParams;
  const tab: EbdReportTab = TABS.includes(sp.tab as EbdReportTab)
    ? (sp.tab as EbdReportTab)
    : "boletim";
  const quarterId = sp.quarterId?.trim() ?? "";
  const classId = sp.classId?.trim() ?? "";
  const monthParam = Number(sp.month);
  const month =
    Number.isFinite(monthParam) && monthParam >= 1 && monthParam <= 12
      ? monthParam
      : new Date().getMonth() + 1;

  const scope = await ebdScopeFromUser(user);

  const [quarters, classes] = await Promise.all([
    listQuarters(scope),
    listClasses(scope),
  ]);

  const performance =
    tab === "boletim"
      ? await getPerformanceReport(scope, {
          quarterId: quarterId || undefined,
          classId: classId || undefined,
        })
      : undefined;

  const ranking =
    tab === "ranking"
      ? await getRanking(scope, {
          quarterId: quarterId || undefined,
          classId: classId || undefined,
        })
      : undefined;

  const birthdays =
    tab === "aniversariantes"
      ? await getBirthdays(scope, {
          month,
          classId: classId || undefined,
        })
      : undefined;

  return (
    <ReportsManager
      tab={tab}
      quarterId={quarterId}
      classId={classId}
      month={month}
      quarters={quarters}
      classes={classes}
      performance={performance}
      ranking={ranking}
      birthdays={birthdays}
      canExport
    />
  );
}
