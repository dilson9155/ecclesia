import "server-only";
import type { PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/services/audit.service";
import {
  assertCongregationInScope,
  scopedCongregationIdsOrNull,
  type DataScope,
} from "@/lib/scope";
import { assertLedgerPeriodOpen } from "@/services/registration.service";
import { PAYMENT_METHOD_OPTIONS } from "@/modules/registration/definitions";

export type TitheBatchEntry = {
  memberId: string;
  value: number | string;
};

export type TitheBatchInput = {
  congregationId: string;
  date: string;
  accountId: string;
  paymentMethod: PaymentMethod;
  costCenterId?: string | null;
  observation?: string | null;
  entries: TitheBatchEntry[];
};

export async function getTitheBatchOptions(scope: DataScope) {
  if (!scope.churchId) {
    return { congregations: [], members: [], accounts: [], costCenters: [] };
  }

  const allowedIds = await scopedCongregationIdsOrNull(scope);
  const congregationWhere =
    allowedIds === null
      ? { churchId: scope.churchId, status: "ATIVO" as const }
      : {
          churchId: scope.churchId,
          status: "ATIVO" as const,
          id: { in: allowedIds.length ? allowedIds : ["__none__"] },
        };

  const allowedIn = allowedIds === null ? null : allowedIds.length ? allowedIds : ["__none__"];

  const [congregations, members, accounts, costCenters] = await Promise.all([
    prisma.congregation.findMany({
      where: congregationWhere,
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.member.findMany({
      where: {
        churchId: scope.churchId,
        situation: "ATIVO",
        ...(allowedIn ? { congregationId: { in: allowedIn } } : {}),
      },
      select: {
        id: true,
        name: true,
        code: true,
        congregationId: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.account.findMany({
      where: {
        churchId: scope.churchId,
        status: "ATIVO",
        nature: "RECEITA",
        children: { none: {} },
      },
      select: { id: true, name: true, accountingCode: true },
      orderBy: { accountingCode: "asc" },
    }),
    prisma.costCenter.findMany({
      where: {
        churchId: scope.churchId,
        status: "ATIVO",
        ...(allowedIn
          ? {
              OR: [
                { congregationId: null },
                { congregationId: { in: allowedIn } },
              ],
            }
          : {}),
      },
      select: { id: true, name: true, congregationId: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return { congregations, members, accounts, costCenters };
}

function parseDate(value: string): Date {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) throw new Error("Informe uma data válida.");
  return date;
}

function parseValue(value: number | string): number {
  const parsed = Number(String(value).replace(",", "."));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("Todos os valores informados devem ser maiores que zero.");
  }
  return Math.round(parsed * 100) / 100;
}

export async function saveTithesBatch(
  churchId: string,
  userId: string,
  scope: DataScope,
  input: TitheBatchInput
) {
  const congregationId = String(input.congregationId ?? "").trim();
  if (!congregationId) throw new Error("Selecione a congregação.");
  await assertCongregationInScope(scope, congregationId);

  const congregation = await prisma.congregation.findFirst({
    where: { id: congregationId, churchId },
    select: { id: true, name: true },
  });
  if (!congregation) throw new Error("Congregação não encontrada na sua igreja.");

  const date = parseDate(input.date);
  const account = await prisma.account.findFirst({
    where: {
      id: input.accountId,
      churchId,
      status: "ATIVO",
      nature: "RECEITA",
      children: { none: {} },
    },
    select: { id: true, accountingCode: true, name: true },
  });
  if (!account) throw new Error("Selecione uma conta contábil de receita válida.");

  const paymentMethod = PAYMENT_METHOD_OPTIONS.some(
    (option) => option.value === input.paymentMethod
  )
    ? input.paymentMethod
    : null;
  if (!paymentMethod) throw new Error("Selecione uma forma de pagamento válida.");

  let costCenterId: string | null = null;
  if (input.costCenterId) {
    const costCenter = await prisma.costCenter.findFirst({
      where: { id: input.costCenterId, churchId, status: "ATIVO" },
      select: { id: true, congregationId: true },
    });
    if (!costCenter) throw new Error("Centro de custo não encontrado.");
    if (costCenter.congregationId) {
      await assertCongregationInScope(scope, costCenter.congregationId);
    }
    costCenterId = costCenter.id;
  }

  await assertLedgerPeriodOpen("dizimos", { date, congregationId });

  if (!Array.isArray(input.entries)) {
    throw new Error("Informe os membros e valores do lote.");
  }

  const uniqueEntries = new Map<string, number>();
  for (const entry of input.entries) {
    const memberId = String(entry.memberId ?? "").trim();
    if (!memberId) continue;
    uniqueEntries.set(memberId, parseValue(entry.value));
  }

  if (uniqueEntries.size === 0) {
    throw new Error("Informe o valor do dízimo para pelo menos um membro.");
  }
  if (uniqueEntries.size > 500) {
    throw new Error("Um lote pode ter no máximo 500 membros.");
  }

  const memberIds = Array.from(uniqueEntries.keys());
  const members = await prisma.member.findMany({
    where: {
      id: { in: memberIds },
      churchId,
      congregationId,
      situation: "ATIVO",
    },
    select: { id: true, name: true },
  });
  if (members.length !== memberIds.length) {
    throw new Error(
      "Um ou mais membros não estão ativos nesta congregação. Atualize a página e tente novamente."
    );
  }

  const memberNames = new Map(members.map((member) => [member.id, member.name]));
  const observation = input.observation?.trim() || null;
  let total = 0;

  await prisma.$transaction(async (tx) => {
    for (const [memberId, value] of uniqueEntries) {
      total += value;
      const tithe = await tx.tithe.create({
        data: {
          churchId,
          congregationId,
          memberId,
          date,
          value,
          paymentMethod,
          costCenterId,
          accountId: account.id,
          accountingCode: account.accountingCode,
          observation,
          isAnonymous: false,
          registeredById: userId,
        },
      });

      await tx.cashEntry.create({
        data: {
          churchId,
          congregationId,
          date,
          description: `Dízimo em lote - ${memberNames.get(memberId) ?? "Membro"}`,
          nature: "ENTRADA",
          value,
          accountId: account.id,
          accountingCode: account.accountingCode,
          costCenterId,
          sourceType: "DIZIMO",
          sourceId: tithe.id,
          createdById: userId,
        },
      });
    }
  });

  await auditLog({
    userId,
    churchId,
    action: "CREATE",
    module: "dizimos",
    entity: "Dízimo",
    description: `Lançou ${uniqueEntries.size} dízimo(s) em lote na congregação ${congregation.name}`,
    newValues: {
      congregationId,
      date: input.date,
      accountId: account.id,
      accountName: account.name,
      count: uniqueEntries.size,
      total: Math.round(total * 100) / 100,
    },
  });

  return {
    count: uniqueEntries.size,
    total: Math.round(total * 100) / 100,
  };
}
