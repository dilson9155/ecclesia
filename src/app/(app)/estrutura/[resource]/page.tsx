import { notFound } from "next/navigation";
import { getResource } from "@/modules/registration/definitions";
import { requirePermission, can } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { listRows, getRelationOptions } from "@/services/registration.service";
import { scopeFromUser } from "@/lib/scope";
import {
  canCreateSede,
  canDeleteSede,
  canManageCongregations,
} from "@/modules/structure/policy";
import { CrudManager } from "@/components/crud/crud-manager";

export const dynamic = "force-dynamic";

export default async function ResourcePage({
  params,
}: {
  params: Promise<{ resource: string }>;
}) {
  const { resource } = await params;
  const def = getResource(resource);
  if (!def) notFound();

  const user = await requirePermission(def.viewPermission);
  if (!user.churchId) notFound();

  const scope = scopeFromUser(user);
  const [rows, relationOptions] = await Promise.all([
    listRows(resource, scope),
    getRelationOptions(resource, scope),
  ]);

  let canCreate = def.canCreate && (await can(user, def.createPermission));
  let canEdit = await can(user, def.editPermission);
  let canDelete = def.canDelete && (await can(user, def.deletePermission));

  if (resource === "sedes") {
    const sedeCount = await prisma.sede.count({
      where: { churchId: user.churchId },
    });
    canCreate = canCreate && canCreateSede(scope) && sedeCount === 0;
    canEdit =
      canEdit &&
      (scope.isSuperAdmin ||
        (Boolean(scope.sedeId) && !scope.congregationId));
    canDelete = canDelete && canDeleteSede(scope);
  } else if (resource === "congregacoes") {
    const manage = canManageCongregations(scope);
    canCreate = canCreate && manage;
    canEdit = canEdit && manage;
    canDelete = canDelete && manage;
  }

  const canWrite = canCreate || canEdit || canDelete;

  return (
    <CrudManager
      resourceKey={def.key}
      singular={def.singular}
      plural={def.plural}
      description={def.description}
      fields={def.fields}
      rows={rows}
      canWrite={canWrite}
      canCreate={canCreate}
      canEdit={canEdit}
      canDelete={canDelete}
      newLabel={def.newLabel}
      relationOptions={relationOptions}
    />
  );
}