import { requirePermission, can } from "@/lib/rbac";
import {
  accessibleCongregations,
  scopeFromUser,
  scopedCongregationIdsOrNull,
} from "@/lib/scope";
import { listClasses } from "@/services/ebd.service";
import { ClassesManager } from "@/components/ebd/classes-manager";

export const dynamic = "force-dynamic";

export default async function EbdClassesPage() {
  const user = await requirePermission("ebd.view");
  if (!user.churchId) return null;

  const dataScope = scopeFromUser(user);
  const congregationIds = await scopedCongregationIdsOrNull(dataScope);

  const [congregations, classes] = await Promise.all([
    accessibleCongregations(dataScope),
    listClasses({ churchId: user.churchId, congregationIds }),
  ]);
  const canManage = await can(user, "ebd.manage");

  return (
    <ClassesManager
      classes={classes}
      congregations={congregations.map((item) => ({ id: item.id, name: item.name }))}
      canManage={canManage}
    />
  );
}
