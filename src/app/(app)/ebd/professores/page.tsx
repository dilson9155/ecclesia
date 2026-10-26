import { requirePermission, can } from "@/lib/rbac";
import { scopeFromUser, scopedCongregationIdsOrNull } from "@/lib/scope";
import {
  listClasses,
  listMemberOptions,
  listTeachers,
} from "@/services/ebd.service";
import { TeachersManager } from "@/components/ebd/teachers-manager";

export const dynamic = "force-dynamic";

export default async function EbdTeachersPage() {
  const user = await requirePermission("ebd.view");
  if (!user.churchId) return null;

  const congregationIds = await scopedCongregationIdsOrNull(scopeFromUser(user));
  const scope = { churchId: user.churchId, congregationIds };

  const [teachers, classes, members] = await Promise.all([
    listTeachers(scope),
    listClasses(scope),
    listMemberOptions(scope),
  ]);
  const canManage = await can(user, "ebd.manage");

  return (
    <TeachersManager
      teachers={teachers}
      classes={classes}
      members={members}
      canManage={canManage}
    />
  );
}
