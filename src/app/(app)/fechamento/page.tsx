import { prisma } from "@/lib/prisma";
import { requirePermission, can } from "@/lib/rbac";
import { FechamentoManager } from "@/components/fechamento-manager";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ year?: string; month?: string }> };

export default async function FechamentoPage({ searchParams }: Props) {
  const user = await requirePermission("fechamento.view");
  if (!user.churchId) return null;

  const canClose = await can(user, "fechamento.fechar");
  const canReopen = await can(user, "fechamento.reabrir");

  const now = new Date();
  const sp = await searchParams;
  const year = Number(sp.year) || now.getFullYear();
  const month = Number(sp.month) || now.getMonth() + 1;

  const congregations = await prisma.congregation.findMany({
    where: { churchId: user.churchId },
    orderBy: { name: "asc" },
  });

  const closings = await prisma.financialClosing.findMany({
    where: { churchId: user.churchId, year, month },
  });
  const closingMap = new Map(closings.map((c) => [c.congregationId, c]));

  const rows = congregations.map((cong) => {
    const c = closingMap.get(cong.id);
    return {
      congregationId: cong.id,
      congregationName: cong.name,
      status: (c?.status ?? "ABERTO") as "ABERTO" | "FECHADO",
      revenue: c?.revenue?.toString() ?? null,
      expense: c?.expense?.toString() ?? null,
      balance: c?.balance?.toString() ?? null,
      observations: c?.observations ?? null,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-lg font-semibold">Fechamento Mensal</h1>
          <p className="text-sm text-muted-foreground">
            Controle de fechamento do período {String(month).padStart(2, "0")}/{year}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <a
            href={`?year=${month === 1 ? year - 1 : year}&month=${month === 1 ? 12 : month - 1}`}
            className="rounded border px-2 py-1 hover:bg-muted"
          >
            ← Anterior
          </a>
          <span className="font-medium">{String(month).padStart(2, "0")}/{year}</span>
          <a
            href={`?year=${month === 12 ? year + 1 : year}&month=${month === 12 ? 1 : month + 1}`}
            className="rounded border px-2 py-1 hover:bg-muted"
          >
            Próximo →
          </a>
        </div>
      </div>
      <FechamentoManager
        rows={rows}
        year={year}
        month={month}
        canClose={canClose}
        canReopen={canReopen}
      />
    </div>
  );
}