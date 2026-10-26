import { requirePermission, can } from "@/lib/rbac";
import {
  accessibleCongregations,
  scopeFromUser,
  scopedCongregationIdsOrNull,
} from "@/lib/scope";
import {
  listClasses,
  listMemberOptions,
  listStudents,
} from "@/services/ebd.service";
import { StudentsManager } from "@/components/ebd/students-manager";

export const dynamic = "force-dynamic";

export default async function EbdStudentsPage() {
  const user = await requirePermission("ebd.view");
  if (!user.churchId) return null;

  const dataScope = scopeFromUser(user);
  const congregationIds = await scopedCongregationIdsOrNull(dataScope);
  const scope = { churchId: user.churchId, congregationIds };

  const [students, classes, members, congregations] = await Promise.all([
    listStudents(scope),
    listClasses(scope),
    listMemberOptions(scope),
    accessibleCongregations(dataScope),
  ]);
  const canManage = await can(user, "ebd.manage");

  return (
    <StudentsManager
      students={students}
      classes={classes.map((item) => ({
        id: item.id,
        name: item.name,
        congregationId: item.congregationId,
        status: item.status,
        activeStudentCount: item.activeStudentCount,
        maxStudents: item.maxStudents,
      }))}
      members={members}
      congregations={congregations.map((item) => ({ id: item.id, name: item.name }))}
      canManage={canManage}
    />
  );
}
