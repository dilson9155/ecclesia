import { getResource } from "@/modules/registration/definitions";
import { requirePermission, can } from "@/lib/rbac";
import { listRows, getRelationOptions } from "@/services/registration.service";
import { getTitheBatchOptions } from "@/services/tithe-batch.service";
import { scopeFromUser } from "@/lib/scope";
import { CrudManager } from "@/components/crud/crud-manager";
import { TitheBatch } from "@/components/dizimos/tithe-batch";

export const dynamic = "force-dynamic";

export default async function DizimosPage() {
  const def = getResource("dizimos");
  if (!def) return null;

  const user = await requirePermission(def.viewPermission);
  if (!user.churchId) return null;

  const scope = scopeFromUser(user);
  const [rows, relationOptions, batchOptions, canCreate, canEdit, canDelete] =
    await Promise.all([
      listRows("dizimos", scope),
      getRelationOptions("dizimos", scope),
      getTitheBatchOptions(scope),
      can(user, def.createPermission),
      can(user, def.editPermission),
      can(user, def.deletePermission),
    ]);

  const canWrite = canCreate || canEdit || canDelete;

  return (
    <div className="space-y-6">
      <TitheBatch
        congregations={batchOptions.congregations}
        members={batchOptions.members}
        accounts={batchOptions.accounts}
        costCenters={batchOptions.costCenters}
        canCreate={canCreate}
      />
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
        relationOptions={relationOptions}
      />
    </div>
  );
}