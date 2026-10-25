import "server-only";

import type { ChargeStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/services/audit.service";

export type ChargeView = {
  id: string;
  churchId: string;
  churchName: string;
  planId: string | null;
  planName: string | null;
  description: string;
  referenceMonth: string;
  amount: number;
  dueDate: string;
  status: ChargeStatus;
  effectiveStatus: ChargeStatus;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
};

export type ChargeOverview = {
  pending: number;
  overdue: number;
  received: number;
  cancelled: number;
  countPending: number;
  countOverdue: number;
};

export type ChargeInput = {
  churchId: string;
  description?: string | null;
  referenceMonth: string;
  amount: number;
  dueDate: string;
  notes?: string | null;
};

const chargeInclude = {
  church: { select: { id: true, name: true } },
  plan: { select: { id: true, name: true } },
} satisfies Prisma.ChurchChargeInclude;

type ChargeWithRelations = Prisma.ChurchChargeGetPayload<{
  include: typeof chargeInclude;
}>;

const MONTH_RE = /^\d{4}-\d{2}$/;

export function saoPauloToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function todayStart(): Date {
  return new Date(`${saoPauloToday()}T00:00:00-03:00`);
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T12:00:00-03:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function currentReferenceMonth(): string {
  return saoPauloToday().slice(0, 7);
}

export function monthLabel(referenceMonth: string): string {
  const [year, month] = referenceMonth.split("-").map(Number);
  if (!year || !month) return referenceMonth;
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function effectiveStatus(
  status: ChargeStatus,
  dueDate: Date
): ChargeStatus {
  if (status === "PENDENTE" && dueDate < todayStart()) return "VENCIDA";
  return status;
}

function serializeCharge(charge: ChargeWithRelations): ChargeView {
  return {
    id: charge.id,
    churchId: charge.churchId,
    churchName: charge.church.name,
    planId: charge.planId,
    planName: charge.plan?.name ?? null,
    description: charge.description,
    referenceMonth: charge.referenceMonth,
    amount: Number(charge.amount),
    dueDate: toIso(charge.dueDate) ?? "",
    status: charge.status,
    effectiveStatus: effectiveStatus(charge.status, charge.dueDate),
    paidAt: toIso(charge.paidAt),
    notes: charge.notes,
    createdAt: charge.createdAt.toISOString(),
  };
}

export async function listCharges(filters?: {
  status?: string;
  month?: string;
  search?: string;
}): Promise<ChargeView[]> {
  const where: Prisma.ChurchChargeWhereInput = {};
  const status = filters?.status ?? "TODAS";

  if (status === "ABERTAS") {
    where.status = "PENDENTE";
  } else if (status === "VENCIDAS") {
    where.status = "PENDENTE";
    where.dueDate = { lt: todayStart() };
  } else if (status !== "TODAS") {
    where.status = status as ChargeStatus;
  }

  if (filters?.month && MONTH_RE.test(filters.month)) {
    where.referenceMonth = filters.month;
  }

  const search = filters?.search?.trim();
  if (search) {
    where.church = { name: { contains: search, mode: "insensitive" } };
  }

  const charges = await prisma.churchCharge.findMany({
    where,
    include: chargeInclude,
    orderBy: [{ dueDate: "desc" }, { createdAt: "desc" }],
  });

  return charges.map(serializeCharge);
}

export async function getChargeOverview(): Promise<ChargeOverview> {
  const month = currentReferenceMonth();
  const [year, monthNumber] = month.split("-").map(Number);
  const monthStart = new Date(
    `${month}-01T00:00:00-03:00`
  );
  const nextMonth = new Date(
    Date.UTC(monthNumber === 12 ? year + 1 : year, monthNumber === 12 ? 0 : monthNumber, 1)
  );
  const monthEnd = new Date(
    `${nextMonth.toISOString().slice(0, 7)}-01T00:00:00-03:00`
  );

  const [pending, overdue, received, cancelled, countPending, countOverdue] =
    await Promise.all([
      prisma.churchCharge.aggregate({
        where: { status: "PENDENTE", dueDate: { gte: todayStart() } },
        _sum: { amount: true },
      }),
      prisma.churchCharge.aggregate({
        where: { status: "PENDENTE", dueDate: { lt: todayStart() } },
        _sum: { amount: true },
      }),
      prisma.churchCharge.aggregate({
        where: {
          status: "PAGA",
          paidAt: { gte: monthStart, lt: monthEnd },
        },
        _sum: { amount: true },
      }),
      prisma.churchCharge.aggregate({
        where: { status: "CANCELADA" },
        _sum: { amount: true },
      }),
      prisma.churchCharge.count({
        where: { status: "PENDENTE", dueDate: { gte: todayStart() } },
      }),
      prisma.churchCharge.count({
        where: { status: "PENDENTE", dueDate: { lt: todayStart() } },
      }),
    ]);

  return {
    pending: round2(Number(pending._sum.amount ?? 0)),
    overdue: round2(Number(overdue._sum.amount ?? 0)),
    received: round2(Number(received._sum.amount ?? 0)),
    cancelled: round2(Number(cancelled._sum.amount ?? 0)),
    countPending,
    countOverdue,
  };
}

async function loadChurchWithPlan(churchId: string) {
  const church = await prisma.church.findUnique({
    where: { id: churchId },
    include: { subscription: { include: { plan: true } } },
  });
  if (!church) throw new Error("Igreja não encontrada.");
  return church;
}

export async function createCharge(
  input: ChargeInput,
  actorUserId: string
): Promise<{ id: string }> {
  const church = await loadChurchWithPlan(input.churchId);

  if (!MONTH_RE.test(input.referenceMonth ?? "")) {
    throw new Error("Informe o mês de referência.");
  }
  const dueDate = parseDate(input.dueDate);
  if (!dueDate) throw new Error("Informe o vencimento da cobrança.");

  const amount = round2(Number(input.amount));
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Informe um valor válido para a cobrança.");
  }

  const charge = await prisma.churchCharge.create({
    data: {
      churchId: church.id,
      planId: church.subscription?.planId ?? null,
      description:
        input.description?.trim() ||
        `Mensalidade ${monthLabel(input.referenceMonth)}`,
      referenceMonth: input.referenceMonth,
      amount: amount.toFixed(2),
      dueDate,
      status: "PENDENTE",
      notes: input.notes?.trim() || null,
      createdById: actorUserId,
    },
  });

  await auditLog({
    userId: actorUserId,
    churchId: church.id,
    action: "CREATE",
    module: "plataforma",
    entity: "ChurchCharge",
    entityId: charge.id,
    description: `Cobrança criada para ${church.name}: ${charge.description} — R$ ${amount.toFixed(2)}`,
    newValues: {
      referenceMonth: input.referenceMonth,
      amount,
      dueDate: input.dueDate,
    },
  });

  return { id: charge.id };
}

export async function updateCharge(
  id: string,
  input: Omit<ChargeInput, "churchId">,
  actorUserId: string
): Promise<void> {
  const existing = await prisma.churchCharge.findUnique({
    where: { id },
    include: { church: { select: { id: true, name: true } } },
  });
  if (!existing) throw new Error("Cobrança não encontrada.");
  if (existing.status === "PAGA") {
    throw new Error("Cobrança já paga não pode ser editada. Cancele antes.");
  }
  if (existing.status === "CANCELADA") {
    throw new Error("Cobrança cancelada não pode ser editada.");
  }

  if (!MONTH_RE.test(input.referenceMonth ?? "")) {
    throw new Error("Informe o mês de referência.");
  }
  const dueDate = parseDate(input.dueDate);
  if (!dueDate) throw new Error("Informe o vencimento da cobrança.");

  const amount = round2(Number(input.amount));
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Informe um valor válido para a cobrança.");
  }

  await prisma.churchCharge.update({
    where: { id },
    data: {
      description:
        input.description?.trim() ||
        `Mensalidade ${monthLabel(input.referenceMonth)}`,
      referenceMonth: input.referenceMonth,
      amount: amount.toFixed(2),
      dueDate,
      notes: input.notes?.trim() || null,
    },
  });

  await auditLog({
    userId: actorUserId,
    churchId: existing.churchId,
    action: "UPDATE",
    module: "plataforma",
    entity: "ChurchCharge",
    entityId: id,
    description: `Cobrança atualizada (${existing.church.name})`,
    oldValues: {
      amount: Number(existing.amount),
      dueDate: toIso(existing.dueDate),
    },
    newValues: { amount, dueDate: input.dueDate },
  });
}

export async function setChargePaid(
  id: string,
  actorUserId: string,
  paidDate?: string | null
): Promise<void> {
  const existing = await prisma.churchCharge.findUnique({
    where: { id },
    include: { church: { select: { name: true } } },
  });
  if (!existing) throw new Error("Cobrança não encontrada.");
  if (existing.status === "PAGA") throw new Error("Cobrança já está paga.");
  if (existing.status === "CANCELADA") {
    throw new Error("Cobrança cancelada não pode ser baixada.");
  }

  const paidAt = parseDate(paidDate) ?? new Date();

  await prisma.churchCharge.update({
    where: { id },
    data: { status: "PAGA", paidAt },
  });

  await auditLog({
    userId: actorUserId,
    churchId: existing.churchId,
    action: "UPDATE",
    module: "plataforma",
    entity: "ChurchCharge",
    entityId: id,
    description: `Cobrança baixada como paga (${existing.church.name})`,
    newValues: { status: "PAGA", paidAt: paidAt.toISOString() },
  });
}

export async function setChargePending(
  id: string,
  actorUserId: string
): Promise<void> {
  const existing = await prisma.churchCharge.findUnique({
    where: { id },
    include: { church: { select: { name: true } } },
  });
  if (!existing) throw new Error("Cobrança não encontrada.");
  if (existing.status !== "PAGA") {
    throw new Error("Somente cobranças pagas podem ser reabertas.");
  }

  await prisma.churchCharge.update({
    where: { id },
    data: { status: "PENDENTE", paidAt: null },
  });

  await auditLog({
    userId: actorUserId,
    churchId: existing.churchId,
    action: "UPDATE",
    module: "plataforma",
    entity: "ChurchCharge",
    entityId: id,
    description: `Baixa da cobrança desfeita (${existing.church.name})`,
  });
}

export async function cancelCharge(
  id: string,
  reason: string | null,
  actorUserId: string
): Promise<void> {
  const existing = await prisma.churchCharge.findUnique({
    where: { id },
    include: { church: { select: { name: true } } },
  });
  if (!existing) throw new Error("Cobrança não encontrada.");
  if (existing.status === "CANCELADA") {
    throw new Error("Cobrança já cancelada.");
  }
  if (existing.status === "PAGA") {
    throw new Error("Desfaça a baixa antes de cancelar a cobrança.");
  }

  const note = reason?.trim();
  await prisma.churchCharge.update({
    where: { id },
    data: {
      status: "CANCELADA",
      notes: note
        ? [existing.notes, `Cancelada: ${note}`].filter(Boolean).join("\n")
        : existing.notes,
    },
  });

  await auditLog({
    userId: actorUserId,
    churchId: existing.churchId,
    action: "CANCEL",
    module: "plataforma",
    entity: "ChurchCharge",
    entityId: id,
    description: `Cobrança cancelada (${existing.church.name})`,
    newValues: { reason: note ?? null },
  });
}

export async function generateMonthlyCharges(
  referenceMonth: string,
  dueDay: number,
  actorUserId: string
): Promise<{ created: number; skipped: number }> {
  if (!MONTH_RE.test(referenceMonth ?? "")) {
    throw new Error("Informe o mês de referência.");
  }
  const day = Math.min(Math.max(Math.round(dueDay || 10), 1), 28);
  const [year, month] = referenceMonth.split("-").map(Number);
  const dueDate = new Date(
    `${referenceMonth}-${String(day).padStart(2, "0")}T12:00:00-03:00`
  );
  if (Number.isNaN(dueDate.getTime()) || year < 2000 || month < 1) {
    throw new Error("Mês de referência inválido.");
  }

  const churches = await prisma.church.findMany({
    where: { status: "ATIVO", subscription: { isNot: null } },
    include: { subscription: { include: { plan: true } } },
  });

  const existing = await prisma.churchCharge.findMany({
    where: { referenceMonth },
    select: { churchId: true },
  });
  const alreadyCharged = new Set(existing.map((item) => item.churchId));

  let created = 0;
  let skipped = 0;

  for (const church of churches) {
    const subscription = church.subscription;
    if (!subscription) {
      skipped += 1;
      continue;
    }
    if (alreadyCharged.has(church.id)) {
      skipped += 1;
      continue;
    }

    const amount = round2(Number(subscription.plan.price));
    if (amount <= 0) {
      skipped += 1;
      continue;
    }

    await prisma.churchCharge.create({
      data: {
        churchId: church.id,
        planId: subscription.planId,
        description: `Mensalidade ${monthLabel(referenceMonth)}`,
        referenceMonth,
        amount: amount.toFixed(2),
        dueDate,
        status: "PENDENTE",
        createdById: actorUserId,
      },
    });
    created += 1;
  }

  await auditLog({
    userId: actorUserId,
    action: "CREATE",
    module: "plataforma",
    entity: "ChurchCharge",
    description: `Cobranças de ${referenceMonth} geradas: ${created} criada(s), ${skipped} ignorada(s)`,
    newValues: { referenceMonth, dueDay: day, created, skipped },
  });

  return { created, skipped };
}

export async function listChurchCharges(
  churchId: string
): Promise<ChargeView[]> {
  const charges = await prisma.churchCharge.findMany({
    where: { churchId },
    include: chargeInclude,
    orderBy: [{ dueDate: "desc" }],
  });
  return charges.map(serializeCharge);
}

export async function getChurchChargeSummary(churchId: string): Promise<{
  open: ChargeView | null;
  openAmount: number;
  overdueAmount: number;
  paidThisYear: number;
}> {
  const charges = await listChurchCharges(churchId);
  const openCharges = charges
    .filter((charge) => charge.status === "PENDENTE")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const open = openCharges[0] ?? null;
  const overdueAmount = round2(
    openCharges
      .filter((charge) => charge.effectiveStatus === "VENCIDA")
      .reduce((sum, charge) => sum + charge.amount, 0)
  );
  const year = saoPauloToday().slice(0, 4);
  const paidThisYear = round2(
    charges
      .filter(
        (charge) =>
          charge.status === "PAGA" && charge.paidAt?.startsWith(year)
      )
      .reduce((sum, charge) => sum + charge.amount, 0)
  );

  return {
    open,
    openAmount: round2(openCharges.reduce((sum, charge) => sum + charge.amount, 0)),
    overdueAmount,
    paidThisYear,
  };
}
