"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PaymentMethod } from "@prisma/client";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  FileText,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Wallet,
} from "lucide-react";
import { PAYMENT_METHOD_OPTIONS } from "@/modules/registration/definitions";
import { formatMoney } from "@/lib/format";
import { SELECT_INPUT_CLASS } from "@/lib/styles";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  PayablePayment,
  PayableRow,
  PayableTotals,
} from "@/services/payables.service";
import {
  cancelPayableAction,
  createPayableAction,
  payPayableAction,
  reversePaymentAction,
  updatePayableAction,
} from "@/app/actions/payables";

type Options = {
  congregations: Array<{ id: string; name: string }>;
  suppliers: Array<{ id: string; name: string }>;
  accounts: Array<{ id: string; name: string; accountingCode: string }>;
  costCenters: Array<{ id: string; name: string }>;
};

type Filters = {
  q: string;
  status: string;
  congregationId: string;
  from: string;
  to: string;
};

type Props = {
  rows: PayableRow[];
  totals: PayableTotals;
  options: Options;
  filters: Filters;
  permissions: {
    canCreate: boolean;
    canEdit: boolean;
    canPay: boolean;
    canCancel: boolean;
  };
  today: string;
};

type FormState = {
  id: string | null;
  congregationId: string;
  date: string;
  dueDate: string;
  supplierId: string;
  beneficiary: string;
  description: string;
  value: string;
  installments: string;
  paymentMethod: PaymentMethod;
  document: string;
  costCenterId: string;
  accountId: string;
  observation: string;
};

const STATUS_META: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  PENDENTE: { label: "Pendente", variant: "outline" },
  PARCIAL: { label: "Parcial", variant: "secondary" },
  PAGO: { label: "Pago", variant: "default" },
  CANCELADO: { label: "Cancelado", variant: "secondary" },
};

const STATUS_FILTER_LABELS: Record<string, string> = {
  ABERTAS: "Em aberto",
  VENCIDAS: "Vencidas",
  TODOS: "Todas",
  PENDENTE: "Pendentes",
  PARCIAL: "Parciais",
  PAGO: "Pagas",
  CANCELADO: "Canceladas",
};

function dateLabel(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(`${iso.slice(0, 10)}T12:00:00-03:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function money(value: number): string {
  return formatMoney(value, true);
}

function installmentLabel(row: PayableRow): string | null {
  if (!row.installmentNumber || !row.installmentTotal) return null;
  return `${row.installmentNumber}/${row.installmentTotal}`;
}

export function PayablesManager({
  rows,
  totals,
  options,
  filters,
  permissions,
  today,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);

  const [payingId, setPayingId] = useState<string | null>(null);
  const [payValue, setPayValue] = useState("");
  const [payDate, setPayDate] = useState(today);
  const [payMethod, setPayMethod] = useState<PaymentMethod>("PIX");
  const [payDocument, setPayDocument] = useState("");
  const [payNotes, setPayNotes] = useState("");

  const [historyId, setHistoryId] = useState<string | null>(null);

  const [reversing, setReversing] = useState<{
    row: PayableRow;
    payment: PayablePayment;
  } | null>(null);
  const [reverseReason, setReverseReason] = useState("");

  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const payingRow = useMemo(
    () => (payingId ? rows.find((row) => row.id === payingId) ?? null : null),
    [payingId, rows]
  );
  const historyRow = useMemo(
    () => (historyId ? rows.find((row) => row.id === historyId) ?? null : null),
    [historyId, rows]
  );
  const cancellingRow = useMemo(
    () =>
      cancellingId
        ? rows.find((row) => row.id === cancellingId) ?? null
        : null,
    [cancellingId, rows]
  );

  async function run(
    action: () => Promise<{ ok: boolean; error?: string }>,
    message: string
  ): Promise<boolean> {
    setBusy(true);
    setError(null);
    setSuccess(null);
    const result = await action();
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Não foi possível concluir a operação.");
      return false;
    }
    setSuccess(message);
    router.refresh();
    return true;
  }

  function openCreate() {
    setError(null);
    setSuccess(null);
    setForm({
      id: null,
      congregationId: options.congregations[0]?.id ?? "",
      date: today,
      dueDate: today,
      supplierId: "",
      beneficiary: "",
      description: "",
      value: "",
      installments: "1",
      paymentMethod: "PIX",
      document: "",
      costCenterId: "",
      accountId: "",
      observation: "",
    });
    setFormOpen(true);
  }

  function openEdit(row: PayableRow) {
    setError(null);
    setSuccess(null);
    setForm({
      id: row.id,
      congregationId: row.congregationId,
      date: row.date.slice(0, 10),
      dueDate: row.dueDate?.slice(0, 10) ?? row.date.slice(0, 10),
      supplierId: row.supplierId ?? "",
      beneficiary: row.beneficiary ?? "",
      description: row.description,
      value: row.value.toFixed(2),
      installments: "1",
      paymentMethod: row.paymentMethod as PaymentMethod,
      document: row.document ?? "",
      costCenterId: row.costCenterId ?? "",
      accountId: row.accountId,
      observation: row.observation ?? "",
    });
    setFormOpen(true);
  }

  async function submitForm() {
    if (!form) return;
    const value = Number(form.value.replace(",", "."));
    const payload = {
      congregationId: form.congregationId,
      date: form.date,
      dueDate: form.dueDate || null,
      supplierId: form.supplierId || null,
      beneficiary: form.beneficiary || null,
      description: form.description,
      value,
      paymentMethod: form.paymentMethod,
      document: form.document || null,
      costCenterId: form.costCenterId || null,
      accountId: form.accountId,
      observation: form.observation || null,
    };

    const ok = form.id
      ? await run(() => updatePayableAction(form.id as string, payload), "Conta atualizada.")
      : await run(
          () =>
            createPayableAction({
              ...payload,
              installments: Number(form.installments) || 1,
            }),
          Number(form.installments) > 1
            ? "Conta criada com parcelas."
            : "Conta criada."
        );

    if (ok) setFormOpen(false);
  }

  function openPay(row: PayableRow) {
    setError(null);
    setSuccess(null);
    setPayingId(row.id);
    setPayValue(row.balance.toFixed(2));
    setPayDate(today);
    setPayMethod((row.paymentMethod as PaymentMethod) ?? "PIX");
    setPayDocument(row.document ?? "");
    setPayNotes("");
  }

  async function submitPay() {
    if (!payingRow) return;
    const ok = await run(
      () =>
        payPayableAction({
          expenseId: payingRow.id,
          value: Number(payValue.replace(",", ".")),
          date: payDate,
          paymentMethod: payMethod,
          document: payDocument || null,
          notes: payNotes || null,
        }),
      "Baixa registrada."
    );
    if (ok) setPayingId(null);
  }

  async function submitReverse() {
    if (!reversing) return;
    const ok = await run(
      () => reversePaymentAction(reversing.payment.id, reverseReason || null),
      "Pagamento estornado."
    );
    if (ok) {
      setReversing(null);
      setReverseReason("");
    }
  }

  async function submitCancel() {
    if (!cancellingRow) return;
    const ok = await run(
      () => cancelPayableAction(cancellingRow.id, cancelReason || null),
      "Conta cancelada."
    );
    if (ok) {
      setCancellingId(null);
      setCancelReason("");
    }
  }

  const hasFilters =
    Boolean(filters.q) ||
    Boolean(filters.congregationId) ||
    Boolean(filters.from) ||
    Boolean(filters.to) ||
    filters.status !== "ABERTAS";

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Contas a pagar
          </h1>
          <p className="text-sm text-muted-foreground">
            Controle de despesas com parcelas, baixa parcial ou total e estorno.
          </p>
        </div>
        {permissions.canCreate && (
          <Button onClick={openCreate} className="w-full shrink-0 sm:w-auto">
            <Plus className="mr-2 size-4" />
            Nova conta
          </Button>
        )}
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Em aberto"
          value={money(totals.open)}
          hint={`${totals.count} conta(s)`}
          icon={Wallet}
        />
        <Kpi
          label="Vencido"
          value={money(totals.overdue)}
          hint="Saldo de contas vencidas"
          icon={AlertTriangle}
          tone="danger"
        />
        <Kpi
          label="Pago no mês"
          value={money(totals.paidPeriod)}
          hint="Baixas confirmadas"
          icon={CheckCircle2}
          tone="success"
        />
        <Kpi
          label="Filtro atual"
          value={String(rows.length)}
          hint="Conta(s) listada(s)"
          icon={FileText}
        />
      </div>

      <Card>
        <CardContent className="pt-4">
          <form method="get" className="grid gap-3 md:grid-cols-12">
            <div className="md:col-span-4">
              <Label htmlFor="q" className="text-xs text-muted-foreground">
                Buscar
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  id="q"
                  name="q"
                  defaultValue={filters.q}
                  placeholder="Descrição, fornecedor, documento…"
                  className="pl-8"
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="status" className="text-xs text-muted-foreground">
                Situação
              </Label>
              <select
                id="status"
                name="status"
                defaultValue={filters.status}
                className={SELECT_INPUT_CLASS}
              >
                {Object.entries(STATUS_FILTER_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-3">
              <Label
                htmlFor="congregationId"
                className="text-xs text-muted-foreground"
              >
                Congregação
              </Label>
              <select
                id="congregationId"
                name="congregationId"
                defaultValue={filters.congregationId}
                className={SELECT_INPUT_CLASS}
              >
                <option value="">Todas</option>
                {options.congregations.map((congregation) => (
                  <option key={congregation.id} value={congregation.id}>
                    {congregation.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-3 grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="from" className="text-xs text-muted-foreground">
                  Vencimento de
                </Label>
                <Input id="from" name="from" type="date" defaultValue={filters.from} />
              </div>
              <div>
                <Label htmlFor="to" className="text-xs text-muted-foreground">
                  até
                </Label>
                <Input id="to" name="to" type="date" defaultValue={filters.to} />
              </div>
            </div>
            <div className="flex items-end gap-2 md:col-span-12">
              <Button type="submit">Filtrar</Button>
              {hasFilters && (
                <Button variant="ghost" asChild>
                  <Link href="/contas-a-pagar">Limpar filtros</Link>
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma conta encontrada para os filtros selecionados.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-2 md:hidden">
            {rows.map((row) => (
              <div key={row.id} className="rounded-lg border bg-card p-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {row.description}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {row.congregationName}
                      {row.supplierName ? ` · ${row.supplierName}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <StatusBadge row={row} />
                    {installmentLabel(row) && (
                      <span className="text-[10px] text-muted-foreground">
                        Parcela {installmentLabel(row)}
                      </span>
                    )}
                  </div>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Vencimento</dt>
                    <dd className="font-medium">{dateLabel(row.dueDate)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Valor</dt>
                    <dd className="font-medium">{money(row.value)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Saldo</dt>
                    <dd className="font-semibold">{money(row.balance)}</dd>
                  </div>
                </dl>
                <div className="mt-3 flex flex-wrap items-center justify-end gap-1 border-t pt-2">
                  {permissions.canPay &&
                    (row.status === "PENDENTE" || row.status === "PARCIAL") && (
                      <Button
                        size="sm"
                        className="h-8 px-2 text-xs"
                        onClick={() => openPay(row)}
                      >
                        Pagar
                      </Button>
                    )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => setHistoryId(row.id)}
                  >
                    Pagamentos
                  </Button>
                  {permissions.canEdit &&
                    (row.status === "PENDENTE" || row.status === "PARCIAL") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        onClick={() => openEdit(row)}
                      >
                        <Pencil className="mr-1 size-3.5" />
                        Editar
                      </Button>
                    )}
                  {permissions.canCancel &&
                    (row.status === "PENDENTE" || row.status === "PARCIAL") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        onClick={() => {
                          setCancellingId(row.id);
                          setCancelReason("");
                        }}
                      >
                        <Ban className="mr-1 size-3.5 text-destructive" />
                        Cancelar
                      </Button>
                    )}
                </div>
              </div>
            ))}
          </div>

          <div className="hidden rounded-md border md:block">
            <Table className="border-separate border-spacing-0">
              <TableHeader>
                <TableRow>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Congregação</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Pago</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="sticky right-0 bg-muted text-right shadow-[-6px_0_12px_-8px_rgba(0,0,0,0.35)]">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap">
                      <span className={row.isOverdue ? "font-semibold text-destructive" : ""}>
                        {dateLabel(row.dueDate)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[280px]">
                        <p className="truncate font-medium" title={row.description}>
                          {row.description}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {row.supplierName ?? row.beneficiary ?? "—"}
                          {installmentLabel(row)
                            ? ` · Parcela ${installmentLabel(row)}`
                            : ""}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {row.congregationName}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      {money(row.value)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-emerald-700">
                      {money(row.paid)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right font-semibold">
                      {money(row.balance)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge row={row} />
                    </TableCell>
                    <TableCell className="sticky right-0 bg-background text-right shadow-[-6px_0_12px_-8px_rgba(0,0,0,0.35)]">
                      <div className="flex items-center justify-end gap-1">
                        {permissions.canPay &&
                          (row.status === "PENDENTE" ||
                            row.status === "PARCIAL") && (
                            <Button
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => openPay(row)}
                            >
                              Pagar
                            </Button>
                          )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => setHistoryId(row.id)}
                        >
                          Pagamentos
                        </Button>
                        {permissions.canEdit &&
                          (row.status === "PENDENTE" ||
                            row.status === "PARCIAL") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              aria-label="Editar conta"
                              title="Editar conta"
                              onClick={() => openEdit(row)}
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                          )}
                        {permissions.canCancel &&
                          (row.status === "PENDENTE" ||
                            row.status === "PARCIAL") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              aria-label="Cancelar conta"
                              title="Cancelar conta"
                              onClick={() => {
                                setCancellingId(row.id);
                                setCancelReason("");
                              }}
                            >
                              <Ban className="size-3.5 text-destructive" />
                            </Button>
                          )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Nova conta / edição */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Editar conta" : "Nova conta a pagar"}</DialogTitle>
            <DialogDescription>
              {form?.id
                ? "Atualize os dados da conta. O valor só pode ser alterado sem pagamentos."
                : "Cadastre a despesa e, se quiser, gere as parcelas automaticamente."}
            </DialogDescription>
          </DialogHeader>

          {form && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="description">Descrição *</Label>
                <Input
                  id="description"
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                  placeholder="Ex.: Aluguel do templo, energia, manutenção…"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="congregationId">Congregação *</Label>
                <select
                  id="congregationId"
                  className={SELECT_INPUT_CLASS}
                  value={form.congregationId}
                  onChange={(event) =>
                    setForm({ ...form, congregationId: event.target.value })
                  }
                  disabled={Boolean(form.id)}
                >
                  <option value="">Selecione…</option>
                  {options.congregations.map((congregation) => (
                    <option key={congregation.id} value={congregation.id}>
                      {congregation.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="accountId">Conta contábil *</Label>
                <select
                  id="accountId"
                  className={SELECT_INPUT_CLASS}
                  value={form.accountId}
                  onChange={(event) =>
                    setForm({ ...form, accountId: event.target.value })
                  }
                >
                  <option value="">Selecione…</option>
                  {options.accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.accountingCode} · {account.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="supplierId">Fornecedor</Label>
                <select
                  id="supplierId"
                  className={SELECT_INPUT_CLASS}
                  value={form.supplierId}
                  onChange={(event) =>
                    setForm({ ...form, supplierId: event.target.value })
                  }
                >
                  <option value="">Sem fornecedor</option>
                  {options.suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="beneficiary">Beneficiário (avulso)</Label>
                <Input
                  id="beneficiary"
                  value={form.beneficiary}
                  onChange={(event) =>
                    setForm({ ...form, beneficiary: event.target.value })
                  }
                  placeholder="Nome de quem recebe"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="date">Competência *</Label>
                <Input
                  id="date"
                  type="date"
                  value={form.date}
                  onChange={(event) =>
                    setForm({ ...form, date: event.target.value })
                  }
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="dueDate">1º vencimento</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={form.dueDate}
                  onChange={(event) =>
                    setForm({ ...form, dueDate: event.target.value })
                  }
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="value">Valor total *</Label>
                <Input
                  id="value"
                  inputMode="decimal"
                  value={form.value}
                  onChange={(event) =>
                    setForm({ ...form, value: event.target.value })
                  }
                  placeholder="0,00"
                />
              </div>

              {!form.id && (
                <div className="space-y-1">
                  <Label htmlFor="installments">Parcelas</Label>
                  <select
                    id="installments"
                    className={SELECT_INPUT_CLASS}
                    value={form.installments}
                    onChange={(event) =>
                      setForm({ ...form, installments: event.target.value })
                    }
                  >
                    {Array.from({ length: 24 }, (_, index) => index + 1).map(
                      (count) => (
                        <option key={count} value={String(count)}>
                          {count === 1 ? "À vista (1x)" : `${count}x`}
                        </option>
                      )
                    )}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    As parcelas são criadas com vencimentos mensais.
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="paymentMethod">Forma de pagamento</Label>
                <select
                  id="paymentMethod"
                  className={SELECT_INPUT_CLASS}
                  value={form.paymentMethod}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      paymentMethod: event.target.value as PaymentMethod,
                    })
                  }
                >
                  {PAYMENT_METHOD_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="document">Documento / nota</Label>
                <Input
                  id="document"
                  value={form.document}
                  onChange={(event) =>
                    setForm({ ...form, document: event.target.value })
                  }
                  placeholder="NF, boleto, recibo…"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="costCenterId">Centro de custo</Label>
                <select
                  id="costCenterId"
                  className={SELECT_INPUT_CLASS}
                  value={form.costCenterId}
                  onChange={(event) =>
                    setForm({ ...form, costCenterId: event.target.value })
                  }
                >
                  <option value="">Sem centro de custo</option>
                  {options.costCenters.map((costCenter) => (
                    <option key={costCenter.id} value={costCenter.id}>
                      {costCenter.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="observation">Observação</Label>
                <textarea
                  id="observation"
                  rows={2}
                  className={`${SELECT_INPUT_CLASS} h-auto min-h-16 py-2`}
                  value={form.observation}
                  onChange={(event) =>
                    setForm({ ...form, observation: event.target.value })
                  }
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submitForm} disabled={busy}>
              {busy ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Baixa */}
      <Dialog open={Boolean(payingRow)} onOpenChange={(open) => !open && setPayingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Baixar conta</DialogTitle>
            <DialogDescription>
              {payingRow?.description}
            </DialogDescription>
          </DialogHeader>
          {payingRow && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2 rounded-md border bg-muted/30 p-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Valor</p>
                  <p className="font-semibold">{money(payingRow.value)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Já pago</p>
                  <p className="font-semibold text-emerald-700">
                    {money(payingRow.paid)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Saldo</p>
                  <p className="font-semibold">{money(payingRow.balance)}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="payValue">Valor da baixa *</Label>
                  <Input
                    id="payValue"
                    inputMode="decimal"
                    value={payValue}
                    onChange={(event) => setPayValue(event.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Informe menos que o saldo para baixa parcial.
                  </p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="payDate">Data do pagamento</Label>
                  <Input
                    id="payDate"
                    type="date"
                    value={payDate}
                    onChange={(event) => setPayDate(event.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="payMethod">Forma de pagamento</Label>
                  <select
                    id="payMethod"
                    className={SELECT_INPUT_CLASS}
                    value={payMethod}
                    onChange={(event) =>
                      setPayMethod(event.target.value as PaymentMethod)
                    }
                  >
                    {PAYMENT_METHOD_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="payDocument">Documento</Label>
                  <Input
                    id="payDocument"
                    value={payDocument}
                    onChange={(event) => setPayDocument(event.target.value)}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="payNotes">Observação</Label>
                  <Input
                    id="payNotes"
                    value={payNotes}
                    onChange={(event) => setPayNotes(event.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayingId(null)}>
              Cancelar
            </Button>
            <Button onClick={submitPay} disabled={busy}>
              {busy ? "Baixando…" : "Confirmar baixa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Histórico de pagamentos */}
      <Dialog open={Boolean(historyRow)} onOpenChange={(open) => !open && setHistoryId(null)}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pagamentos da conta</DialogTitle>
            <DialogDescription>{historyRow?.description}</DialogDescription>
          </DialogHeader>
          {historyRow && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 rounded-md border bg-muted/30 p-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Valor</p>
                  <p className="font-semibold">{money(historyRow.value)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pago</p>
                  <p className="font-semibold text-emerald-700">
                    {money(historyRow.paid)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Saldo</p>
                  <p className="font-semibold">{money(historyRow.balance)}</p>
                </div>
              </div>

              {historyRow.payments.length === 0 ? (
                <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                  Nenhum pagamento registrado.
                </p>
              ) : (
                <div className="divide-y rounded-md border">
                  {historyRow.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {money(payment.value)} · {dateLabel(payment.date)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {payment.paymentMethod}
                          {payment.createdByName
                            ? ` · por ${payment.createdByName}`
                            : ""}
                          {payment.notes ? ` · ${payment.notes}` : ""}
                        </p>
                        {payment.reversedAt && (
                          <p className="mt-1 text-xs text-destructive">
                            Estornado em {dateLabel(payment.reversedAt)}
                            {payment.reversalReason
                              ? ` · ${payment.reversalReason}`
                              : ""}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {payment.reversedAt ? (
                          <Badge variant="secondary">Estornado</Badge>
                        ) : (
                          <>
                            <Badge variant="outline">Ativo</Badge>
                            {permissions.canPay && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                onClick={() => {
                                  setReversing({ row: historyRow, payment });
                                  setReverseReason("");
                                }}
                              >
                                <RotateCcw className="mr-1 size-3.5" />
                                Estornar
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryId(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Estorno */}
      <Dialog
        open={Boolean(reversing)}
        onOpenChange={(open) => {
          if (!open) {
            setReversing(null);
            setReverseReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Estornar pagamento</DialogTitle>
            <DialogDescription>
              O lançamento no livro caixa será removido e o saldo da conta será
              recalculado.
            </DialogDescription>
          </DialogHeader>
          {reversing && (
            <div className="space-y-3">
              <p className="text-sm">
                Estornar <strong>{money(reversing.payment.value)}</strong> de{" "}
                {dateLabel(reversing.payment.date)} da conta{" "}
                <strong>{reversing.row.description}</strong>?
              </p>
              <div className="space-y-1">
                <Label htmlFor="reverseReason">Motivo (opcional)</Label>
                <Input
                  id="reverseReason"
                  value={reverseReason}
                  onChange={(event) => setReverseReason(event.target.value)}
                  placeholder="Ex.: pagamento lançado em duplicidade"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReversing(null)}>
              Voltar
            </Button>
            <Button variant="destructive" onClick={submitReverse} disabled={busy}>
              {busy ? "Estornando…" : "Confirmar estorno"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancelamento */}
      <Dialog
        open={Boolean(cancellingRow)}
        onOpenChange={(open) => {
          if (!open) {
            setCancellingId(null);
            setCancelReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar conta</DialogTitle>
            <DialogDescription>
              A conta será mantida no histórico como cancelada e não poderá mais
              receber pagamentos.
            </DialogDescription>
          </DialogHeader>
          {cancellingRow && (
            <div className="space-y-3">
              <p className="text-sm">
                Cancelar <strong>{cancellingRow.description}</strong> no valor de{" "}
                <strong>{money(cancellingRow.value)}</strong>?
              </p>
              <div className="space-y-1">
                <Label htmlFor="cancelReason">Motivo (opcional)</Label>
                <Input
                  id="cancelReason"
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancellingId(null)}>
              Voltar
            </Button>
            <Button variant="destructive" onClick={submitCancel} disabled={busy}>
              {busy ? "Cancelando…" : "Confirmar cancelamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Wallet;
  tone?: "danger" | "success";
}) {
  const toneClass =
    tone === "danger"
      ? "text-destructive"
      : tone === "success"
        ? "text-emerald-700"
        : "text-foreground";
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Icon className="size-3.5" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-lg font-semibold ${toneClass}`}>{value}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ row }: { row: PayableRow }) {
  if (row.isOverdue && (row.status === "PENDENTE" || row.status === "PARCIAL")) {
    return (
      <Badge variant="destructive" className="gap-1">
        <Clock className="size-3" />
        Vencida
      </Badge>
    );
  }
  const meta = STATUS_META[row.status] ?? {
    label: row.status,
    variant: "outline" as const,
  };
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}
