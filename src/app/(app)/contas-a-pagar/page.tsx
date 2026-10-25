import { requirePermission, can } from "@/lib/rbac";
import { scopeFromUser } from "@/lib/scope";
import {
  PAYABLE_STATUS_FILTERS,
  listPayableOptions,
  listPayables,
  type PayableStatusFilter,
} from "@/services/payables.service";
import { PayablesManager } from "@/components/financeiro/payables-manager";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    congregationId?: string;
    from?: string;
    to?: string;
  }>;
};

function todayIso(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default async function ContasAPagarPage({ searchParams }: Props) {
  const user = await requirePermission("saidas.view");
  if (!user.churchId) return null;

  const sp = await searchParams;
  const status: PayableStatusFilter = PAYABLE_STATUS_FILTERS.includes(
    (sp.status ?? "") as PayableStatusFilter
  )
    ? ((sp.status ?? "") as PayableStatusFilter)
    : "ABERTAS";

  const scope = scopeFromUser(user);
  const [data, options, canCreate, canEdit, canPay, canCancel] =
    await Promise.all([
      listPayables(user.churchId, scope, {
        search: sp.q,
        status,
        congregationId: sp.congregationId,
        from: sp.from,
        to: sp.to,
      }),
      listPayableOptions(scope, user.churchId),
      can(user, "saidas.create"),
      can(user, "saidas.edit"),
      can(user, "saidas.baixar"),
      can(user, "saidas.cancel"),
    ]);

  return (
    <PayablesManager
      rows={data.rows}
      totals={data.totals}
      options={options}
      filters={{
        q: sp.q ?? "",
        status,
        congregationId: sp.congregationId ?? "",
        from: sp.from ?? "",
        to: sp.to ?? "",
      }}
      permissions={{ canCreate, canEdit, canPay, canCancel }}
      today={todayIso()}
    />
  );
}
