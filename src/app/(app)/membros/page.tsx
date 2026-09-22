import { getResource } from "@/modules/registration/definitions";
import { requirePermission, can } from "@/lib/rbac";
import { listRows, getRelationOptions } from "@/services/registration.service";
import { scopeFromUser } from "@/lib/scope";
import { CrudManager } from "@/components/crud/crud-manager";

export const dynamic = "force-dynamic";

export default async function MembrosPage() {
  const def = getResource("membros");
  if (!def) return null;

  const user = await requirePermission(def.viewPermission);
  if (!user.churchId) return null;

  const [rows, relationOptions] = await Promise.all([
    listRows("membros", scopeFromUser(user)),
    getRelationOptions("membros", scopeFromUser(user)),
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
      />
    </div>
  );
}