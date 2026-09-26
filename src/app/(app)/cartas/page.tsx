import { requirePermission, can } from "@/lib/rbac";
import { scopeFromUser, scopedCongregationIdsOrNull } from "@/lib/scope";
import {
  listLetters,
  getTemplates,
  getMemberOptions,
} from "@/services/documents.service";
import { CartasManager } from "@/components/cartas/cartas-manager";

export const dynamic = "force-dynamic";

export default async function CartasPage() {
  const user = await requirePermission("cartas.view");
  if (!user.churchId) return null;

  const congregationIds = await scopedCongregationIdsOrNull(scopeFromUser(user));
  const [letters, templates, members] = await Promise.all([
    listLetters(user.churchId, congregationIds),
    getTemplates(user.churchId),
    getMemberOptions(user.churchId, congregationIds),
  ]);

  return (
    <CartasManager
      letters={letters as never}
      templates={templates as never}
      members={members as never}
      canCreate={await can(user, "cartas.create")}
      canDelete={await can(user, "cartas.delete")}
    />
  );
}