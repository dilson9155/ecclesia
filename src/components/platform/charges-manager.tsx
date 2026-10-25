"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Ban,
  CheckCircle2,
  CircleDollarSign,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Wallet,
} from "lucide-react";
import {
  cancelChargeAction,
  createChargeAction,
  generateMonthlyChargesAction,
  setChargePaidAction,
  setChargePendingAction,
  updateChargeAction,
} from "@/app/actions/charges";
import type {
  ChargeOverview,
  ChargeView,
} from "@/services/charges.service";
import { formatBRL } from "@/modules/platform/pricing";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type ChurchOption = {
  id: string;
  name: string;
  planId: string | null;
  planName: string | null;
  price: number;
};

type FormState = {
  churchId: string;
  description: string;
  referenceMonth: string;
  amount: string;
  dueDate: string;
  notes: string;
};

const STATUS_LABELS: Record<string, string> = {
  PENDENTE: "Pendente",
  PAGA: "Paga",
  VENCIDA: "Vencida",
  CANCELADA: "Cancelada",
};

const STATUS_CLASSES: Record<string, string> = {
  PENDENTE: "border-amber-200 bg-amber-50 text-amber-700",
  PAGA: "border-emerald-200 bg-emerald-50 text-emerald-700",
  VENCIDA: "border-destructive/30 bg-destructive/10 text-destructive",
  CANCELADA: "border-slate-200 bg-slate-50 text-slate-500",
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR");
}

function monthInputValue(referenceMonth: string): string {
  return referenceMonth;
}

function emptyForm(month: string, dueDay = 10): FormState {
  const [year, m] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, m, 0)).getUTCDate();
  const day = Math.min(dueDay, lastDay);
  return {
    churchId: "",
    description: "",
    referenceMonth: month,
    amount: "",
    dueDate: `${month}-${String(day).padStart(2, "0")}`,
    notes: "",
  };
}

export function ChargesManager({
  charges,
  overview,
  churches,
  referenceMonth,
  filter,
}: {
  charges: ChargeView[];
  overview: ChargeOverview;
  churches: ChurchOption[];
  referenceMonth: string;
  filter: { q: string; status: string; month: string };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ChargeView | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm(referenceMonth));
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateMonth, setGenerateMonth] = useState(referenceMonth);
  const [generateDay, setGenerateDay] = useState("10");
  const [paying, setPaying] = useState<ChargeView | null>(null);
  const [paidDate, setPaidDate] = useState("");
  const [cancelling, setCancelling] = useState<ChargeView | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState(filter.q);
  const [status, setStatus] = useState(filter.status);
  const [month, setMonth] = useState(filter.month);

  const totals = useMemo(
    () => [
      {
        label: "Em aberto",
        value: formatBRL(overview.pending),
        hint: `${overview.countPending} cobrança(s)`,
        icon: Wallet,
      },
      {
        label: "Vencido",
        value: formatBRL(overview.overdue),
        hint: `${overview.countOverdue} cobrança(s)`,
        icon: Ban,
      },
      {
        label: "Recebido no mês",
        value: formatBRL(overview.received),
        hint: "Baixas confirmadas",
        icon: CheckCircle2,
      },
    ],
    [overview]
  );

  function applyFilters() {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (status && status !== "TODAS") params.set("status", status);
    if (month) params.set("month", month);
    router.push(`/super-admin/cobrancas?${params.toString()}`);
  }

  function clearFilters() {
    setSearch("");
    setStatus("TODAS");
    setMonth("");
    router.push("/super-admin/cobrancas");
  }

  function openCreate() {
    setEditing(null);
    setError(null);
    setSuccess(null);
    setForm(emptyForm(referenceMonth));
    setOpen(true);
  }

  function openEdit(charge: ChargeView) {
    setEditing(charge);
    setError(null);
    setSuccess(null);
    setForm({
      churchId: charge.churchId,
      description: charge.description,
      referenceMonth: charge.referenceMonth,
      amount: charge.amount.toFixed(2).replace(".", ","),
      dueDate: charge.dueDate,
      notes: charge.notes ?? "",
    });
    setOpen(true);
  }

  function selectChurch(churchId: string) {
    const church = churches.find((item) => item.id === churchId);
    setForm((current) => ({
      ...current,
      churchId,
      amount:
        current.amount ||
        (church && church.price > 0
          ? church.price.toFixed(2).replace(".", ",")
          : ""),
      description:
        current.description ||
        (church?.planName
          ? `Mensalidade ${church.planName}`
          : `Mensalidade ${current.referenceMonth}`),
    }));
  }

  function parseAmount(value: string): number {
    const normalized = value
      .replace(/\s/g, "")
      .replace(/\.(?=\d{3}(\D|$))/g, "")
      .replace(",", ".");
    return Number(normalized);
  }

  async function handleSubmit() {
    setError(null);
    setSuccess(null);

    if (!editing && !form.churchId) {
      setError("Selecione a igreja.");
      return;
    }
    if (!form.referenceMonth) {
      setError("Informe o mês de referência.");
      return;
    }
    if (!form.dueDate) {
      setError("Informe o vencimento.");
      return;
    }
    const amount = parseAmount(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Informe um valor válido.");
      return;
    }

    const payload = {
      description: form.description.trim() || null,
      referenceMonth: form.referenceMonth,
      amount,
      dueDate: form.dueDate,
      notes: form.notes.trim() || null,
    };

    setBusy(true);
    const result = editing
      ? await updateChargeAction(editing.id, payload)
      : await createChargeAction({ ...payload, churchId: form.churchId });
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    setSuccess(editing ? "Cobrança atualizada." : "Cobrança criada.");
    router.refresh();
  }

  async function handleGenerate() {
    setError(null);
    setSuccess(null);
    if (!generateMonth) {
      setError("Informe o mês de referência.");
      return;
    }
    setBusy(true);
    const result = await generateMonthlyChargesAction(
      generateMonth,
      Number(generateDay) || 10
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setGenerateOpen(false);
    setSuccess(
      `${result.created} cobrança(s) gerada(s). ${result.skipped} igreja(s) ignorada(s).`
    );
    router.refresh();
  }

  async function handlePay() {
    if (!paying) return;
    setBusy(true);
    setError(null);
    const result = await setChargePaidAction(paying.id, paidDate || null);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPaying(null);
    setPaidDate("");
    setSuccess("Cobrança baixada como paga.");
    router.refresh();
  }

  async function handleReopen(charge: ChargeView) {
    setBusyId(charge.id);
    setError(null);
    const result = await setChargePendingAction(charge.id);
    setBusyId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSuccess("Baixa desfeita. Cobrança voltou para pendente.");
    router.refresh();
  }

  async function handleCancel() {
    if (!cancelling) return;
    setBusy(true);
    setError(null);
    const result = await cancelChargeAction(cancelling.id, cancelReason || null);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCancelling(null);
    setCancelReason("");
    setSuccess("Cobrança cancelada.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight sm:text-2xl">
            <CircleDollarSign className="h-5 w-5" />
            Cobranças das igrejas
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure a mensalidade de cada igreja. O valor aparece no painel da
            sede.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button
            variant="outline"
            onClick={() => setGenerateOpen(true)}
            className="w-full sm:w-auto"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Gerar do mês
          </Button>
          <Button onClick={openCreate} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Nova cobrança
          </Button>
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        {totals.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label}>
              <CardContent className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {item.label}
                  </p>
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold tracking-tight">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.hint}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-2 rounded-md border bg-muted/20 p-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative lg:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && applyFilters()}
            placeholder="Buscar igreja"
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Situação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODAS">Todas</SelectItem>
            <SelectItem value="ABERTAS">Em aberto</SelectItem>
            <SelectItem value="VENCIDAS">Vencidas</SelectItem>
            <SelectItem value="PAGA">Pagas</SelectItem>
            <SelectItem value="CANCELADA">Canceladas</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="month"
          value={monthInputValue(month)}
          onChange={(event) => setMonth(event.target.value)}
          aria-label="Mês de referência"
        />
        <div className="flex gap-2">
          <Button className="flex-1" onClick={applyFilters}>
            Filtrar
          </Button>
          <Button variant="ghost" onClick={clearFilters}>
            Limpar
          </Button>
        </div>
      </div>

      <Card className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Igreja</TableHead>
              <TableHead>Referência</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {charges.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Nenhuma cobrança encontrada.
                </TableCell>
              </TableRow>
            ) : (
              charges.map((charge) => (
                <TableRow key={charge.id}>
                  <TableCell>
                    <p className="font-medium">{charge.churchName}</p>
                    <p className="text-xs text-muted-foreground">
                      {charge.planName ?? "Sem plano"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{charge.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {charge.referenceMonth}
                    </p>
                  </TableCell>
                  <TableCell>{formatDate(charge.dueDate)}</TableCell>
                  <TableCell className="font-medium">
                    {formatBRL(charge.amount)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                        STATUS_CLASSES[charge.effectiveStatus] ?? ""
                      }`}
                    >
                      {STATUS_LABELS[charge.effectiveStatus] ??
                        charge.effectiveStatus}
                    </span>
                    {charge.paidAt ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Paga em {formatDate(charge.paidAt)}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-1">
                      {charge.status === "PENDENTE" ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs"
                            disabled={busyId === charge.id}
                            onClick={() => {
                              setPaying(charge);
                              setPaidDate(
                                new Date().toISOString().slice(0, 10)
                              );
                            }}
                          >
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                            Baixar
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Editar cobrança"
                            title="Editar cobrança"
                            onClick={() => openEdit(charge)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Cancelar cobrança"
                            title="Cancelar cobrança"
                            onClick={() => {
                              setCancelling(charge);
                              setCancelReason("");
                            }}
                          >
                            <Ban className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      ) : null}
                      {charge.status === "PAGA" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs"
                          disabled={busyId === charge.id}
                          onClick={() => void handleReopen(charge)}
                        >
                          <RotateCcw className="mr-1 h-3.5 w-3.5" />
                          Desfazer baixa
                        </Button>
                      ) : null}
                      {charge.status === "CANCELADA" ? (
                        <span className="text-xs text-muted-foreground">
                          —
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <div className="space-y-3 lg:hidden">
        {charges.length === 0 ? (
          <p className="rounded-lg border bg-card px-3 py-8 text-center text-sm text-muted-foreground">
            Nenhuma cobrança encontrada.
          </p>
        ) : (
          charges.map((charge) => (
            <Card key={charge.id}>
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{charge.churchName}</p>
                    <p className="text-xs text-muted-foreground">
                      {charge.description} · {charge.referenceMonth}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${
                      STATUS_CLASSES[charge.effectiveStatus] ?? ""
                    }`}
                  >
                    {STATUS_LABELS[charge.effectiveStatus] ??
                      charge.effectiveStatus}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Valor</p>
                    <p className="font-medium">{formatBRL(charge.amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Vencimento</p>
                    <p className="font-medium">{formatDate(charge.dueDate)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-1 border-t pt-2">
                  {charge.status === "PENDENTE" ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        disabled={busyId === charge.id}
                        onClick={() => {
                          setPaying(charge);
                          setPaidDate(new Date().toISOString().slice(0, 10));
                        }}
                      >
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                        Baixar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        onClick={() => openEdit(charge)}
                      >
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        onClick={() => {
                          setCancelling(charge);
                          setCancelReason("");
                        }}
                      >
                        <Ban className="mr-1 h-3.5 w-3.5 text-destructive" />
                        Cancelar
                      </Button>
                    </>
                  ) : null}
                  {charge.status === "PAGA" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      disabled={busyId === charge.id}
                      onClick={() => void handleReopen(charge)}
                    >
                      <RotateCcw className="mr-1 h-3.5 w-3.5" />
                      Desfazer baixa
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar cobrança" : "Nova cobrança"}
            </DialogTitle>
            <DialogDescription>
              O valor e o vencimento ficam visíveis para a igreja no painel da
              sede.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {!editing ? (
              <div className="space-y-1.5">
                <Label>Igreja *</Label>
                <Select
                  value={form.churchId || undefined}
                  onValueChange={selectChurch}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione a igreja" />
                  </SelectTrigger>
                  <SelectContent>
                    {churches.map((church) => (
                      <SelectItem key={church.id} value={church.id}>
                        {church.name}
                        {church.planName ? ` — ${church.planName}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                <p className="font-medium">{editing.churchName}</p>
                <p className="text-xs text-muted-foreground">
                  {editing.planName ?? "Sem plano"}
                </p>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="charge-month">Mês de referência *</Label>
                <Input
                  id="charge-month"
                  type="month"
                  value={form.referenceMonth}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      referenceMonth: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="charge-due">Vencimento *</Label>
                <Input
                  id="charge-due"
                  type="date"
                  value={form.dueDate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      dueDate: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="charge-amount">Valor (R$) *</Label>
                <Input
                  id="charge-amount"
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="charge-description">Descrição</Label>
                <Input
                  id="charge-description"
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Mensalidade"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="charge-notes">Observações</Label>
              <Textarea
                id="charge-notes"
                rows={2}
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({ ...current, notes: event.target.value }))
                }
              />
            </div>

            {error ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={() => void handleSubmit()} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editing ? "Salvar" : "Criar cobrança"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gerar cobranças do mês</DialogTitle>
            <DialogDescription>
              Cria uma cobrança com o valor do plano para cada igreja ativa que
              ainda não possui cobrança no mês.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="generate-month">Mês *</Label>
              <Input
                id="generate-month"
                type="month"
                value={generateMonth}
                onChange={(event) => setGenerateMonth(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="generate-day">Dia do vencimento</Label>
              <Input
                id="generate-day"
                type="number"
                min={1}
                max={28}
                value={generateDay}
                onChange={(event) => setGenerateDay(event.target.value)}
              />
            </div>
          </div>
          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setGenerateOpen(false)}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button onClick={() => void handleGenerate()} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Gerar cobranças
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!paying} onOpenChange={(value) => !value && setPaying(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Baixar cobrança</DialogTitle>
            <DialogDescription>
              Confirmar o pagamento de {paying ? formatBRL(paying.amount) : ""} de{" "}
              {paying?.churchName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="paid-date">Data do pagamento</Label>
            <Input
              id="paid-date"
              type="date"
              value={paidDate}
              onChange={(event) => setPaidDate(event.target.value)}
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaying(null)} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={() => void handlePay()} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirmar baixa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!cancelling}
        onOpenChange={(value) => !value && setCancelling(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar cobrança</DialogTitle>
            <DialogDescription>
              A cobrança de {cancelling?.churchName} ficará no histórico como
              cancelada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="cancel-reason">Motivo (opcional)</Label>
            <Textarea
              id="cancel-reason"
              rows={2}
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelling(null)}
              disabled={busy}
            >
              Voltar
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleCancel()}
              disabled={busy}
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Cancelar cobrança
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
