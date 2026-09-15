import { prisma } from "@/lib/prisma";
import { requirePermission, can } from "@/lib/rbac";
import { LivroCaixaClient } from "@/components/livro-caixa-client";

export const dynamic = "force-dynamic";

export default async function LivroCaixaPage() {
  const user = await requirePermission("livroCaixa.view");
  if (!user.churchId) return null;
  const canExport = await can(user, "livroCaixa.export");

  const entries = await prisma.cashEntry.findMany({
    where: { churchId: user.churchId },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    include: {
      account: { select: { name: true } },
      costCenter: { select: { name: true } },
      congregation: { select: { name: true } },
    },
  });

  const rows = entries.map((e) => ({
    id: e.id,
    date: e.date.toISOString().slice(0, 10),
    description: e.description,
    nature: e.nature,
    value: e.value.toString(),
    document: e.document,
    account: e.account?.name ?? null,
    costCenter: e.costCenter?.name ?? null,
    congregation: e.congregation?.name ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Livro Caixa</h1>
        <p className="text-sm text-muted-foreground">
          Extrato de entradas e saídas contábeis
        </p>
      </div>
      <LivroCaixaClient rows={rows} canExport={canExport} />
    </div>
  );
}