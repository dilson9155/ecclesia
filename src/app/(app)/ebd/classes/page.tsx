import { redirect } from "next/navigation";
import { requirePermission, can } from "@/lib/rbac";
import { accessibleCongregations, scopeFromUser } from "@/lib/scope";
import { ebdScopeFromUser, isEbdTeacherOnly } from "@/lib/ebd-scope";
import { listClasses } from "@/services/ebd.service";
import { ClassesManager } from "@/components/ebd/classes-manager";

export const dynamic = "force-dynamic";

export default async function EbdClassesPage() {
  const user = await requirePermission("ebd.view");
  if (!user.churchId) return null;
  if (isEbdTeacherOnly(user)) redirect("/ebd");

  const dataScope = scopeFromUser(user);
  const scope = await ebdScopeFromUser(user);

  const [congregations, classes] = await Promise.all([
    accessibleCongregations(dataScope),
    listClasses(scope),
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
