import {
  currentReferenceMonth,
  getChargeOverview,
  listCharges,
} from "@/services/charges.service";
import { listChurches } from "@/services/platform.service";
import { ChargesManager } from "@/components/platform/charges-manager";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ q?: string; status?: string; month?: string }>;
};

export default async function SuperAdminChargesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const filter = {
    q: sp.q ?? "",
    status: sp.status ?? "TODAS",
    month: sp.month ?? "",
  };

  const [charges, overview, churches] = await Promise.all([
    listCharges({
      search: filter.q,
      status: filter.status,
      month: filter.month,
    }),
    getChargeOverview(),
    listChurches(),
  ]);

  const churchOptions = churches.map((church) => ({
    id: church.id,
    name: church.name,
    planId: church.subscription?.planId ?? null,
    planName: church.subscription?.planName ?? null,
    price: church.subscription?.price ?? 0,
  }));

  return (
    <ChargesManager
      charges={charges}
      overview={overview}
      churches={churchOptions}
      referenceMonth={currentReferenceMonth()}
      filter={filter}
    />
  );
}
