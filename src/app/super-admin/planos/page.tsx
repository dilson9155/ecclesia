import { listPlans } from "@/services/platform.service";
import { PlansManager } from "@/components/platform/plans-manager";

export const dynamic = "force-dynamic";

export default async function SuperAdminPlansPage() {
  const plans = await listPlans();

  return <PlansManager plans={plans} />;
}
