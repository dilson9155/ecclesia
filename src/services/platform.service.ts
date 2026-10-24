import "server-only";

import bcrypt from "bcryptjs";
import type {
  ChurchStructureType,
  GenericStatus,
  PlanStructureType,
  Prisma,
  SubscriptionStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/services/audit.service";
import { planFeatures } from "@/modules/platform/pricing";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type PlanView = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  structureType: PlanStructureType;
  minMembers: number;
  maxMembers: number | null;
  price: number;
  trialDays: number;
  maxSedes: number | null;
  maxCongregations: number | null;
  active: boolean;
  churches: number;
};

export type ChurchSubscriptionView = {
  planId: string;
  planCode: string;
  planName: string;
  price: number;
  status: SubscriptionStatus;
  startedAt: string;
  currentPeriodEnd: string | null;
};

export type ChurchListItem = {
  id: string;
  name: string;
  legalName: string | null;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  status: GenericStatus;
  structureType: ChurchStructureType;
  sedeMemberCount: number;
  congregationMemberCount: number;
  memberCount: number;
  createdAt: string;
  subscription: ChurchSubscriptionView | null;
  counts: {
    sedes: number;
    congregations: number;
    users: number;
    members: number;
  };
};

export type ChurchBillingInput = {
  name: string;
  legalName?: string | null;
  cnpj?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  structureType: ChurchStructureType;
  sedeMemberCount: number;
  congregationMemberCount: number;
  planId?: string | null;
};

export type CreateChurchInput = ChurchBillingInput & {
  sedeName?: string | null;
  adminName?: string | null;
  adminEmail?: string | null;
  adminPassword?: string | null;
};

export type PlatformOverview = {
  totalChurches: number;
  activeChurches: number;
  inactiveChurches: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  mrr: number;
  totalMembers: number;
  sedeOnlyChurches: number;
  networkChurches: number;
  recentChurches: Array<{
    id: string;
    name: string;
    structureType: ChurchStructureType;
    memberCount: number;
    planName: string | null;
    price: number;
    createdAt: string;
  }>;
};

const churchInclude = {
  subscription: {
    include: { plan: true },
  },
  _count: {
    select: {
      sedes: true,
      congregations: true,
      users: true,
      members: true,
    },
  },
} satisfies Prisma.ChurchInclude;

type ChurchWithBilling = Prisma.ChurchGetPayload<{
  include: typeof churchInclude;
}>;

function serializeChurch(church: ChurchWithBilling): ChurchListItem {
  return {
    id: church.id,
    name: church.name,
    legalName: church.legalName,
    cnpj: church.cnpj,
    email: church.email,
    phone: church.phone,
    notes: church.notes,
    status: church.status,
    structureType: church.structureType,
    sedeMemberCount: church.sedeMemberCount,
    congregationMemberCount: church.congregationMemberCount,
    memberCount: church.memberCount,
    createdAt: church.createdAt.toISOString(),
    subscription: church.subscription
      ? {
          planId: church.subscription.planId,
          planCode: church.subscription.plan.code,
          planName: church.subscription.plan.name,
          price: Number(church.subscription.plan.price),
          status: church.subscription.status,
          startedAt: church.subscription.startedAt.toISOString(),
          currentPeriodEnd:
            church.subscription.currentPeriodEnd?.toISOString() ?? null,
        }
      : null,
    counts: {
      sedes: church._count.sedes,
      congregations: church._count.congregations,
      users: church._count.users,
      members: church._count.members,
    },
  };
}

function toInt(value: unknown, field: string): number {
  const parsed = Math.round(Number(value ?? 0));
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Informe um número válido de ${field}.`);
  }
  return parsed;
}

function normalizeOptional(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed : null;
}

function normalizeEmail(value: string | null | undefined): string | null {
  const email = normalizeOptional(value)?.toLowerCase() ?? null;
  if (email && !EMAIL_RE.test(email)) {
    throw new Error("Informe um e-mail válido.");
  }
  return email;
}

function normalizeStructure(value: unknown): ChurchStructureType {
  if (value === "SEDE_ONLY" || value === "SEDE_AND_CONGREGATIONS") {
    return value;
  }
  throw new Error("Selecione a estrutura da igreja.");
}

function normalizeCounts(input: {
  structureType: ChurchStructureType;
  sedeMemberCount: number;
  congregationMemberCount: number;
}): {
  structureType: ChurchStructureType;
  sedeMemberCount: number;
  congregationMemberCount: number;
  memberCount: number;
} {
  const structureType = normalizeStructure(input.structureType);
  const sedeMemberCount = toInt(input.sedeMemberCount, "membros da sede");
  const congregationMemberCount =
    structureType === "SEDE_ONLY"
      ? 0
      : toInt(input.congregationMemberCount, "membros das congregações");

  return {
    structureType,
    sedeMemberCount,
    congregationMemberCount,
    memberCount: sedeMemberCount + congregationMemberCount,
  };
}

async function resolvePlan(
  structureType: ChurchStructureType,
  memberCount: number,
  planId?: string | null
): Promise<{ id: string; price: number }> {
  if (planId) {
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      select: {
        id: true,
        price: true,
        structureType: true,
        active: true,
      },
    });
    if (!plan || !plan.active) {
      throw new Error("Plano não encontrado ou inativo.");
    }
    if (plan.structureType !== structureType) {
      throw new Error(
        "O plano selecionado não corresponde à estrutura informada para a igreja."
      );
    }
    return {
      id: plan.id,
      price: Number(plan.price),
    };
  }

  const plan = await prisma.plan.findFirst({
    where: {
      active: true,
      structureType,
      minMembers: { lte: memberCount },
      OR: [{ maxMembers: null }, { maxMembers: { gte: memberCount } }],
    },
    orderBy: { minMembers: "desc" },
    select: { id: true, price: true },
  });

  if (!plan) {
    throw new Error(
      "Nenhum plano ativo atende a essa estrutura e quantidade de membros. Configure os planos antes de cadastrar a igreja."
    );
  }

  return {
    id: plan.id,
    price: Number(plan.price),
  };
}

async function assertCnpjAvailable(
  cnpj: string | null,
  ignoreChurchId?: string
): Promise<void> {
  if (!cnpj) return;
  const existing = await prisma.church.findUnique({
    where: { cnpj },
    select: { id: true },
  });
  if (existing && existing.id !== ignoreChurchId) {
    throw new Error("Já existe uma igreja cadastrada com este CNPJ.");
  }
}

function addDays(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

export async function listPlans(): Promise<PlanView[]> {
  const plans = await prisma.plan.findMany({
    orderBy: [{ structureType: "asc" }, { minMembers: "asc" }],
    include: { _count: { select: { subscriptions: true } } },
  });

  return plans.map((plan) => ({
    id: plan.id,
    code: plan.code,
    name: plan.name,
    description: plan.description,
    structureType: plan.structureType,
    minMembers: plan.minMembers,
    maxMembers: plan.maxMembers,
    price: Number(plan.price),
    trialDays: plan.trialDays,
    maxSedes: plan.maxSedes,
    maxCongregations: plan.maxCongregations,
    active: plan.active,
    churches: plan._count.subscriptions,
  }));
}

export async function listChurches(search?: string): Promise<ChurchListItem[]> {
  const term = search?.trim();
  const churches = await prisma.church.findMany({
    where: term
      ? {
          OR: [
            { name: { contains: term, mode: "insensitive" } },
            { legalName: { contains: term, mode: "insensitive" } },
            { cnpj: { contains: term, mode: "insensitive" } },
            { email: { contains: term, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: churchInclude,
    orderBy: { createdAt: "desc" },
  });

  return churches.map(serializeChurch);
}

export async function getPlatformOverview(): Promise<PlatformOverview> {
  const [
    totalChurches,
    activeChurches,
    inactiveChurches,
    subscriptions,
    memberAggregate,
    sedeOnlyChurches,
    networkChurches,
    recent,
  ] = await Promise.all([
    prisma.church.count(),
    prisma.church.count({ where: { status: "ATIVO" } }),
    prisma.church.count({ where: { status: "INATIVO" } }),
    prisma.subscription.findMany({
      select: { status: true, plan: { select: { price: true } } },
    }),
    prisma.church.aggregate({ _sum: { memberCount: true } }),
    prisma.church.count({ where: { structureType: "SEDE_ONLY" } }),
    prisma.church.count({ where: { structureType: "SEDE_AND_CONGREGATIONS" } }),
    prisma.church.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        subscription: { include: { plan: { select: { name: true, price: true } } } },
      },
    }),
  ]);

  const activeSubscriptions = subscriptions.filter(
    (item) => item.status === "ACTIVE"
  ).length;
  const trialSubscriptions = subscriptions.filter(
    (item) => item.status === "TRIALING"
  ).length;
  const mrr = subscriptions
    .filter((item) => item.status === "ACTIVE")
    .reduce((sum, item) => sum + Number(item.plan.price), 0);

  return {
    totalChurches,
    activeChurches,
    inactiveChurches,
    activeSubscriptions,
    trialSubscriptions,
    mrr,
    totalMembers: memberAggregate._sum.memberCount ?? 0,
    sedeOnlyChurches,
    networkChurches,
    recentChurches: recent.map((church) => ({
      id: church.id,
      name: church.name,
      structureType: church.structureType,
      memberCount: church.memberCount,
      planName: church.subscription?.plan.name ?? null,
      price: church.subscription ? Number(church.subscription.plan.price) : 0,
      createdAt: church.createdAt.toISOString(),
    })),
  };
}

export async function createChurchWithSubscription(
  input: CreateChurchInput,
  actorUserId: string
): Promise<{ id: string }> {
  const name = input.name?.trim();
  if (!name || name.length < 2) {
    throw new Error("Informe o nome da igreja.");
  }

  const counts = normalizeCounts(input);
  const cnpj = normalizeOptional(input.cnpj);
  const email = normalizeEmail(input.email);
  await assertCnpjAvailable(cnpj);

  const plan = await resolvePlan(
    counts.structureType,
    counts.memberCount,
    input.planId
  );

  const adminEmail = normalizeEmail(input.adminEmail);
  const adminName = normalizeOptional(input.adminName);
  const adminPassword = input.adminPassword ?? "";
  let adminRoleId: string | null = null;

  if (adminEmail) {
    if (!adminName) throw new Error("Informe o nome do administrador da igreja.");
    if (adminPassword.length < 6) {
      throw new Error("A senha do administrador deve ter no mínimo 6 caracteres.");
    }
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail },
      select: { id: true },
    });
    if (existingUser) {
      throw new Error("Já existe um usuário com o e-mail do administrador.");
    }
    const role = await prisma.role.findUnique({
      where: { name: "SUPER_ADMIN" },
      select: { id: true },
    });
    if (!role) {
      throw new Error(
        "Papel de Super Administrador não encontrado. Execute o seed do sistema."
      );
    }
    adminRoleId = role.id;
  }

  const now = new Date();
  const periodEnd = addDays(30);
  const passwordHash = adminEmail
    ? await bcrypt.hash(adminPassword, 12)
    : null;

  const church = await prisma.$transaction(async (tx) => {
    const created = await tx.church.create({
      data: {
        name,
        legalName: normalizeOptional(input.legalName),
        cnpj,
        email,
        phone: normalizeOptional(input.phone),
        notes: normalizeOptional(input.notes),
        structureType: counts.structureType,
        sedeMemberCount: counts.sedeMemberCount,
        congregationMemberCount: counts.congregationMemberCount,
        memberCount: counts.memberCount,
        status: "ATIVO",
        sedes: {
          create: {
            name: normalizeOptional(input.sedeName) ?? "Sede",
          },
        },
        subscription: {
          create: {
            planId: plan.id,
            status: "ACTIVE",
            startedAt: now,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
          },
        },
      },
    });

    if (adminEmail && adminName && passwordHash && adminRoleId) {
      await tx.user.create({
        data: {
          churchId: created.id,
          name: adminName,
          email: adminEmail,
          passwordHash,
          roles: { create: { roleId: adminRoleId } },
        },
      });
    }

    return created;
  });

  await auditLog({
    userId: actorUserId,
    churchId: church.id,
    action: "CREATE",
    module: "plataforma",
    entity: "Church",
    entityId: church.id,
    description: `Igreja cadastrada na plataforma: ${church.name} — plano ${plan.id}`,
    newValues: {
      structureType: counts.structureType,
      memberCount: counts.memberCount,
      planId: plan.id,
      price: plan.price,
    },
  });

  return { id: church.id };
}

export async function updateChurchBilling(
  id: string,
  input: ChurchBillingInput,
  actorUserId: string
): Promise<{ id: string }> {
  const existing = await prisma.church.findUnique({
    where: { id },
    include: { subscription: true },
  });
  if (!existing) throw new Error("Igreja não encontrada.");

  const name = input.name?.trim();
  if (!name || name.length < 2) {
    throw new Error("Informe o nome da igreja.");
  }

  const counts = normalizeCounts(input);
  const cnpj = normalizeOptional(input.cnpj);
  const email = normalizeEmail(input.email);
  await assertCnpjAvailable(cnpj, id);

  let planId = input.planId ?? existing.subscription?.planId ?? null;
  const currentPlan = planId
    ? await prisma.plan.findUnique({
        where: { id: planId },
        select: {
          id: true,
          structureType: true,
          minMembers: true,
          maxMembers: true,
          active: true,
        },
      })
    : null;

  const currentPlanMatches =
    currentPlan &&
    currentPlan.active &&
    currentPlan.structureType === counts.structureType &&
    counts.memberCount >= currentPlan.minMembers &&
    (currentPlan.maxMembers === null ||
      counts.memberCount <= currentPlan.maxMembers);

  if (!currentPlanMatches) {
    const plan = await resolvePlan(
      counts.structureType,
      counts.memberCount,
      input.planId
    );
    planId = plan.id;
  } else if (!planId) {
    throw new Error("Selecione o plano da igreja.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.church.update({
      where: { id },
      data: {
        name,
        legalName: normalizeOptional(input.legalName),
        cnpj,
        email,
        phone: normalizeOptional(input.phone),
        notes: normalizeOptional(input.notes),
        structureType: counts.structureType,
        sedeMemberCount: counts.sedeMemberCount,
        congregationMemberCount: counts.congregationMemberCount,
        memberCount: counts.memberCount,
      },
    });

    if (existing.subscription) {
      await tx.subscription.update({
        where: { id: existing.subscription.id },
        data: { planId: planId! },
      });
    } else {
      const now = new Date();
      await tx.subscription.create({
        data: {
          churchId: id,
          planId: planId!,
          status: "ACTIVE",
          startedAt: now,
          currentPeriodStart: now,
          currentPeriodEnd: addDays(30),
        },
      });
    }
  });

  await auditLog({
    userId: actorUserId,
    churchId: id,
    action: "UPDATE",
    module: "plataforma",
    entity: "Church",
    entityId: id,
    description: `Assinatura/estrutura atualizada: ${name}`,
    newValues: {
      structureType: counts.structureType,
      memberCount: counts.memberCount,
      planId,
    },
  });

  return { id };
}

export async function setChurchStatus(
  id: string,
  status: GenericStatus,
  actorUserId: string
): Promise<void> {
  if (status !== "ATIVO" && status !== "INATIVO") {
    throw new Error("Status inválido.");
  }
  const church = await prisma.church.findUnique({
    where: { id },
    select: { id: true, name: true, status: true },
  });
  if (!church) throw new Error("Igreja não encontrada.");
  if (church.status === status) return;

  await prisma.church.update({ where: { id }, data: { status } });

  await auditLog({
    userId: actorUserId,
    churchId: id,
    action: "UPDATE",
    module: "plataforma",
    entity: "Church",
    entityId: id,
    description: `Igreja ${status === "ATIVO" ? "reativada" : "inativada"}: ${church.name}`,
    oldValues: { status: church.status },
    newValues: { status },
  });
}

export async function updatePlan(
  id: string,
  input: {
    name: string;
    description?: string | null;
    price: number;
    minMembers: number;
    maxMembers: number | null;
    active: boolean;
  },
  actorUserId: string
): Promise<void> {
  const plan = await prisma.plan.findUnique({
    where: { id },
    select: { id: true, code: true, structureType: true },
  });
  if (!plan) throw new Error("Plano não encontrado.");

  const name = input.name?.trim();
  if (!name) throw new Error("Informe o nome do plano.");

  const price = Number(input.price);
  if (!Number.isFinite(price) || price < 0) {
    throw new Error("Informe um valor válido para o plano.");
  }

  const minMembers = toInt(input.minMembers, "membros inicial");
  const maxMembers =
    input.maxMembers === null || input.maxMembers === undefined
      ? null
      : toInt(input.maxMembers, "membros final");
  if (maxMembers !== null && maxMembers < minMembers) {
    throw new Error("O limite final de membros deve ser maior que o inicial.");
  }

  await prisma.plan.update({
    where: { id },
    data: {
      name,
      description: normalizeOptional(input.description),
      price: price.toFixed(2),
      minMembers,
      maxMembers,
      active: input.active,
    },
  });

  await auditLog({
    userId: actorUserId,
    action: "UPDATE",
    module: "plataforma",
    entity: "Plan",
    entityId: id,
    description: `Plano atualizado: ${name} (${plan.code}) — R$ ${price.toFixed(2)}`,
    newValues: { price, minMembers, maxMembers, active: input.active },
  });
}

export function defaultPlanFeatures(structureType: PlanStructureType): string[] {
  return planFeatures(structureType);
}
