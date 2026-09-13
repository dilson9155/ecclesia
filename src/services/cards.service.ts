import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/services/audit.service";

function issueDate() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 2);
  return d;
}

export async function listCards(churchId: string) {
  return prisma.membershipCard.findMany({
    where: { churchId },
    orderBy: { createdAt: "desc" },
    include: {
      member: { select: { id: true, name: true, code: true } },
      congregation: { select: { id: true, name: true } },
    },
  });
}

export async function getCard(churchId: string, cardId: string) {
  return prisma.membershipCard.findFirst({
    where: { id: cardId, churchId },
    include: {
      member: {
        include: {
          congregation: { select: { id: true, name: true, city: true, state: true } },
        },
      },
      congregation: true,
      church: true,
    },
  });
}

export async function getMemberOptionList(churchId: string) {
  return prisma.member.findMany({
    where: { churchId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      code: true,
      congregation: { select: { name: true } },
    },
  });
}

export async function issueCard(
  churchId: string,
  userId: string,
  memberId: string
) {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { congregation: true },
  });
  if (!member) throw new Error("Membro não encontrado.");
  if (member.churchId !== churchId) {
    throw new Error("Registro não pertence à sua igreja.");
  }

  const count = await prisma.membershipCard.count({ where: { churchId } });
  const card = await prisma.membershipCard.create({
    data: {
      churchId,
      congregationId: member.congregationId,
      memberId,
      cardNumber: String(count + 1).padStart(6, "0"),
      validityDate: issueDate(),
      status: "ATIVO",
      qrToken: randomUUID(),
      createdById: userId,
    },
  });

  await auditLog({
    userId,
    churchId,
    action: "CREATE",
    module: "carteirinhas",
    entity: "Carteirinha",
    entityId: card.id,
    description: `Carteirinha emitida para ${member.name}`,
  });
  await auditLog({
    userId,
    churchId,
    action: "PRINT",
    module: "carteirinhas",
    entity: "Carteirinha",
    entityId: card.id,
    description: `Carteirinha ${card.cardNumber} impressa/gerada`,
  });
  return card;
}

export async function cancelCard(
  churchId: string,
  userId: string,
  cardId: string
) {
  const card = await prisma.membershipCard.findFirst({
    where: { id: cardId, churchId },
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