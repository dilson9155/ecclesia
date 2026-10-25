import "server-only";
import { randomUUID } from "node:crypto";
import type { PaymentMethod, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  assertCongregationInScope,
  scopedCongregationIdsOrNull,
  type DataScope,
} from "@/lib/scope";
import { auditLog } from "@/services/audit.service";
import {
  assertLedgerPeriodOpen,
  type Actor,
} from "@/services/registration.service";

export const PAYABLE_STATUS_FILTERS = [
  "TODOS",
  "ABERTAS",
  "VENCIDAS",
  "PENDENTE",
  "PARCIAL",
  "PAGO",
  "CANCELADO",
] as const;

export type PayableStatusFilter = (typeof PAYABLE_STATUS_FILTERS)[number];

export type PayableFilters = {
  search?: string;
  status?: PayableStatusFilter;
  congregationId?: string;
  from?: string;
  to?: string;
};

export type PayablePayment = {
  id: string;
  date: string;
  value: number;
  paymentMethod: string;
  document: string | null;
  notes: string | null;
  createdByName: string | null;
  reversedAt: string | null;
  reversedByName: string | null;
  reversalReason: string | null;
};

export type PayableRow = {
  id: string;
  code: string;
  description: string;
  congregationId: string;
  congregationName: string;
  supplierId: string | null;
  supplierName: string | null;
  beneficiary: string | null;
  date: string;
  dueDate: string | null;
  value: number;
  paid: number;
  balance: number;
  status: string;
  paymentMethod: string;
  document: string | null;
  accountId: string;
  accountName: string;
  costCenterId: string | null;
  costCenterName: string | null;
  observation: string | null;
  installmentGroupId: string | null;
  installmentNumber: number | null;
  installmentTotal: number | null;
  isOverdue: boolean;
  payments: PayablePayment[];
};

export type PayableTotals = {
  open: number;
  overdue: number;
  paidPeriod: number;
  count: number;
};

export type PayableListResult = {
  rows: PayableRow[];
  totals: PayableTotals;
};

const MONEY_EPSILON = 0.005;

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00-03:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  const day = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + months);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, lastDay));
  return next;
}

function saoPauloToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function startOfToday(): Date {
  return new Date(`${saoPauloToday()}T00:00:00-03:00`);
}

function monthRange(): { from: Date; to: Date } {
  const iso = saoPauloToday();
  const [year, month] = iso.split("-").map(Number);
  const monthKey = iso.slice(0, 7);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    from: new Date(`${monthKey}-01T00:00:00-03:00`),
    to: new Date(
      `${monthKey}-${String(lastDay).padStart(2, "0")}T23:59:59.999-03:00`
    ),
  };
}

async function congregationScope(scope: DataScope) {
  const ids = await scopedCongregationIdsOrNull(scope);
  return ids;
}

function congregationWhere(ids: string[] | null): Prisma.ExpenseWhereInput {
  if (ids === null) return {};
  return { congregationId: { in: ids.length ? ids : ["__none__"] } };
}

export async function listPayables(
  churchId: string,
  scope: DataScope,
  filters: PayableFilters = {}
): Promise<PayableListResult> {
  const allowedIds = await congregationScope(scope);
  const where: Prisma.ExpenseWhereInput = {
    churchId,
    ...congregationWhere(allowedIds),
  };

  if (filters.congregationId) {
    if (allowedIds && !allowedIds.includes(filters.congregationId)) {
      return { rows: [], totals: { open: 0, overdue: 0, paidPeriod: 0, count: 0 } };
    }
    where.congregationId = filters.congregationId;
  }

  const search = filters.search?.trim();
  if (search) {
    where.OR = [
      { description: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
      { document: { contains: search, mode: "insensitive" } },
      { beneficiary: { contains: search, mode: "insensitive" } },
      { supplier: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  const status = filters.status ?? "ABERTAS";
  if (status === "ABERTAS") {
    where.status = { in: ["PENDENTE", "PARCIAL"] };
  } else if (status === "VENCIDAS") {
    where.status = { in: ["PENDENTE", "PARCIAL"] };
    where.dueDate = { lt: startOfToday() };
  } else if (status !== "TODOS") {
    where.status = status;
  }

  const from = parseDate(filters.from);
  const to = parseDate(filters.to);
  if (from || to) {
    const range: Prisma.DateTimeNullableFilter = {};
    if (from) range.gte = from;
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      range.lte = end;
    }
    const dateRange: Prisma.DateTimeFilter = {};
    if (from) dateRange.gte = from;
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      dateRange.lte = end;
    }
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      {
        OR: [
          { dueDate: range },
          { dueDate: null, date: dateRange },
        ],
      },
    ];
  }

  const expenses = await prisma.expense.findMany({
    where,
    orderBy: [{ dueDate: "asc" }, { date: "asc" }, { code: "asc" }],
    include: {
      supplier: { select: { id: true, name: true } },
      congregation: { select: { id: true, name: true } },
      account: { select: { id: true, name: true } },
      costCenter: { select: { id: true, name: true } },
      payments: {
        orderBy: { date: "asc" },
        include: {
          createdBy: { select: { name: true } },
          reversedBy: { select: { name: true } },
        },
      },
    },
  });

  const today = startOfToday();
  const rows: PayableRow[] = expenses.map((expense) => {
    const value = Number(expense.value);
    const activePayments = expense.payments.filter((p) => !p.reversedAt);
    const paid = round2(
      activePayments.reduce((sum, payment) => sum + Number(payment.value), 0)
    );
    const balance =
      expense.status === "CANCELADO"
        ? 0
        : round2(Math.max(0, value - paid));
    const dueDate = expense.dueDate;
    const isOverdue =
      (expense.status === "PENDENTE" || expense.status === "PARCIAL") &&
      Boolean(dueDate && dueDate < today);

    return {
      id: expense.id,
      code: expense.code,
      description: expense.description,
      congregationId: expense.congregationId,
      congregationName: expense.congregation.name,
      supplierId: expense.supplierId,
      supplierName: expense.supplier?.name ?? null,
      beneficiary: expense.beneficiary,
      date: toIso(expense.date) ?? "",
      dueDate: toIso(expense.dueDate),
      value,
      paid,
      balance,
      status: expense.status,
      paymentMethod: expense.paymentMethod,
      document: expense.document,
      accountId: expense.accountId,
      accountName: expense.account.name,
      costCenterId: expense.costCenterId,
      costCenterName: expense.costCenter?.name ?? null,
      observation: expense.observation,
      installmentGroupId: expense.installmentGroupId,
      installmentNumber: expense.installmentNumber,
      installmentTotal: expense.installmentTotal,
      isOverdue,
      payments: expense.payments.map((payment) => ({
        id: payment.id,
        date: toIso(payment.date) ?? "",
        value: Number(payment.value),
        paymentMethod: payment.paymentMethod,
        document: payment.document,
        notes: payment.notes,
        createdByName: payment.createdBy?.name ?? null,
        reversedAt: payment.reversedAt ? toIso(payment.reversedAt) : null,
        reversedByName: payment.reversedBy?.name ?? null,
        reversalReason: payment.reversalReason,
      })),
    };
  });

  const openRows = rows.filter(
    (row) => row.status === "PENDENTE" || row.status === "PARCIAL"
  );
  const totals: PayableTotals = {
    open: round2(openRows.reduce((sum, row) => sum + row.balance, 0)),
    overdue: round2(
      openRows.filter((row) => row.isOverdue).reduce((sum, row) => sum + row.balance, 0)
    ),
    paidPeriod: 0,
    count: openRows.length,
  };

  const range = monthRange();
  const paidAggregate = await prisma.expensePayment.aggregate({
    where: {
      churchId,
      ...(allowedIds === null
        ? {}
        : { congregationId: { in: allowedIds.length ? allowedIds : ["__none__"] } }),
      reversedAt: null,
      date: { gte: range.from, lte: range.to },
    },
    _sum: { value: true },
  });
  totals.paidPeriod = round2(Number(paidAggregate._sum.value ?? 0));

  return { rows, totals };
}

async function loadExpense(churchId: string, id: string) {
  const expense = await prisma.expense.findFirst({
    where: { id, churchId },
    include: { payments: true },
  });
  if (!expense) throw new Error("Conta não encontrada.");
  return expense;
}

async function assertChurchRecord(
  kind: "account" | "costCenter" | "supplier",
  churchId: string,
  id: string | null | undefined
): Promise<void> {
  if (!id) return;
  if (kind === "account") {
    const found = await prisma.account.findFirst({
      where: { id, churchId },
      select: { id: true },
    });
    if (!found) throw new Error("Conta contábil inválida.");
    return;
  }
  if (kind === "costCenter") {
    const found = await prisma.costCenter.findFirst({
      where: { id, churchId },
      select: { id: true },
    });
    if (!found) throw new Error("Centro de custo inválido.");
    return;
  }
  const found = await prisma.supplier.findFirst({
    where: { id, churchId },
    select: { id: true },
  });
  if (!found) throw new Error("Fornecedor inválido.");
}

export type PayableInput = {
  congregationId: string;
  date: string;
  dueDate?: string | null;
  supplierId?: string | null;
  beneficiary?: string | null;
  description: string;
  value: number;
  paymentMethod: PaymentMethod;
  document?: string | null;
  costCenterId?: string | null;
  accountId: string;
  observation?: string | null;
  installments?: number;
};

function normalizeOptional(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed : null;
}

async function nextExpenseCode(
  tx: Prisma.TransactionClient,
  congregationId: string
): Promise<string> {
  const agg = await tx.expense.aggregate({
    where: { congregationId },
    _max: { code: true },
  });
  const maxCode = agg._max.code;
  const next = maxCode ? Number(maxCode) + 1 : 1;
  return String(Number.isFinite(next) ? next : 1).padStart(4, "0");
}

export async function createPayable(
  actor: Actor,
  input: PayableInput
): Promise<{ ids: string[]; installmentGroupId: string | null }> {
  const churchId = actor.scope.churchId;
  if (!churchId) throw new Error("Nenhuma igreja vinculada ao seu usuário.");

  const description = input.description?.trim();
  if (!description) throw new Error("Informe a descrição da conta.");
  const value = round2(Number(input.value));
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("O valor deve ser maior que zero.");
  }
  if (!input.accountId) throw new Error("Campo obrigatório: Conta contábil.");
  if (!input.congregationId) throw new Error("Campo obrigatório: Congregação.");

  await assertCongregationInScope(actor.scope, input.congregationId);
  const congregation = await prisma.congregation.findFirst({
    where: { id: input.congregationId, churchId },
    select: { id: true },
  });
  if (!congregation) throw new Error("Congregação não encontrada.");
  await assertChurchRecord("account", churchId, input.accountId);
  await assertChurchRecord("costCenter", churchId, input.costCenterId);
  await assertChurchRecord("supplier", churchId, input.supplierId);

  const account = await prisma.account.findFirst({
    where: { id: input.accountId, churchId },
    select: { id: true, accountingCode: true },
  });
  if (!account) throw new Error("Conta contábil inválida.");

  const date = parseDate(input.date) ?? new Date();
  const firstDue = parseDate(input.dueDate) ?? date;
  const installments = Math.min(
    36,
    Math.max(1, Math.trunc(Number(input.installments ?? 1)) || 1)
  );
  const installmentGroupId = installments > 1 ? randomUUID() : null;

  await assertLedgerPeriodOpen("saidas", {
    date,
    congregationId: input.congregationId,
  });

  const ids = await prisma.$transaction(async (tx) => {
    let code = await nextExpenseCode(tx, input.congregationId);
    const created: string[] = [];
    const base = Math.floor((value * 100) / installments) / 100;
    let accumulated = 0;

    for (let index = 0; index < installments; index += 1) {
      const isLast = index === installments - 1;
      const part = isLast ? round2(value - accumulated) : round2(base);
      accumulated = round2(accumulated + part);
      const dueDate = addMonths(firstDue, index);

      const expense = await tx.expense.create({
        data: {
          churchId,
          congregationId: input.congregationId,
          code,
          date,
          dueDate,
          supplierId: normalizeOptional(input.supplierId),
          beneficiary: normalizeOptional(input.beneficiary),
          description:
            installments > 1
              ? `${description} (${index + 1}/${installments})`
              : description,
          value: part,
          paymentMethod: input.paymentMethod,
          document: normalizeOptional(input.document),
          costCenterId: normalizeOptional(input.costCenterId),
          accountId: input.accountId,
          accountingCode: account.accountingCode,
          status: "PENDENTE",
          observation: normalizeOptional(input.observation),
          registeredById: actor.userId,
          installmentGroupId,
          installmentNumber: installments > 1 ? index + 1 : null,
          installmentTotal: installments > 1 ? installments : null,
        },
        select: { id: true },
      });

      created.push(expense.id);
      code = String(Number(code) + 1).padStart(4, "0");
    }

    return created;
  });

  await auditLog({
    userId: actor.userId,
    churchId,
    action: "CREATE",
    module: "saidas",
    entity: "Conta a pagar",
    entityId: ids[0],
    description:
      installments > 1
        ? `Conta "${description}" criada em ${installments} parcelas`
        : `Conta "${description}" criada`,
    newValues: { ids, value, installments, installmentGroupId },
  });

  return { ids, installmentGroupId };
}

export async function updatePayable(
  actor: Actor,
  id: string,
  input: Omit<PayableInput, "installments">
): Promise<void> {
  const churchId = actor.scope.churchId;
  if (!churchId) throw new Error("Nenhuma igreja vinculada ao seu usuário.");
  const expense = await loadExpense(churchId, id);
  await assertCongregationInScope(actor.scope, expense.congregationId);

  if (expense.status === "PAGO") {
    throw new Error("Conta paga não pode ser editada. Estorne os pagamentos primeiro.");
  }
  if (expense.status === "CANCELADO") {
    throw new Error("Conta cancelada não pode ser editada.");
  }

  const activePaid = round2(
    expense.payments
      .filter((payment) => !payment.reversedAt)
      .reduce((sum, payment) => sum + Number(payment.value), 0)
  );
  const value = round2(Number(input.value));
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("O valor deve ser maior que zero.");
  }
  if (activePaid > 0 && Math.abs(value - Number(expense.value)) > MONEY_EPSILON) {
    throw new Error(
      "Esta conta já possui pagamentos. Estorne os pagamentos para alterar o valor."
    );
  }
  if (value + MONEY_EPSILON < activePaid) {
    throw new Error("O valor não pode ser menor que o total já pago.");
  }

  const description = input.description?.trim();
  if (!description) throw new Error("Informe a descrição da conta.");
  if (!input.accountId) throw new Error("Campo obrigatório: Conta contábil.");

  await assertChurchRecord("account", churchId, input.accountId);
  await assertChurchRecord("costCenter", churchId, input.costCenterId);
  await assertChurchRecord("supplier", churchId, input.supplierId);

  const account = await prisma.account.findFirst({
    where: { id: input.accountId, churchId },
    select: { accountingCode: true },
  });
  if (!account) throw new Error("Conta contábil inválida.");

  const date = parseDate(input.date) ?? expense.date;
  await assertLedgerPeriodOpen("saidas", {
    date,
    congregationId: expense.congregationId,
  });

  await prisma.expense.update({
    where: { id },
    data: {
      date,
      dueDate: parseDate(input.dueDate) ?? date,
      supplierId: normalizeOptional(input.supplierId),
      beneficiary: normalizeOptional(input.beneficiary),
      description,
      value,
      paymentMethod: input.paymentMethod,
      document: normalizeOptional(input.document),
      costCenterId: normalizeOptional(input.costCenterId),
      accountId: input.accountId,
      accountingCode: account.accountingCode,
      observation: normalizeOptional(input.observation),
    },
  });

  await auditLog({
    userId: actor.userId,
    churchId,
    action: "UPDATE",
    module: "saidas",
    entity: "Conta a pagar",
    entityId: id,
    description: `Conta "${description}" atualizada`,
  });
}

export type PayPayableInput = {
  expenseId: string;
  value: number;
  date: string;
  paymentMethod: PaymentMethod;
  document?: string | null;
  notes?: string | null;
};

export async function payPayable(
  actor: Actor,
  input: PayPayableInput
): Promise<{ paymentId: string; status: string; balance: number }> {
  const churchId = actor.scope.churchId;
  if (!churchId) throw new Error("Nenhuma igreja vinculada ao seu usuário.");
  const expense = await loadExpense(churchId, input.expenseId);
  await assertCongregationInScope(actor.scope, expense.congregationId);

  if (expense.status === "CANCELADO") {
    throw new Error("Conta cancelada não pode receber pagamento.");
  }
  if (expense.status === "PAGO") {
    throw new Error("Esta conta já está totalmente paga.");
  }

  const total = Number(expense.value);
  const paid = round2(
    expense.payments
      .filter((payment) => !payment.reversedAt)
      .reduce((sum, payment) => sum + Number(payment.value), 0)
  );
  const remaining = round2(total - paid);
  const amount = round2(Number(input.value));
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Informe um valor de pagamento maior que zero.");
  }
  if (amount > remaining + MONEY_EPSILON) {
    throw new Error(
      `O valor informado ultrapassa o saldo devedor de ${remaining.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })}.`
    );
  }

  const paymentDate = parseDate(input.date) ?? new Date();
  await assertLedgerPeriodOpen("saidas", {
    date: paymentDate,
    congregationId: expense.congregationId,
  });

  const result = await prisma.$transaction(async (tx) => {
    const isPartial = amount + MONEY_EPSILON < remaining;
    const cashEntry = await tx.cashEntry.create({
      data: {
        churchId,
        congregationId: expense.congregationId,
        date: paymentDate,
        document: normalizeOptional(input.document) ?? expense.document,
        description: `Saída: ${expense.description}${isPartial ? " (pagamento parcial)" : ""}`,
        nature: "SAIDA",
        value: amount,
        accountId: expense.accountId,
        accountingCode: expense.accountingCode,
        costCenterId: expense.costCenterId,
        sourceType: "SAIDA",
        sourceId: expense.id,
        createdById: actor.userId,
      },
      select: { id: true },
    });

    const payment = await tx.expensePayment.create({
      data: {
        churchId,
        congregationId: expense.congregationId,
        expenseId: expense.id,
        date: paymentDate,
        value: amount,
        paymentMethod: input.paymentMethod,
        document: normalizeOptional(input.document),
        notes: normalizeOptional(input.notes),
        cashEntryId: cashEntry.id,
        createdById: actor.userId,
      },
      select: { id: true },
    });

    const newPaid = round2(paid + amount);
    const status = newPaid + MONEY_EPSILON >= total ? "PAGO" : "PARCIAL";

    await tx.expense.update({
      where: { id: expense.id },
      data: {
        status,
        paymentDate,
        paidAt: status === "PAGO" ? paymentDate : null,
        paidById: actor.userId,
      },
    });

    return {
      paymentId: payment.id,
      status,
      balance: round2(total - newPaid),
    };
  });

  await auditLog({
    userId: actor.userId,
    churchId,
    action: "UPDATE",
    module: "saidas",
    entity: "Conta a pagar",
    entityId: expense.id,
    description:
      result.status === "PAGO"
        ? `Conta "${expense.description}" baixada integralmente`
        : `Baixa parcial de ${amount.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })} na conta "${expense.description}"`,
    newValues: {
      paymentId: result.paymentId,
      amount,
      status: result.status,
    },
  });

  return result;
}

export async function reversePayment(
  actor: Actor,
  paymentId: string,
  reason?: string | null
): Promise<{ status: string; balance: number }> {
  const churchId = actor.scope.churchId;
  if (!churchId) throw new Error("Nenhuma igreja vinculada ao seu usuário.");

  const payment = await prisma.expensePayment.findFirst({
    where: { id: paymentId, churchId },
    include: { expense: true },
  });
  if (!payment) throw new Error("Pagamento não encontrado.");
  await assertCongregationInScope(actor.scope, payment.congregationId);
  if (payment.reversedAt) throw new Error("Este pagamento já foi estornado.");

  await assertLedgerPeriodOpen("saidas", {
    date: payment.date,
    congregationId: payment.congregationId,
  });

  const result = await prisma.$transaction(async (tx) => {
    if (payment.cashEntryId) {
      await tx.cashEntry.deleteMany({
        where: { id: payment.cashEntryId, churchId },
      });
    }

    await tx.expensePayment.update({
      where: { id: payment.id },
      data: {
        reversedAt: new Date(),
        reversedById: actor.userId,
        reversalReason: normalizeOptional(reason),
      },
    });

    const remainingPayments = await tx.expensePayment.findMany({
      where: { expenseId: payment.expenseId, reversedAt: null },
      select: { value: true },
    });
    const paid = round2(
      remainingPayments.reduce((sum, item) => sum + Number(item.value), 0)
    );
    const total = Number(payment.expense.value);
    const status =
      paid <= MONEY_EPSILON
        ? "PENDENTE"
        : paid + MONEY_EPSILON >= total
          ? "PAGO"
          : "PARCIAL";

    await tx.expense.update({
      where: { id: payment.expenseId },
      data: {
        status,
        paidAt: status === "PAGO" ? payment.expense.paidAt : null,
        paymentDate: status === "PENDENTE" ? null : payment.expense.paymentDate,
        paidById: status === "PENDENTE" ? null : payment.expense.paidById,
      },
    });

    return { status, balance: round2(Math.max(0, total - paid)) };
  });

  await auditLog({
    userId: actor.userId,
    churchId,
    action: "UPDATE",
    module: "saidas",
    entity: "Conta a pagar",
    entityId: payment.expenseId,
    description: `Estorno de pagamento na conta "${payment.expense.description}"`,
    newValues: {
      paymentId: payment.id,
      value: Number(payment.value),
      reason: normalizeOptional(reason),
      status: result.status,
    },
  });

  return result;
}

export async function cancelPayable(
  actor: Actor,
  id: string,
  reason?: string | null
): Promise<void> {
  const churchId = actor.scope.churchId;
  if (!churchId) throw new Error("Nenhuma igreja vinculada ao seu usuário.");
  const expense = await loadExpense(churchId, id);
  await assertCongregationInScope(actor.scope, expense.congregationId);

  if (expense.status === "CANCELADO") {
    throw new Error("Esta conta já está cancelada.");
  }
  const activePayments = expense.payments.filter((payment) => !payment.reversedAt);
  if (activePayments.length > 0) {
    throw new Error(
      "Estorne os pagamentos desta conta antes de cancelá-la."
    );
  }

  await assertLedgerPeriodOpen("saidas", {
    date: expense.date,
    congregationId: expense.congregationId,
  });

  await prisma.$transaction(async (tx) => {
    await tx.expense.update({
      where: { id },
      data: {
        status: "CANCELADO",
        cancelledAt: new Date(),
        cancelledById: actor.userId,
        observation: normalizeOptional(reason)
          ? [expense.observation, `Cancelamento: ${normalizeOptional(reason)}`]
              .filter(Boolean)
              .join("\n")
          : expense.observation,
      },
    });
    await tx.cashEntry.deleteMany({
      where: { sourceType: "SAIDA", sourceId: id, churchId },
    });
  });

  await auditLog({
    userId: actor.userId,
    churchId,
    action: "CANCEL",
    module: "saidas",
    entity: "Conta a pagar",
    entityId: id,
    description: `Conta "${expense.description}" cancelada`,
    newValues: { reason: normalizeOptional(reason) },
  });
}

export async function listPayableOptions(scope: DataScope, churchId: string) {
  const allowedIds = await congregationScope(scope);
  const congregationFilter =
    allowedIds === null
      ? { churchId }
      : { churchId, id: { in: allowedIds.length ? allowedIds : ["__none__"] } };

  const [congregations, suppliers, accounts, costCenters] = await Promise.all([
    prisma.congregation.findMany({
      where: congregationFilter,
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.supplier.findMany({
      where: { churchId, status: "ATIVO" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.account.findMany({
      where: { churchId, nature: "DESPESA", status: "ATIVO" },
      orderBy: { accountingCode: "asc" },
      select: { id: true, name: true, accountingCode: true },
    }),
    prisma.costCenter.findMany({
      where: { churchId, status: "ATIVO" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return { congregations, suppliers, accounts, costCenters };
}

export type PayableOptions = Awaited<ReturnType<typeof listPayableOptions>>;
