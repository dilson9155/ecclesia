import { redirect } from "next/navigation";
import { requirePermission, can } from "@/lib/rbac";
import { ebdScopeFromUser, isEbdTeacherOnly } from "@/lib/ebd-scope";
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
  if (isEbdTeacherOnly(user)) redirect("/ebd");

  const scope = await ebdScopeFromUser(user);

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
