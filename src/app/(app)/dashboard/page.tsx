import { Building2, HandCoins, TrendingDown, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { scopeFromUser, scopedCongregationIdsOrNull, congregationWhere } from "@/lib/scope";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MonthlyCashflowChart, DistributionPie } from "@/components/reports/charts";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function DashboardPage() {
  const user = await requireAuth();

  const church = user.churchId
    ? await prisma.church.findUnique({
        where: { id: user.churchId },
        include: { sedes: { where: { status: "ATIVO" } } },
      })
    : null;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const scope = scopeFromUser(user);
  const allowedIds = await scopedCongregationIdsOrNull(scope);
  const dataWhere = await congregationWhere(scope);
  const congregationWhereCount = allowedIds === null
    ? { churchId: user.churchId }
    : { id: { in: allowedIds.length ? allowedIds : ["__none__"] } };

  const [
    congregations,
    members,
    pendingExpenses,
    titheAgg,
    offeringAgg,
    incomeAgg,
    expenseAgg,
    situationGroups,
    cashflowEntries,
  ] = user.churchId
    ? await Promise.all([
        prisma.congregation.count({ where: congregationWhereCount as never }),
        prisma.member.count({ where: dataWhere as never }),
        prisma.expense.count({
          where: { ...dataWhere, status: "PENDENTE" } as never,
        }),
        prisma.tithe.aggregate({
          where: { ...dataWhere, date: { gte: monthStart, lt: monthEnd } } as never,
          _sum: { value: true },
        }),
        prisma.offering.aggregate({
          where: { ...dataWhere, date: { gte: monthStart, lt: monthEnd } } as never,
          _sum: { value: true },
        }),
        prisma.cashEntry.aggregate({
          where: { ...dataWhere, date: { gte: monthStart, lt: monthEnd }, nature: "ENTRADA" } as never,
          _sum: { value: true },
        }),
        prisma.cashEntry.aggregate({
          where: { ...dataWhere, date: { gte: monthStart, lt: monthEnd }, nature: "SAIDA" } as never,
          _sum: { value: true },
        }),
        prisma.member.groupBy({
          by: ["situation"],
          where: dataWhere as never,
          _count: { _all: true },
        }),
        prisma.cashEntry.findMany({
          where: { ...dataWhere, date: { gte: sixMonthsAgo } } as never,
          select: { date: true, nature: true, value: true },
        }),
      ])
    : [0, 0, 0, { _sum: { value: null } }, { _sum: { value: null } }, { _sum: { value: null } }, { _sum: { value: null } }, [], []];

  const contributions = Number(titheAgg._sum.value ?? 0) + Number(offeringAgg._sum.value ?? 0);
  const monthRevenue = Number(incomeAgg._sum.value ?? 0);
  const monthExpense = Number(expenseAgg._sum.value ?? 0);

  const cashflow = new Map<string, { month: string; revenue: number; expense: number }>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    cashflow.set(monthKey(d), { month: monthKey(d), revenue: 0, expense: 0 });
  }
  for (const e of cashflowEntries as Array<{ date: Date; nature: string; value: unknown }>) {
    const mk = monthKey(e.date);
    const cur = cashflow.get(mk);
    if (!cur) continue;
    if (e.nature === "ENTRADA") cur.revenue += Number(e.value);
    else cur.expense += Number(e.value);
  }

  const situationData = (situationGroups as Array<{ situation: string; _count: { _all: number } }>).map((g) => ({
    label: g.situation,
    value: g._count._all,
  }));

  const cards = [
    { title: "Congregações", value: congregations, icon: Building2 },
    { title: "Membros", value: members, icon: Users },
    { title: "Saídas pendentes", value: pendingExpenses, icon: TrendingDown },
    {
      title: "Contribuições do mês",
      value: formatMoney(contributions, true),
      icon: HandCoins,
      money: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Bem-vindo{user.name ? `, ${user.name.split(" ")[0]}` : ""}!
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {church?.name ?? "Sistema"} · {church?.sedes[0]?.name ?? "Sede"} ·{" "}
          {now.toLocaleDateString("pt-BR")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className={`size-4 ${"money" in card && card.money ? "text-primary" : "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fluxo de caixa — últimos 6 meses</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyCashflowChart data={Array.from(cashflow.values())} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Membros por situação</CardTitle>
          </CardHeader>
          <CardContent>
            {situationData.length === 0 ? (
              <p className="py-20 text-center text-sm text-muted-foreground">
                Nenhum membro cadastrado ainda.
              </p>
            ) : (
              <DistributionPie data={situationData} />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resultado do mês (caixa)</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Entradas</p>
              <p className="text-lg font-semibold text-emerald-600">{formatMoney(monthRevenue, true)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Saídas</p>
              <p className="text-lg font-semibold text-red-600">{formatMoney(monthExpense, true)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Saldo</p>
              <p className="text-lg font-semibold">{formatMoney(monthRevenue - monthExpense, true)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Acesso rápido</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/membros">Membros</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dizimos">Dízimos</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/livro-caixa">Livro caixa</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/relatorios">Relatórios</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/fechamento">Fechamento</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}