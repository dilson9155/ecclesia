import { requirePermission, can } from "@/lib/rbac";
import { scopeFromUser, scopedCongregationIdsOrNull } from "@/lib/scope";
import { listClasses } from "@/services/ebd.service";
import { listLessons, listQuarters } from "@/services/ebd-lessons.service";
import { LessonsManager } from "@/components/ebd/lessons-manager";

export const dynamic = "force-dynamic";

export default async function EbdLessonsPage() {
  const user = await requirePermission("ebd.view");
  if (!user.churchId) return null;

  const congregationIds = await scopedCongregationIdsOrNull(scopeFromUser(user));
  const scope = { churchId: user.churchId, congregationIds };

  const [quarters, lessons, classes] = await Promise.all([
    listQuarters(scope),
    listLessons(scope),
    listClasses(scope),
  ]);
  const canManage = await can(user, "ebd.manage");

  return (
    <LessonsManager
      quarters={quarters}
      lessons={lessons}
      classes={classes}
      canManage={canManage}
    />
  );
}
