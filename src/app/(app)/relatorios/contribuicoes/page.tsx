import { Download, FileSpreadsheet, FileText } from "lucide-react";
import Link from "next/link";
import { requirePermission, can } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  fetchCongregations,
  defaultRange,
  getContributionsReport,
} from "@/services/reports.service";
import { formatDate, formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ from?: string; to?: string; congregationId?: string; type?: string }>;
};

export default async function RelatorioContribuicoesPage({ searchParams }: Props) {
  const user = await requirePermission("relatorios.view");
  if (!user.churchId) return null;
  const canExport = await can(user, "relatorios.export");

  const { from: fromDefault, to: toDefault } = defaultRange();
  const sp = await searchParams;
  const from = sp.from ?? "";
  const to = sp.to ?? "";
  const congregationId = sp.congregationId ?? "";
  const type = sp.type ?? "ambos";

  const [congregations, report] = await Promise.all([
    fetchCongregations(user.churchId),
    getContributionsReport(user.churchId, {
      from: from ? new Date(`${from}T00:00:00`) : undefined,
      to: to ? new Date(`${to}T23:59:59`) : undefined,
      congregationId: congregationId || undefined,
      type,
    }),
  ]);

  const query = new URLSearchParams();
  if (from) query.set("from", from);
  if (to) query.set("to", to);
  if (congregationId) query.set("congregationId", congregationId);
  if (type !== "ambos") query.set("type", type);

  const congLabel =
    congregations.find((c) => c.id === congregationId)?.name ?? "Todas as congregações";
  const typeLabel = type === "dizimos" ? "Dízimos" : type === "ofertas" ? "Ofertas" : "Dízimos e ofertas";
  const rangeLabel = `${
    from ? formatDate(`${from}T12:00:00`) : formatDate(fromDefault)
  } a ${to ? formatDate(`${to}T12:00:00`) : formatDate(toDefault)}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Contribuições</h1>
          <p className="text-sm text-muted-foreground">
            {typeLabel} · {congLabel} · {rangeLabel} · {report.rows.length} lançamento(s)
          </p>
        </div>
        {canExport && (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={`/api/relatorios/contribuicoes?fmt=pdf&${query}`}>
                <FileText className="mr-2 h-4 w-4" /> PDF
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`/api/relatorios/contribuicoes?fmt=xlsx&${query}`}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`/api/relatorios/contribuicoes?fmt=csv&${query}`}>
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
          <label htmlFor="type" className="mb-1 block text-xs font-medium text-muted-foreground">
            Tipo
          </label>
          <select
            id="type"
            name="type"
            defaultValue={type}
            className="rounded-md border bg-background px-3 py-1.5 text-sm"
          >
            <option value="ambos">Dízimos e ofertas</option>
            <option value="dizimos">Dízimos</option>
            <option value="ofertas">Ofertas</option>
          </select>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Dízimos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatMoney(report.totals.tithe, true)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ofertas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatMoney(report.totals.offering, true)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatMoney(report.totals.total, true)}</p>
          </CardContent>
        </Card>
      </div>

      {report.rows.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Nenhuma contribuição encontrada para o período.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Total por contribuinte</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="p-2">Contribuinte</th>
                      <th className="p-2">Código</th>
                      <th className="p-2">Congregação</th>
                      <th className="p-2 text-right">Dízimos (R$)</th>
                      <th className="p-2 text-right">Ofertas (R$)</th>
                      <th className="p-2 text-right">Total (R$)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.perMember.map((m) => (
                      <tr key={m.memberId} className="border-t">
                        <td className="p-2 font-medium">{m.name}</td>
                        <td className="p-2">{m.code || "—"}</td>
                        <td className="p-2">{m.congregation}</td>
                        <td className="p-2 text-right">{m.tithe ? formatMoney(m.tithe, true) : "—"}</td>
                        <td className="p-2 text-right">{m.offering ? formatMoney(m.offering, true) : "—"}</td>
                        <td className="p-2 text-right font-medium">{formatMoney(m.total, true)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lançamentos do período</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="p-2">Data</th>
                      <th className="p-2">Tipo</th>
                      <th className="p-2">Membro/Contribuinte</th>
                      <th className="p-2">Congregação</th>
                      <th className="p-2 text-right">Valor (R$)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map((r, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{formatDate(`${r.date}T12:00:00`)}</td>
                        <td className="p-2">{r.kind}</td>
                        <td className="p-2">{r.contributor}</td>
                        <td className="p-2">{r.congregation}</td>
                        <td className="p-2 text-right">{formatMoney(r.value, true)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t bg-muted/50 font-medium">
                    <tr>
                      <td colSpan={4} className="p-2">
                        Total
                      </td>
                      <td className="p-2 text-right">{formatMoney(report.totals.total, true)}</td>
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