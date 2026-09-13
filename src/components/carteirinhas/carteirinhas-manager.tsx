"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { CreditCard, Download, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SELECT_INPUT_CLASS } from "@/lib/styles";
import { emitCard, cancelCardById } from "@/app/actions/cards";

type CardRow = {
  id: string;
  cardNumber: string | null;
  issueDate: Date;
  validityDate: Date | null;
  status: "ATIVO" | "CANCELADO";
  member: { id: string; name: string; code: string } | null;
  congregation: { id: string; name: string } | null;
};

type MemberOption = {
  id: string;
  name: string;
  code: string;
  congregation: { name: string } | null;
};

type Props = {
  cards: CardRow[];
  members: MemberOption[];
  canEmit: boolean;
  canCancel: boolean;
};

function formatDate(d?: Date | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

const STATUS_STYLES: Record<string, string> = {
  ATIVO: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELADO: "bg-destructive/10 text-destructive border-destructive/20",
};

export function CarteirinhasManager({ cards, members, canEmit, canCancel }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [cancelling, setCancelling] = useState<CardRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<{ memberId: string }>({
    defaultValues: { memberId: "" },
  });

  async function handleEmit(values: { memberId: string }) {
    if (!values.memberId) {
      setError("Selecione um membro.");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await emitCard(values.memberId);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Erro ao emitir carteirinha.");
      return;
    }
    form.reset();
    setOpen(false);
    router.refresh();
  }

  async function handleCancel() {
    if (!cancelling) return;
    setBusy(true);
    setError(null);
    const result = await cancelCardById(cancelling.id);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Erro ao cancelar carteirinha.");
      return;
    }
    setCancelling(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Carteirinhas</h1>
          <p className="text-sm text-muted-foreground">
            Emissão, cancelamento e download das carteirinhas de membros
          </p>
        </div>
        {canEmit && (
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Emitir carteirinha
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Nº</th>
                <th className="px-4 py-2.5 font-medium">Membro</th>
                <th className="px-4 py-2.5 font-medium">Matrícula</th>
                <th className="px-4 py-2.5 font-medium">Congregação</th>
                <th className="px-4 py-2.5 font-medium">Válida até</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {cards.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhuma carteirinha emitida ainda.
                  </td>
                </tr>
              )}
              {cards.map((card) => (
                <tr key={card.id} className="border-b last:border-0">
                  <td className="px-4 py-2.5 font-medium">{card.cardNumber ?? "—"}</td>
                  <td className="px-4 py-2.5">{card.member?.name ?? "—"}</td>
                  <td className="px-4 py-2.5">{card.member?.code ?? "—"}</td>
                  <td className="px-4 py-2.5">{card.congregation?.name ?? "—"}</td>
                  <td className="px-4 py-2.5">{formatDate(card.validityDate)}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[card.status] ?? ""}`}
                    >
                      {card.status === "ATIVO" ? "Ativa" : "Cancelada"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      {card.status === "ATIVO" && (
                        <a
                          href={`/api/cards/${card.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                            <Download className="mr-1 h-3.5 w-3.5" />
                            PDF
                          </Button>
                        </a>
                      )}
                      {canCancel && card.status === "ATIVO" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={busy}
                          onClick={() => setCancelling(card)}
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Emitir carteirinha
            </DialogTitle>
            <DialogDescription>
              Selecione o membro para emitir uma nova carteirinha (matrícula sequencial e QR Code próprio).
            </DialogDescription>
          </DialogHeader>
          <form id="emit-card-form" onSubmit={form.handleSubmit(handleEmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="memberId">Membro</Label>
              <select
                id="memberId"
                className={SELECT_INPUT_CLASS}
                {...form.register("memberId")}
              >
                <option value="">Selecione um membro…</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.code}) — {m.congregation?.name ?? "—"}
                  </option>
                ))}
              </select>
            </div>
          </form>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="emit-card-form" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Emitir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!cancelling} onOpenChange={(v) => !v && setCancelling(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar carteirinha</DialogTitle>
            <DialogDescription>
              Deseja cancelar a carteirinha {cancelling?.cardNumber} de{" "}
              {cancelling?.member?.name}? Esta ação não poderá ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCancelling(null)}>
              Voltar
            </Button>
            <Button type="button" variant="destructive" onClick={handleCancel} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cancelar carteirinha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}