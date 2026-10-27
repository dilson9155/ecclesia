import { requirePermission, can } from "@/lib/rbac";
import { ebdScopeFromUser } from "@/lib/ebd-scope";
import { listClasses } from "@/services/ebd.service";
import {
  listAttendances,
  listLessons,
  listQuarters,
} from "@/services/ebd-lessons.service";
import { getEbdMessageSettings } from "@/services/ebd-settings.service";
import { AttendanceManager } from "@/components/ebd/attendance-manager";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ lesson?: string }>;
};

export default async function EbdAttendancePage({ searchParams }: Props) {
  const user = await requirePermission("ebd.view");
  if (!user.churchId) return null;

  const scope = await ebdScopeFromUser(user);

  const [attendances, lessons, classes, quarters, messageSettings] =
    await Promise.all([
      listAttendances(scope),
      listLessons(scope),
      listClasses(scope),
      listQuarters(scope),
      getEbdMessageSettings(user.churchId),
    ]);
  const canManage = await can(user, "ebd.attendance");

  const sp = await searchParams;
  const lessonId = sp.lesson?.trim() || null;

  return (
    <AttendanceManager
      attendances={attendances}
      lessons={lessons}
      classes={classes}
      quarters={quarters}
      initialLessonId={canManage ? lessonId : null}
      canManage={canManage}
      messageTemplate={messageSettings.template}
      churchName={messageSettings.churchName}
    />
  );
}
