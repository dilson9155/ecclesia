"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import {
  CreditCard,
  Download,
  FileStack,
  Loader2,
  Plus,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { emitCard, emitCardsBatch, cancelCardById } from "@/app/actions/cards";

type CardRow = {
  id: string;
  cardNumber: string | null;
  issueDate: Date;
  validityDate: Date | null;
  status: "ATIVO" | "CANCELADO";
  member: { id: string; name: string; code: string; cpf: string | null; cargo: string | null } | null;
  congregation: { id: string; name: string } | null;
};

type MemberOption = {
  id: string;
  name: string;
  code: string;
  situation: string;
  congregationId: string;
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

const SITUATION_LABELS: Record<string, string> = {
  ATIVO: "Ativo",
  INATIVO: "Inativo",
  TRANSFERIDO: "Transferido",
  DESLIGADO: "Desligado",
  FALECIDO: "Falecido",
};

function StatusPill({ status }: { status: CardRow["status"] }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? ""}`}
    >
      {status === "ATIVO" ? "Ativa" : "Cancelada"}
    </span>
  );
}

export function CarteirinhasManager({ cards, members, canEmit, canCancel }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [cancelling, setCancelling] = useState<CardRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [memberSearch, setMemberSearch] = useState("");
  const [lastIssuedIds, setLastIssuedIds] = useState<string[]>([]);
  const [success, setSuccess] = useState<string | null>(null);

  const form = useForm<{ memberId: string }>({
    defaultValues: { memberId: "" },
  });

  const activeCards = cards.filter((card) => card.status === "ATIVO");
  const allActiveSelected =
    activeCards.length > 0 && activeCards.every((card) => selectedCards.has(card.id));

  const eligibleMembers = useMemo(() => {
    const term = memberSearch.trim().toLowerCase();
    return members
      .filter((member) => member.situation === "ATIVO")
      .filter((member) => {
        if (!term) return true;
        return (
          member.name.toLowerCase().includes(term) ||
          member.code.toLowerCase().includes(term) ||
          (member.congregation?.name ?? "").toLowerCase().includes(term)
        );
      });
  }, [members, memberSearch]);

  const selectedMemberList = members.filter((member) => selectedMembers.has(member.id));
  const selectedCardList = cards.filter((card) => selectedCards.has(card.id));
  const batchCardList = selectedCardList.slice(0, 100);

  function toggleCard(cardId: string) {
    setSelectedCards((current) => {
      const next = new Set(current);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  }

  function toggleAllCards() {
    setSelectedCards((current) => {
      const next = new Set(current);
      if (allActiveSelected) {
        for (const card of activeCards) next.delete(card.id);
      } else {
        for (const card of activeCards) next.add(card.id);
      }
      return next;
    });
  }

  function toggleMember(memberId: string) {
    setSelectedMembers((current) => {
      const next = new Set(current);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  }

  function toggleAllEligible() {
    setSelectedMembers((current) => {
      const next = new Set(current);
      const allSelected = eligibleMembers.every((member) => next.has(member.id));
      if (allSelected) {
        for (const member of eligibleMembers) next.delete(member.id);
      } else {
        for (const member of eligibleMembers) next.add(member.id);
      }
      return next;
    });
  }

  async function handleEmit(values: { memberId: string }) {
    if (!values.memberId) {
      setError("Selecione um membro.");
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    const result = await emitCard(values.memberId);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Erro ao emitir carteirinha.");
      return;
    }
    form.reset();
    setOpen(false);
    setSuccess("Carteirinha emitida.");
    router.refresh();
  }

  async function handleEmitBatch() {
    const memberIds = Array.from(selectedMembers);
    if (memberIds.length === 0) {
      setError("Selecione pelo menos um membro.");
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    const result = await emitCardsBatch(memberIds);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Erro ao emitir carteirinhas em lote.");
      return;
    }
    setLastIssuedIds(result.cardIds ?? []);
    setSelectedMembers(new Set());
    setBatchOpen(false);
    setSuccess(
      `${result.count ?? memberIds.length} carteirinha(s) emitida(s). Gere agora a folha A4 do lote.`
    );
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
    setSelectedCards((current) => {
      const next = new Set(current);
      next.delete(cancelling.id);
      return next;
    });
    router.refresh();
  }

  const batchUrl = `/api/cards/batch/pdf?ids=${batchCardList.map((card) => card.id).join(",")}`;
  const lastIssuedUrl = `/api/cards/batch/pdf?ids=${lastIssuedIds.join(",")}`;

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {success && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <span>{success}</span>
          {lastIssuedIds.length > 0 && (
            <Button asChild size="sm" variant="outline">
              <a href={lastIssuedUrl} target="_blank" rel="noreferrer">
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Baixar folha A4 ({lastIssuedIds.length})
              </a>
            </Button>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Carteirinhas
          </h1>
          <p className="text-sm text-muted-foreground">
            Emissão individual ou em lote, com folha A4 pronta para impressão.
          </p>
        </div>
        {canEmit && (
          <div className="flex w-full flex-col gap-2 min-[420px]:flex-row sm:w-auto">
            <Button
              variant="outline"
              onClick={() => setBatchOpen(true)}
              className="w-full sm:w-auto"
            >
              <FileStack className="mr-2 h-4 w-4" />
              Emitir em lote
            </Button>
            <Button onClick={() => setOpen(true)} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Emitir carteirinha
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 rounded-md border bg-muted/20 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {selectedCardList.length > 0
            ? `${selectedCardList.length} carteirinha(s) selecionada(s)${
                selectedCardList.length > 100 ? " · máximo de 100 por PDF" : ""
              }`
            : "Selecione carteirinhas ativas para montar uma folha A4 com 10 unidades por página."}
        </p>
        <Button
          asChild
          size="sm"
          disabled={selectedCardList.length === 0}
          className="w-full shrink-0 sm:w-auto"
        >
          <a
            href={selectedCardList.length > 0 ? batchUrl : "#"}
            target="_blank"
            rel="noreferrer"
            aria-disabled={selectedCardList.length === 0}
            onClick={(event) => {
              if (selectedCardList.length === 0) event.preventDefault();
            }}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Gerar folha A4 ({batchCardList.length})
          </a>
        </Button>
      </div>

      <div className="space-y-2 md:hidden">
        {cards.length === 0 ? (
          <div className="rounded-lg border bg-card px-3 py-8 text-center text-sm text-muted-foreground">
            Nenhuma carteirinha emitida ainda.
          </div>
        ) : (
          cards.map((card) => (
            <div
              key={card.id}
              className="rounded-lg border bg-card p-3 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 size-4 shrink-0"
                  aria-label={`Selecionar carteirinha de ${card.member?.name ?? "membro"}`}
                  checked={selectedCards.has(card.id)}
                  disabled={card.status !== "ATIVO"}
                  onChange={() => toggleCard(card.id)}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {card.member?.name ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {card.member?.cargo || "Membro"}
                      </p>
                    </div>
                    <StatusPill status={card.status} />
                  </div>
                  <dl className="mt-2 grid grid-cols-2 gap-1 text-xs">
                    <div>
                      <dt className="text-muted-foreground">Nº</dt>
                      <dd className="font-medium">{card.cardNumber ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Matrícula</dt>
                      <dd className="font-medium">{card.member?.code ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Congregação</dt>
                      <dd className="truncate font-medium">
                        {card.congregation?.name ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Válida até</dt>
                      <dd className="font-medium">
                        {formatDate(card.validityDate)}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-3 flex flex-wrap items-center justify-end gap-1 border-t pt-2">
                    {card.status === "ATIVO" && (
                      <a
                        href={`/api/cards/${card.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 text-xs"
                        >
                          <Download className="mr-1 h-3.5 w-3.5" />
                          PDF
                        </Button>
                      </a>
                    )}
                    {canCancel && card.status === "ATIVO" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        disabled={busy}
                        onClick={() => setCancelling(card)}
                      >
                        <X className="mr-1 h-3.5 w-3.5 text-destructive" />
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="hidden rounded-md border md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <th className="w-10 px-3 py-2.5">
                  <input
                    type="checkbox"
                    aria-label="Selecionar todas as carteirinhas ativas"
                    checked={allActiveSelected}
                    disabled={activeCards.length === 0}
                    onChange={toggleAllCards}
                  />
                </th>
                <th className="px-4 py-2.5 font-medium">Nº</th>
                <th className="px-4 py-2.5 font-medium">Membro</th>
                <th className="px-4 py-2.5 font-medium">Matrícula</th>
                <th className="px-4 py-2.5 font-medium">Congregação</th>
                <th className="px-4 py-2.5 font-medium">Válida até</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="sticky right-0 bg-muted px-4 py-2.5 text-right font-medium shadow-[-6px_0_12px_-8px_rgba(0,0,0,0.35)]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {cards.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhuma carteirinha emitida ainda.
                  </td>
                </tr>
              )}
              {cards.map((card) => (
                <tr key={card.id} className="border-b last:border-0">
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      aria-label={`Selecionar carteirinha de ${card.member?.name ?? "membro"}`}
                      checked={selectedCards.has(card.id)}
                      disabled={card.status !== "ATIVO"}
                      onChange={() => toggleCard(card.id)}
                    />
                  </td>
                  <td className="px-4 py-2.5 font-medium">{card.cardNumber ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <p className="font-medium">{card.member?.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{card.member?.cargo || "Membro"}</p>
                  </td>
                  <td className="px-4 py-2.5">{card.member?.code ?? "—"}</td>
                  <td className="px-4 py-2.5">{card.congregation?.name ?? "—"}</td>
                  <td className="px-4 py-2.5">{formatDate(card.validityDate)}</td>
                  <td className="px-4 py-2.5">
                    <StatusPill status={card.status} />
                  </td>
                  <td className="sticky right-0 bg-background px-4 py-2.5 shadow-[-6px_0_12px_-8px_rgba(0,0,0,0.35)]">
                    <div className="flex items-center justify-end gap-1">
                      {card.status === "ATIVO" && (
                        <a href={`/api/cards/${card.id}/pdf`} target="_blank" rel="noreferrer">
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
              Selecione o membro para emitir uma nova carteirinha com matrícula sequencial e QR
              Code próprio.
            </DialogDescription>
          </DialogHeader>
          <form id="emit-card-form" onSubmit={form.handleSubmit(handleEmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="memberId">Membro</Label>
              <select id="memberId" className={SELECT_INPUT_CLASS} {...form.register("memberId")}>
                <option value="">Selecione um membro…</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.code}) — {member.congregation?.name ?? "—"}
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

      <Dialog open={batchOpen} onOpenChange={setBatchOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileStack className="h-5 w-5" />
              Emitir carteirinhas em lote
            </DialogTitle>
            <DialogDescription>
              Selecione os membros ativos. Em seguida você poderá gerar uma folha A4 com até 10
              carteirinhas por página.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={memberSearch}
                onChange={(event) => setMemberSearch(event.target.value)}
                placeholder="Buscar por nome, matrícula ou congregação"
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                {selectedMembers.size} selecionado(s) · {eligibleMembers.length} membro(s) ativo(s)
              </span>
              <Button type="button" variant="ghost" size="sm" onClick={toggleAllEligible}>
                {eligibleMembers.length > 0 &&
                eligibleMembers.every((member) => selectedMembers.has(member.id))
                  ? "Limpar seleção"
                  : "Selecionar todos"}
              </Button>
            </div>
            <div className="max-h-80 overflow-y-auto rounded-md border">
              {eligibleMembers.length === 0 && (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  Nenhum membro ativo encontrado.
                </p>
              )}
              {eligibleMembers.map((member) => (
                <label
                  key={member.id}
                  className="flex cursor-pointer items-center gap-3 border-b px-3 py-2 text-sm last:border-0 hover:bg-muted/40"
                >
                  <input
                    type="checkbox"
                    checked={selectedMembers.has(member.id)}
                    onChange={() => toggleMember(member.id)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{member.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {member.code} · {member.congregation?.name ?? "—"}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {SITUATION_LABELS[member.situation] ?? member.situation}
                  </span>
                </label>
              ))}
            </div>
            {selectedMemberList.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Últimos selecionados: {selectedMemberList.slice(-4).map((m) => m.name).join(", ")}
                {selectedMemberList.length > 4 ? "…" : ""}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setBatchOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleEmitBatch} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Emitir {selectedMembers.size > 0 ? `${selectedMembers.size} carteirinha(s)` : "em lote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!cancelling} onOpenChange={(value) => !value && setCancelling(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar carteirinha</DialogTitle>
            <DialogDescription>
              Deseja cancelar a carteirinha {cancelling?.cardNumber} de {cancelling?.member?.name}?
              Esta ação não poderá ser desfeita.
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
