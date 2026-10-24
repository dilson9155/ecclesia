import { requirePermission } from "@/lib/rbac";
import { scopeFromUser } from "@/lib/scope";
import { getStructureOverview } from "@/services/structure.service";
import { StructureOverview } from "@/components/estrutura/structure-overview";

export const dynamic = "force-dynamic";

export default async function EstruturaPage() {
  const user = await requirePermission("igrejas.view");
  const data = await getStructureOverview(scopeFromUser(user));

  return <StructureOverview data={data} />;
}
