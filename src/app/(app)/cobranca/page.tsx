import { requirePermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import {
  getChurchChargeSummary,
  listChurchCharges,
} from "@/services/charges.service";
import { ChurchCharges } from "@/components/cobranca/church-charges";

export const dynamic = "force-dynamic";

export default async function CobrancaPage() {
  const user = await requirePermission("config.view");
  if (!user.churchId) return null;

  const [charges, summary, church] = await Promise.all([
    listChurchCharges(user.churchId),
    getChurchChargeSummary(user.churchId),
    prisma.church.findUnique({
      where: { id: user.churchId },
      select: {
        name: true,
        subscription: { select: { plan: { select: { name: true } } } },
      },
    }),
  ]);

  return (
    <ChurchCharges
      charges={charges}
      summary={summary}
      churchName={church?.name ?? "Igreja"}
      planName={church?.subscription?.plan.name ?? null}
    />
  );
}
