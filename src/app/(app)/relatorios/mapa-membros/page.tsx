import { Download, FileSpreadsheet, FileText } from "lucide-react";
import Link from "next/link";
import { requirePermission, can } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DistributionPie } from "@/components/reports/charts";
import {
  fetchCongregations,
  getMemberReport,
  kindLabel,
} from "@/services/reports.service";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const SITUATIONS = ["ATIVO", "INATIVO", "TRANSFERIDO", "DESLIGADO", "FALECIDO"] as const;

type Props = {
  searchParams: Promise<{ congregationId?: string; situation?: string }>;
};

export default async function MapaMembrosPage({ searchParams }: Props) {
  const user = await requirePermission("relatorios.view");
  if (!user.churchId) return null;
  const canExport = await can(user, "relatorios.export");

  const sp = await searchParams;
  const congregationId = sp.congregationId ?? "";
  const situation = sp.situation ?? "";

  const [congregations, report] = await Promise.all([
    fetchCongregations(user.churchId),
    getMemberReport(user.churchId, {
      congregationId: congregationId || undefined,
      situation: situation || undefined,
    }),
  ]);

  const query = new URLSearchParams();
  if (congregationId) query.set("congregationId", congregationId);
  if (situation) query.set("situation", situation);

  const distribution = Object.entries(report.bySituation).map(([label, value]) => ({ label, value }));

  const congLabel =
    congregations.find((c) => c.id === congregationId)?.name ?? "Todas as congregações";
  const situationLabel = situation ? kindLabel("situation", situation) : "Todos";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Mapa de Membros</h1>
          <p className="text-sm text-muted-foreground">
            {congLabel} · {situationLabel} · {report.total} registro(s)
          </p>
        </div>
        {canExport && (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={`/api/relatorios/mapa-membros?fmt=pdf&${query}`}>
                <FileText className="mr-2 h-4 w-4" /> PDF
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`/api/relatorios/mapa-membros?fmt=xlsx&${query}`}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`/api/relatorios/mapa-membros?fmt=csv&${query}`}>
                <Download className="mr-2 h-4 w-4" /> CSV
              </a>
            </Button>
          </div>
        )}
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3">
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
        <div>
          <label htmlFor="situation" className="mb-1 block text-xs font-medium text-muted-foreground">
            Situação
          </label>
          <select
            id="situation"
            name="situation"
            defaultValue={situation}
            className="rounded-md border bg-background px-3 py-1.5 text-sm"
          >
            <option value="">Todos</option>
            {SITUATIONS.map((s) => (
              <option key={s} value={s}>
                {kindLabel("situation", s)}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" size="sm" variant="default">
          Filtrar
        </Button>
      </form>

      {report.total === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Nenhum membro encontrado para os filtros informados.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[["Total", report.total, ""], ...Object.entries(report.bySituation)].map(
              ([label, value, extra]) => (
                <Card key={label}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {extra ? `${label} (${extra})` : label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{value}</p>
                  </CardContent>
                </Card>
              )
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribuição por situação</CardTitle>
            </CardHeader>
            <CardContent>
              <DistributionPie data={distribution} />
            </CardContent>
          </Card>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-2">Código</th>
                  <th className="p-2">Nome</th>
                  <th className="p-2">Congregação</th>
                  <th className="p-2">Situação</th>
                  <th className="p-2">Sexo</th>
                  <th className="p-2">Estado Civil</th>
                  <th className="p-2">Cidade</th>
                  <th className="p-2">Nascimento</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((r) => (
                  <tr key={`${r.code}-${r.name}`} className="border-t">
                    <td className="p-2">{r.code}</td>
                    <td className="p-2 font-medium">{r.name}</td>
                    <td className="p-2">{r.congregation}</td>
                    <td className="p-2">{kindLabel("situation", r.situation)}</td>
                    <td className="p-2">{kindLabel("gender", r.gender)}</td>
                    <td className="p-2">{kindLabel("maritalStatus", r.maritalStatus)}</td>
                    <td className="p-2">{r.city ?? "—"}</td>
                    <td className="p-2">{r.birthDate ? formatDate(r.birthDate) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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