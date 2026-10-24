import { listChurches, listPlans } from "@/services/platform.service";
import { ChurchesManager } from "@/components/platform/churches-manager";

export const dynamic = "force-dynamic";

export default async function SuperAdminChurchesPage() {
  const [churches, plans] = await Promise.all([listChurches(), listPlans()]);

  return <ChurchesManager churches={churches} plans={plans} />;
}
