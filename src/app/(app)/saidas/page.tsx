import { getResource } from "@/modules/registration/definitions";
import { requirePermission, can } from "@/lib/rbac";
import { listRows, getRelationOptions } from "@/services/registration.service";
import { CrudManager } from "@/components/crud/crud-manager";

export const dynamic = "force-dynamic";

export default async function SaidasPage() {
  const def = getResource("saidas");
  if (!def) return null;

  const user = await requirePermission(def.viewPermission);
  if (!user.churchId) return null;

  const [rows, relationOptions] = await Promise.all([
    listRows("saidas", user.churchId),
    getRelationOptions("saidas", user.churchId),
  ]);

  const canWrite =
    (await can(user, def.createPermission)) ||
    (await can(user, def.editPermission)) ||
    (await can(user, def.deletePermission));

  return (
    <div className="space-y-6">
      <CrudManager
        resourceKey={def.key}
        singular={def.singular}
        plural={def.plural}
        description={def.description}
        fields={def.fields}
        rows={rows}
        canWrite={canWrite}
        relationOptions={relationOptions}
        actions={def.actions}
      />
    </div>
  );
}