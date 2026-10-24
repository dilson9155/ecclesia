"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { HandCoins, Loader2, Search, Sparkles } from "lucide-react";
import type { PaymentMethod } from "@prisma/client";
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
import { formatMoney } from "@/lib/format";
import { createTithesBatch } from "@/app/actions/registration";

type CongregationOption = { id: string; name: string };
type MemberOption = { id: string; name: string; code: string; congregationId: string };
type AccountOption = { id: string; name: string; accountingCode: string };
type CostCenterOption = { id: string; name: string; congregationId: string | null };

type Props = {
  congregations: CongregationOption[];
  members: MemberOption[];
  accounts: AccountOption[];
  costCenters: CostCenterOption[];
  canCreate: boolean;
};

const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "DINHEIRO", label: "Dinheiro" },
  { value: "PIX", label: "PIX" },
  { value: "CARTAO", label: "Cartão" },
  { value: "TRANSFERENCIA", label: "Transferência" },
  { value: "DEPOSITO", label: "Depósito" },
  { value: "BOLETO", label: "Boleto" },
  { value: "OUTROS", label: "Outros" },
];

function todayIso(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function parseValue(value: string): number {
  const normalized = value.includes(",")
    ? value.replace(/\./g, "").replace(",", ".")
    : value;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function TitheBatch({
  congregations,
  members,
  accounts,
  costCenters,
  canCreate,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [congregationId, setCongregationId] = useState("");
  const [date, setDate] = useState(todayIso());
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("DINHEIRO");
  const [costCenterId, setCostCenterId] = useState("");
  const [observation, setObservation] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const congregationMembers = useMemo(
    () => members.filter((member) => member.congregationId === congregationId),
    [members, congregationId]
  );

  const filteredMembers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return congregationMembers;
    return congregationMembers.filter(
      (member) =>
        member.name.toLowerCase().includes(term) ||
        member.code.toLowerCase().includes(term)
    );
  }, [congregationMembers, search]);

  const filteredCostCenters = useMemo(
    () =>
      costCenters.filter(
        (center) => !center.congregationId || center.congregationId === congregationId
      ),
    [costCenters, congregationId]
  );

  const filledEntries = Object.entries(values)
    .map(([memberId, value]) => ({ memberId, value: parseValue(value) }))
    .filter((entry) => entry.value > 0);

  const total = filledEntries.reduce((sum, entry) => sum + entry.value, 0);

  function resetForm() {
    setCongregationId("");
    setDate(todayIso());
    setAccountId(accounts[0]?.id ?? "");
    setPaymentMethod("DINHEIRO");
    setCostCenterId("");
    setObservation("");
    setValues({});
    setSearch("");
    setError(null);
  }

  async function handleSubmit() {
    setError(null);
    if (!congregationId) {
      setError("Selecione a congregação.");
      return;
    }
    if (!accountId) {
      setError("Selecione a conta contábil.");
      return;
    }
    if (filledEntries.length === 0) {
      setError("Informe o valor do dízimo para pelo menos um membro.");
      return;
    }

    setBusy(true);
    const result = await createTithesBatch({
      congregationId,
      date,
      accountId,
      paymentMethod,
      costCenterId: costCenterId || null,
      observation: observation || null,
      entries: filledEntries,
    });
    setBusy(false);

    if (!result.ok) {
      setError(result.error ?? "Erro ao lançar os dízimos em lote.");
      return;
    }

    setSuccess(
      `${result.count ?? filledEntries.length} dízimo(s) lançado(s), total de ${formatMoney(
        result.total ?? total,
        true
      )}.`
    );
    setOpen(false);
    resetForm();
    router.refresh();
  }

  if (!canCreate) return null;

  return (
    <>
      {success && (
        <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </p>
      )}

      <div className="flex flex-col gap-3 rounded-lg border bg-gradient-to-r from-primary/5 to-transparent p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">Lançamento rápido de dízimos</p>
            <p className="text-sm text-muted-foreground">
              Informe os valores de vários membros de uma vez; o sistema cria os lançamentos e
              atualiza o livro caixa automaticamente.
            </p>
          </div>
        </div>
        <Button onClick={() => setOpen(true)} className="w-full shrink-0 sm:w-auto">
          <HandCoins className="mr-2 h-4 w-4" />
          Lançar em lote
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HandCoins className="h-5 w-5" />
              Dízimos em lote
            </DialogTitle>
            <DialogDescription>
              Escolha a congregação e preencha somente os valores dos membros que contribuíram.
              Os campos em branco serão ignorados.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="batchCongregation">Congregação</Label>
                <select
                  id="batchCongregation"
                  className={SELECT_INPUT_CLASS}
                  value={congregationId}
                  onChange={(event) => {
                    setCongregationId(event.target.value);
                    setCostCenterId("");
                    setValues({});
                  }}
                >
                  <option value="">Selecione…</option>
                  {congregations.map((congregation) => (
                    <option key={congregation.id} value={congregation.id}>
                      {congregation.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="batchDate">Data</Label>
                <Input
                  id="batchDate"
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="batchAccount">Conta contábil</Label>
                <select
                  id="batchAccount"
                  className={SELECT_INPUT_CLASS}
                  value={accountId}
                  onChange={(event) => setAccountId(event.target.value)}
                >
                  <option value="">Selecione…</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.accountingCode} — {account.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="batchPayment">Forma de pagamento</Label>
                <select
                  id="batchPayment"
                  className={SELECT_INPUT_CLASS}
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="batchCostCenter">Centro de custo (opcional)</Label>
                <select
                  id="batchCostCenter"
                  className={SELECT_INPUT_CLASS}
                  value={costCenterId}
                  onChange={(event) => setCostCenterId(event.target.value)}
                >
                  <option value="">Sem centro de custo</option>
                  {filteredCostCenters.map((center) => (
                    <option key={center.id} value={center.id}>
                      {center.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="batchObservation">Observação (opcional)</Label>
                <Input
                  id="batchObservation"
                  value={observation}
                  placeholder="Ex.: culto de domingo"
                  onChange={(event) => setObservation(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label>Membros da congregação</Label>
                <span className="text-xs text-muted-foreground">
                  {filledEntries.length} preenchido(s) · {formatMoney(total, true)}
                </span>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar membro por nome ou matrícula"
                  className="pl-9"
                  disabled={!congregationId}
                />
              </div>

              <div className="max-h-72 overflow-y-auto rounded-md border">
                {!congregationId && (
                  <p className="p-6 text-center text-sm text-muted-foreground">
                    Selecione uma congregação para listar os membros.
                  </p>
                )}
                {congregationId && filteredMembers.length === 0 && (
                  <p className="p-6 text-center text-sm text-muted-foreground">
                    Nenhum membro ativo encontrado.
                  </p>
                )}
                {filteredMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 border-b px-3 py-2 last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.code}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">R$</span>
                      <Input
                        inputMode="decimal"
                        placeholder="0,00"
                        className="h-9 w-24 text-right sm:w-28"
                        value={values[member.id] ?? ""}
                        onChange={(event) =>
                          setValues((current) => ({
                            ...current,
                            [member.id]: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lançar {filledEntries.length > 0 ? `${filledEntries.length} dízimo(s)` : "em lote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
