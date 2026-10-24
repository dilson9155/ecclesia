import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/services/audit.service";
import { assertCongregationInScope, type DataScope } from "@/lib/scope";

function issueDate() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 2);
  return d;
}

function congregationIn(ids: string[] | null | undefined) {
  return ids ? { congregationId: { in: ids.length ? ids : ["__none__"] } } : {};
}

export async function listCards(
  churchId: string,
  congregationIds?: string[] | null
) {
  return prisma.membershipCard.findMany({
    where: { churchId, ...congregationIn(congregationIds) },
    orderBy: { createdAt: "desc" },
    include: {
      member: { select: { id: true, name: true, code: true, cpf: true, cargo: true } },
      congregation: { select: { id: true, name: true } },
    },
  });
}

export async function getCard(
  churchId: string,
  cardId: string,
  congregationIds?: string[] | null
) {
  return prisma.membershipCard.findFirst({
    where: {
      id: cardId,
      churchId,
      status: "ATIVO",
      ...congregationIn(congregationIds),
    },
    include: {
      member: {
        include: {
          congregation: { select: { id: true, name: true, city: true, state: true } },
        },
      },
      congregation: { include: { sede: true } },
      church: true,
    },
  });
}

export async function getCardsForPdf(
  churchId: string,
  cardIds: string[],
  congregationIds?: string[] | null
) {
  if (cardIds.length === 0) return [];
  return prisma.membershipCard.findMany({
    where: {
      churchId,
      id: { in: cardIds },
      status: "ATIVO",
      ...congregationIn(congregationIds),
    },
    include: {
      member: {
        include: {
          congregation: { select: { id: true, name: true, city: true, state: true } },
        },
      },
      congregation: { include: { sede: true } },
      church: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getMemberOptionList(
  churchId: string,
  congregationIds?: string[] | null
) {
  return prisma.member.findMany({
    where: { churchId, ...congregationIn(congregationIds) },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      code: true,
      situation: true,
      congregationId: true,
      congregation: { select: { name: true } },
    },
  });
}

export async function issueCards(
  churchId: string,
  userId: string,
  memberIds: string[],
  scope?: DataScope
) {
  const uniqueIds = Array.from(new Set(memberIds.filter(Boolean)));
  if (uniqueIds.length === 0) throw new Error("Selecione pelo menos um membro.");
  if (uniqueIds.length > 200) {
    throw new Error("Selecione no máximo 200 membros por lote.");
  }

  const members = await prisma.member.findMany({
    where: { id: { in: uniqueIds }, churchId },
    include: { congregation: true },
  });
  if (members.length !== uniqueIds.length) {
    throw new Error("Um ou mais membros não foram encontrados na sua igreja.");
  }

  if (scope) {
    for (const member of members) {
      await assertCongregationInScope(scope, member.congregationId);
    }
  }

  const count = await prisma.membershipCard.count({ where: { churchId } });
  const validityDate = issueDate();

  const cards = await prisma.$transaction(async (tx) => {
    const created = [];
    for (const [index, member] of members.entries()) {
      created.push(
        await tx.membershipCard.create({
          data: {
            churchId,
            congregationId: member.congregationId,
            memberId: member.id,
            cardNumber: String(count + index + 1).padStart(6, "0"),
            validityDate,
            status: "ATIVO",
            qrToken: randomUUID(),
            createdById: userId,
          },
        })
      );
    }
    return created;
  });

  await auditLog({
    userId,
    churchId,
    action: "CREATE",
    module: "carteirinhas",
    entity: "Carteirinha",
    description:
      cards.length === 1
        ? `Carteirinha emitida para ${members[0].name}`
        : `${cards.length} carteirinhas emitidas em lote`,
    newValues: { count: cards.length, memberIds: uniqueIds },
  });

  return cards;
}

export async function issueCard(
  churchId: string,
  userId: string,
  memberId: string,
  scope?: DataScope
) {
  const [card] = await issueCards(churchId, userId, [memberId], scope);
  return card;
}

export async function cancelCard(
  churchId: string,
  userId: string,
  cardId: string,
  congregationIds?: string[] | null
) {
  const card = await prisma.membershipCard.findFirst({
    where: { id: cardId, churchId, ...congregationIn(congregationIds) },
    include: { member: { select: { name: true } } },
  });
  if (!card) throw new Error("Carteirinha não encontrada.");
  if (card.status === "CANCELADO") throw new Error("Carteirinha já cancelada.");

  const updated = await prisma.membershipCard.update({
    where: { id: cardId },
    data: { status: "CANCELADO" },
  });
  await auditLog({
    userId,
    churchId,
    action: "CANCEL",
    module: "carteirinhas",
    entity: "Carteirinha",
    entityId: cardId,
    description: `Carteirinha ${card.cardNumber} cancelada`,
  });
  return updated;
}
