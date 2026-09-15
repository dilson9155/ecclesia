"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import { closePeriod, reopenPeriod } from "@/app/actions/financial";

type Row = {
  congregationId: string;
  congregationName: string;
  status: "ABERTO" | "FECHADO";
  revenue?: string | null;
  expense?: string | null;
  balance?: string | null;
  observations?: string | null;
};

export function FechamentoManager({
  rows,
  year,
  month,
  canClose,
  canReopen,
}: {
  rows: Row[];
  year: number;
  month: number;
  canClose: boolean;
  canReopen: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [obs, setObs] = useState<Record<string, string>>({});

  async function handleClose(congregationId: string) {
    setBusy(congregationId);
    setError(null);
    const result = await closePeriod(congregationId, year, month, obs[congregationId]);
    setBusy(null);
    if (!result.ok) {
      setError(result.error ?? "Erro ao fechar período.");
      return;
    }
    router.refresh();
  }

  async function handleReopen(congregationId: string) {
    setBusy(congregationId);
    setError(null);
    const result = await reopenPeriod(congregationId, year, month);
    setBusy(null);
    if (!result.ok) {
      setError(result.error ?? "Erro ao reabrir período.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-2">Congregação</th>
              <th className="p-2">Status</th>
              <th className="p-2 text-right">Receita</th>
              <th className="p-2 text-right">Despesa</th>
              <th className="p-2 text-right">Saldo</th>
              <th className="p-2">Observações</th>
              <th className="p-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-center text-muted-foreground">
                  Nenhuma congregação encontrada.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.congregationId} className="border-t">
                <td className="p-2 font-medium">{r.congregationName}</td>
                <td className="p-2">
                  <span className={r.status === "FECHADO" ? "text-emerald-600 font-medium" : "text-muted-foreground"}>
                    {r.status}
                  </span>
                </td>
                <td className="p-2 text-right">
                  {r.revenue != null ? formatMoney(r.revenue, true) : "—"}
                </td>
                <td className="p-2 text-right">
                  {r.expense != null ? formatMoney(r.expense, true) : "—"}
                </td>
                <td className="p-2 text-right font-medium">
                  {r.balance != null ? formatMoney(r.balance, true) : "—"}
                </td>
                <td className="p-2 max-w-[200px] text-xs text-muted-foreground">
                  {r.observations ?? "—"}
                </td>
                <td className="p-2">
                  {r.status === "ABERTO" && canClose && (
                    <div className="flex gap-2">
                      <input
                        className="w-32 rounded border px-2 py-1 text-xs"
                        placeholder="Obs. (opcional)"
                        value={obs[r.congregationId] ?? ""}
                        onChange={(e) =>
                          setObs((o) => ({ ...o, [r.congregationId]: e.target.value }))
                        }
                      />
                      <Button
                        size="sm"
                        disabled={busy === r.congregationId}
                        onClick={() => handleClose(r.congregationId)}
                      >
                        {busy === r.congregationId ? "Fechando..." : "Fechar"}
                      </Button>
                    </div>
                  )}
                  {r.status === "FECHADO" && canReopen && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === r.congregationId}
                      onClick={() => handleReopen(r.congregationId)}
                    >
                      {busy === r.congregationId ? "Reabrindo..." : "Reabrir"}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}