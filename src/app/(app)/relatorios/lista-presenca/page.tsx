import { Fragment } from "react";
import { FileText } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission, can } from "@/lib/rbac";
import { scopeFromUser, scopedCongregationIdsOrNull } from "@/lib/scope";
import { formatCpf } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  fetchCongregations,
  getMemberReport,
  kindLabel,
} from "@/services/reports.service";

export const dynamic = "force-dynamic";

const SITUATIONS = [
  "ATIVO",
  "INATIVO",
  "TRANSFERIDO",
  "DESLIGADO",
  "FALECIDO",
] as const;

type Props = {
  searchParams: Promise<{
    subject?: string;
    date?: string;
    congregationId?: string | string[];
    situation?: string;
    fmt?: string;
  }>;
};

function toList(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value];
}

function todayIso(): string {
  // Datas da lista seguem o fuso de Brasília, independentemente do servidor.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function parseDate(value: string | undefined, fallback: string): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  return value;
}

function formatIsoDate(value: string): string {
  const date = new Date(`${value}T12:00:00-03:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
      }).format(date);
}

function groupRows(rows: Array<{ name: string; code: string; cpf: string | null; congregation: string }>) {
  const groups: Array<{
    congregation: string;
    rows: typeof rows;
  }> = [];

  for (const row of rows) {
    const last = groups[groups.length - 1];
    if (last && last.congregation === row.congregation) {
      last.rows.push(row);
    } else {
      groups.push({ congregation: row.congregation, rows: [row] });
    }
  }

  return groups;
}

export default async function ListaPresencaPage({ searchParams }: Props) {
  const user = await requirePermission("relatorios.view");
  if (!user.churchId) return null;
  const canExport = await can(user, "relatorios.export");

  const sp = await searchParams;
  const subject = (sp.subject ?? "").trim();
  const requestedSituation = sp.situation ?? "ATIVO";
  const situation =
    requestedSituation === "TODOS" ||
    SITUATIONS.includes(requestedSituation as (typeof SITUATIONS)[number])
      ? requestedSituation
      : "ATIVO";
  const date = parseDate(sp.date, todayIso());
  const requestedIds = toList(sp.congregationId);

  const scope = scopeFromUser(user);
  const allowedIds = await scopedCongregationIdsOrNull(scope);
  const selectedIds =
    allowedIds === null
      ? requestedIds
      : requestedIds.filter((id) => allowedIds.includes(id));

  if (sp.fmt === "pdf") {
    if (!canExport) redirect("/forbidden");
    const params = new URLSearchParams();
    if (subject) params.set("subject", subject);
    params.set("date", date);
    for (const id of selectedIds) params.append("congregationId", id);
    if (situation) params.set("situation", situation);
    redirect(`/api/relatorios/lista-presenca?${params.toString()}`);
  }

  const [congregations, report] = await Promise.all([
    fetchCongregations(scope),
    getMemberReport(user.churchId, {
      congregationIds: allowedIds,
      selectedCongregationIds: selectedIds,
      situation: situation === "TODOS" ? undefined : situation || undefined,
    }),
  ]);

  const selectedNames =
    selectedIds.length > 0
      ? congregations
          .filter((c) => selectedIds.includes(c.id))
          .map((c) => c.name)
      : [];
  const congregationLabel =
    selectedNames.length > 0
      ? selectedNames.join(", ")
      : "Todas as congregações";
  const situationLabel =
    situation === "TODOS" ? "Todos os membros" : kindLabel("situation", situation);
  const groupedRows = groupRows(report.rows);
  const groups = groupedRows.map((group, groupIndex) => ({
    ...group,
    start: groupedRows
      .slice(0, groupIndex)
      .reduce((sum, item) => sum + item.rows.length, 0),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Lista de Presença</h1>
          <p className="text-sm text-muted-foreground">
            {subject ? `${subject} · ` : ""}
            {formatIsoDate(date)} · {congregationLabel} · {situationLabel} ·{" "}
            {report.total} membro(s)
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados da lista</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="get" className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
              <div className="space-y-1">
                <label
                  htmlFor="subject"
                  className="block text-xs font-medium text-muted-foreground"
                >
                  Do que se trata esta lista *
                </label>
                <input
                  id="subject"
                  name="subject"
                  defaultValue={subject}
                  placeholder="Ex.: Assembleia Geral Ordinária, Culto de Santa Ceia, Reunião de Jovens..."
                  required
                  className="w-full rounded-md border bg-background px-3 py-2 text-base sm:text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Esse texto aparece em destaque no cabeçalho da lista.
                </p>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="date"
                  className="block text-xs font-medium text-muted-foreground"
                >
                  Data da lista
                </label>
                <input
                  id="date"
                  name="date"
                  type="date"
                  defaultValue={date}
                  className="w-full rounded-md border bg-background px-3 py-2 text-base sm:text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <span className="block text-xs font-medium text-muted-foreground">
                Congregações
              </span>
              {congregations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma congregação disponível no seu acesso.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {congregations.map((congregation) => (
                    <label
                      key={congregation.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        name="congregationId"
                        value={congregation.id}
                        defaultChecked={selectedIds.includes(congregation.id)}
                        className="size-4 rounded border-input"
                      />
                      <span className="min-w-0 truncate">{congregation.name}</span>
                    </label>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Deixe todas desmarcadas para incluir todas as congregações do
                seu acesso.
              </p>
            </div>

            <div className="space-y-1 sm:max-w-xs">
              <label
                htmlFor="situation"
                className="block text-xs font-medium text-muted-foreground"
              >
                Situação dos membros
              </label>
              <select
                id="situation"
                name="situation"
                defaultValue={situation}
                className="w-full rounded-md border bg-background px-3 py-2 text-base sm:text-sm"
              >
                <option value="ATIVO">Somente ativos</option>
                <option value="TODOS">Todos</option>
                {SITUATIONS.filter((s) => s !== "ATIVO").map((s) => (
                  <option key={s} value={s}>
                    {kindLabel("situation", s)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="submit" className="w-full sm:w-auto">
                Atualizar lista
              </Button>
              {canExport && (
                <Button
                  type="submit"
                  name="fmt"
                  value="pdf"
                  variant="outline"
                  formTarget="_blank"
                  className="w-full sm:w-auto"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Gerar PDF
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {report.total === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Nenhum membro encontrado. Ajuste as congregações ou a situação e
            atualize a lista.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-2 text-center">Nº</th>
                <th className="p-2">Nome do membro</th>
                <th className="p-2">Rol</th>
                <th className="p-2">CPF</th>
                <th className="p-2">Congregação</th>
                <th className="p-2">Assinatura</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <Fragment key={group.congregation}>
                  <tr className="border-t bg-muted/30">
                    <td
                      colSpan={6}
                      className="p-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {group.congregation}
                      <span className="ml-2 font-normal normal-case">
                        ({group.rows.length} membro(s))
                      </span>
                    </td>
                  </tr>
                  {group.rows.map((row, index) => (
                    <tr
                      key={`${group.congregation}-${row.code}-${row.name}`}
                      className="border-t"
                    >
                      <td className="p-2 text-center">{group.start + index + 1}</td>
                      <td className="p-2 font-medium">{row.name}</td>
                      <td className="p-2">{row.code}</td>
                      <td className="p-2">{formatCpf(row.cpf)}</td>
                      <td className="p-2">{row.congregation}</td>
                      <td className="p-2 text-muted-foreground">—</td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        <Link href="/relatorios" className="underline">
          ← Voltar aos relatórios
        </Link>
      </p>
    </div>
  );
}
