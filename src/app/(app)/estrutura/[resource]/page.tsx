import { notFound } from "next/navigation";
import { getResource } from "@/modules/registration/definitions";
import { requirePermission, can } from "@/lib/rbac";
import { listRows, getRelationOptions } from "@/services/registration.service";
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

  const [rows, relationOptions] = await Promise.all([
    listRows(resource, user.churchId),
    getRelationOptions(resource, user.churchId),
  ]);

  const canWrite =
    (await can(user, def.createPermission)) ||
    (await can(user, def.editPermission)) ||
    (await can(user, def.deletePermission));

  return (
    <CrudManager
      resourceKey={def.key}
      singular={def.singular}
      plural={def.plural}
      description={def.description}
      fields={def.fields}
      rows={rows}
      canWrite={canWrite}
      relationOptions={relationOptions}
    />
  );
}