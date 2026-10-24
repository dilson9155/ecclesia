"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import { Download } from "lucide-react";

type Row = {
  id: string;
  date: string;
  description: string;
  nature: "ENTRADA" | "SAIDA";
  value: string;
  document?: string | null;
  account?: string | null;
  costCenter?: string | null;
  congregation?: string | null;
};

function monthKey(dateStr: string) {
  return dateStr.slice(0, 7);
}

function formatMonth(ptBr: string) {
  return ptBr;
}

export function LivroCaixaClient({
  rows,
  canExport,
}: {
  rows: Row[];
  canExport: boolean;
}) {
  const months = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) {
      const mk = monthKey(r.date);
      if (!map.has(mk)) {
        const [y, m] = mk.split("-");
        map.set(mk, `${m}/${y}`);
      }
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [rows]);

  const [selectedMonth, setSelectedMonth] = useState<string>(months[0]?.[0] ?? "");

  const filtered = useMemo(() => {
    const f = rows.filter((r) => monthKey(r.date) === selectedMonth);
    return f.sort((a, b) => a.date.localeCompare(b.date));
  }, [rows, selectedMonth]);

  const rowsWithBalance = filtered.reduce<Array<Row & { balance: number }>>(
    (acc, r) => {
      const prev = acc.length ? acc[acc.length - 1].balance : 0;
      const v = parseFloat(r.value);
      const balance = prev + (r.nature === "ENTRADA" ? v : -v);
      return [...acc, { ...r, balance }];
    },
    []
  );

  const totalEntradas = filtered
    .filter((r) => r.nature === "ENTRADA")
    .reduce((s, r) => s + parseFloat(r.value), 0);
  const totalSaidas = filtered
    .filter((r) => r.nature === "SAIDA")
    .reduce((s, r) => s + parseFloat(r.value), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <label htmlFor="month" className="shrink-0 text-sm font-medium">
            Mês:
          </label>
          <select
            id="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="min-w-0 flex-1 rounded-md border bg-background px-3 py-1.5 text-base sm:flex-none sm:text-sm"
          >
            {months.map(([key, label]) => (
              <option key={key} value={key}>
                {formatMonth(label)}
              </option>
            ))}
          </select>
        </div>
        {canExport && selectedMonth && (
          <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
            <a href={`/api/livro-caixa/export?month=${selectedMonth}`}>
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </a>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3 md:hidden">
        <div className="rounded-lg border bg-card p-2.5">
          <p className="text-[11px] text-muted-foreground">Entradas</p>
          <p className="mt-1 text-sm font-semibold text-emerald-600">
            {formatMoney(totalEntradas, true)}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-2.5">
          <p className="text-[11px] text-muted-foreground">Saídas</p>
          <p className="mt-1 text-sm font-semibold text-destructive">
            {formatMoney(totalSaidas, true)}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-2.5">
          <p className="text-[11px] text-muted-foreground">Saldo</p>
          <p className="mt-1 text-sm font-semibold">
            {formatMoney(totalEntradas - totalSaidas, true)}
          </p>
        </div>
      </div>

      <div className="space-y-2 md:hidden">
        {rowsWithBalance.length === 0 ? (
          <div className="rounded-lg border bg-card px-3 py-8 text-center text-sm text-muted-foreground">
            Nenhum lançamento neste mês.
          </div>
        ) : (
          rowsWithBalance.map((r) => (
            <div key={r.id} className="rounded-lg border bg-card p-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {r.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.date + "T00:00:00").toLocaleDateString("pt-BR")}
                    {r.document ? ` · Doc. ${r.document}` : ""}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-sm font-semibold ${
                    r.nature === "ENTRADA" ? "text-emerald-600" : "text-destructive"
                  }`}
                >
                  {r.nature === "ENTRADA" ? "+" : "−"}
                  {formatMoney(r.value, true)}
                </span>
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-1 text-xs">
                <div>
                  <dt className="text-muted-foreground">Conta</dt>
                  <dd className="truncate font-medium">{r.account ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Centro de custo</dt>
                  <dd className="truncate font-medium">{r.costCenter ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Saldo acumulado</dt>
                  <dd className="font-medium">{formatMoney(r.balance, true)}</dd>
                </div>
              </dl>
            </div>
          ))
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-md border md:block">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-2">Data</th>
              <th className="p-2">Descrição</th>
              <th className="p-2">Nº Documento</th>
              <th className="p-2">Conta</th>
              <th className="p-2">Centro Custo</th>
              <th className="p-2 text-right">Entrada (R$)</th>
              <th className="p-2 text-right">Saída (R$)</th>
              <th className="p-2 text-right">Saldo (R$)</th>
            </tr>
          </thead>
          <tbody>
            {rowsWithBalance.length === 0 && (
              <tr>
                <td colSpan={8} className="p-4 text-center text-muted-foreground">
                  Nenhum lançamento neste mês.
                </td>
              </tr>
            )}
            {rowsWithBalance.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{new Date(r.date + "T00:00:00").toLocaleDateString("pt-BR")}</td>
                <td className="p-2">{r.description}</td>
                <td className="p-2">{r.document ?? "—"}</td>
                <td className="p-2">{r.account ?? "—"}</td>
                <td className="p-2">{r.costCenter ?? "—"}</td>
                <td className="p-2 text-right">
                  {r.nature === "ENTRADA" ? formatMoney(r.value, true) : ""}
                </td>
                <td className="p-2 text-right">
                  {r.nature === "SAIDA" ? formatMoney(r.value, true) : ""}
                </td>
                <td className="p-2 text-right font-medium">
                  {formatMoney(r.balance, true)}
                </td>
              </tr>
            ))}
          </tbody>
          {filtered.length > 0 && (
            <tfoot className="border-t bg-muted/50 font-medium">
              <tr>
                <td colSpan={5} className="p-2">Total do mês</td>
                <td className="p-2 text-right">{formatMoney(totalEntradas, true)}</td>
                <td className="p-2 text-right">{formatMoney(totalSaidas, true)}</td>
                <td className="p-2 text-right">{formatMoney(totalEntradas - totalSaidas, true)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}