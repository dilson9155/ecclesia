import { Download, FileSpreadsheet, FileText } from "lucide-react";
import Link from "next/link";
import { requirePermission, can } from "@/lib/rbac";
import { scopeFromUser, scopedCongregationIdsOrNull } from "@/lib/scope";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MonthlyCashflowChart } from "@/components/reports/charts";
import {
  fetchCongregations,
  defaultRange,
  getFinancialReport,
} from "@/services/reports.service";
import { formatDate, formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ from?: string; to?: string; congregationId?: string }>;
};

export default async function RelatorioFinanceiroPage({ searchParams }: Props) {
  const user = await requirePermission("relatorios.view");
  if (!user.churchId) return null;
  const canExport = await can(user, "relatorios.export");

  const { from: fromDefault, to: toDefault } = defaultRange();
  const sp = await searchParams;
  const from = sp.from ?? "";
  const to = sp.to ?? "";
  const requestedCongregationId = sp.congregationId ?? "";

  const scope = scopeFromUser(user);
  const allowedIds = await scopedCongregationIdsOrNull(scope);
  const congregationId =
    allowedIds === null || allowedIds.includes(requestedCongregationId)
      ? requestedCongregationId
      : "";

  const [congregations, report] = await Promise.all([
    fetchCongregations(scope),
    getFinancialReport(user.churchId, {
      from: from ? new Date(`${from}T00:00:00`) : undefined,
      to: to ? new Date(`${to}T23:59:59`) : undefined,
      congregationId: congregationId || undefined,
      congregationIds: allowedIds,
    }),
  ]);

  const query = new URLSearchParams();
  if (from) query.set("from", from);
  if (to) query.set("to", to);
  if (congregationId) query.set("congregationId", congregationId);

  const congLabel =
    congregations.find((c) => c.id === congregationId)?.name ?? "Todas as congregações";
  const rangeLabel = `${
    from ? formatDate(`${from}T12:00:00`) : formatDate(fromDefault)
  } a ${to ? formatDate(`${to}T12:00:00`) : formatDate(toDefault)}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Relatório Financeiro</h1>
          <p className="text-sm text-muted-foreground">
            {congLabel} · {rangeLabel}
          </p>
        </div>
        {canExport && (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={`/api/relatorios/financeiro?fmt=pdf&${query}`}>
                <FileText className="mr-2 h-4 w-4" /> PDF
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`/api/relatorios/financeiro?fmt=xlsx&${query}`}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`/api/relatorios/financeiro?fmt=csv&${query}`}>
                <Download className="mr-2 h-4 w-4" /> CSV
              </a>
            </Button>
          </div>
        )}
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="from" className="mb-1 block text-xs font-medium text-muted-foreground">
            De
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={from}
            className="rounded-md border bg-background px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label htmlFor="to" className="mb-1 block text-xs font-medium text-muted-foreground">
            Até
          </label>
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={to}
            className="rounded-md border bg-background px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label htmlFor="congregationId" className="mb-1 block text-xs font-medium text-muted-foreground">
            Congregação
          </label>
          <select
            id="congregationId"
            name="congregationId"
            defaultValue={congregationId}
            className="rounded-md border bg-background px-3 py-1.5 text-sm"
          >
            <option value="">Todas</option>
            {congregations.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" size="sm">
          Filtrar
        </Button>
      </form>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Entradas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-600">{formatMoney(report.totals.revenue, true)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saídas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{formatMoney(report.totals.expense, true)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo do período</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatMoney(report.totals.balance, true)}</p>
          </CardContent>
        </Card>
      </div>

      {report.monthly.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Nenhum lançamento encontrado para o período.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fluxo mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <MonthlyCashflowChart data={report.monthly} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Movimentação por conta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="p-2">Conta</th>
                      <th className="p-2">Natureza</th>
                      <th className="p-2 text-right">Entradas (R$)</th>
                      <th className="p-2 text-right">Saídas (R$)</th>
                      <th className="p-2 text-right">Saldo (R$)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map((r) => (
                      <tr key={r.name} className="border-t">
                        <td className="p-2 font-medium">{r.name}</td>
                        <td className="p-2">
                          {r.nature === "ENTRADA" ? "Receita" : "Despesa"}
                        </td>
                        <td className="p-2 text-right">{formatMoney(r.revenue, true)}</td>
                        <td className="p-2 text-right">{formatMoney(r.expense, true)}</td>
                        <td className="p-2 text-right font-medium">{formatMoney(r.balance, true)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t bg-muted/50 font-medium">
                    <tr>
                      <td colSpan={2} className="p-2">
                        Total
                      </td>
                      <td className="p-2 text-right">{formatMoney(report.totals.revenue, true)}</td>
                      <td className="p-2 text-right">{formatMoney(report.totals.expense, true)}</td>
                      <td className="p-2 text-right">{formatMoney(report.totals.balance, true)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <p className="text-xs text-muted-foreground">
        <Link href="/relatorios" className="underline">
          ← Voltar aos relatórios
        </Link>
      </p>
    </div>
  );
}