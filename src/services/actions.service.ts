import "server-only";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/services/audit.service";
import { assertLedgerPeriodOpen } from "@/services/registration.service";

export type Actor = { userId: string; churchId: string };

async function convertVisitor(actor: Actor, id: string) {
  const visitor = await prisma.visitor.findUnique({ where: { id } });
  if (!visitor) throw new Error("Visitante não encontrado.");
  if (visitor.churchId !== actor.churchId) {
    throw new Error("Registro não pertence à sua igreja.");
  }
  if (visitor.convertedToMemberId) {
    throw new Error("Este visitante já foi convertido em membro.");
  }

  const congregation = await prisma.congregation.findUnique({
    where: { id: visitor.congregationId },
  });
  if (!congregation) throw new Error("Congregação não encontrada.");

  const memberCount = await prisma.member.count({
    where: { congregationId: congregation.id },
  });

  const member = await prisma.member.create({
    data: {
      churchId: actor.churchId,
      congregationId: congregation.id,
      sedeId: congregation.sedeId,
      code: String(memberCount + 1).padStart(4, "0"),
      name: visitor.name,
      phone: visitor.phone,
      whatsapp: visitor.whatsapp,
      email: visitor.email,
      situation: "ATIVO",
    },
  });

  await prisma.visitor.update({
    where: { id },
    data: { convertedToMemberId: member.id },
  });

  await auditLog({
    userId: actor.userId,
    churchId: actor.churchId,
    action: "CREATE",
    module: "membros",
    entity: "Membro",
    entityId: member.id,
    description: `Membro criado por conversão de visitante`,
    newValues: { name: member.name, congregationId: member.congregationId },
  });
  await auditLog({
    userId: actor.userId,
    churchId: actor.churchId,
    action: "UPDATE",
    module: "visitantes",
    entity: "Visitante",
    entityId: visitor.id,
    description: "Visitante convertido em membro",
  });

  return { memberId: member.id };
}

async function baixarSaida(actor: Actor, id: string) {
  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense || expense.churchId !== actor.churchId) {
    throw new Error("Saída não encontrada.");
  }
  if (expense.status === "PAGO") throw new Error("Esta saída já foi baixada.");
  if (expense.status === "CANCELADO") {
    throw new Error("Saída cancelada não pode ser baixada.");
  }
  await assertLedgerPeriodOpen("saidas", {
    date: expense.date,
    congregationId: expense.congregationId,
  });
  await prisma.$transaction(async (tx) => {
    const updated = await tx.expense.update({
      where: { id },
      data: { status: "PAGO", paidAt: new Date(), paidById: actor.userId },
    });
    await tx.cashEntry.deleteMany({ where: { sourceType: "SAIDA", sourceId: updated.id } });
    await tx.cashEntry.create({
      data: {
        churchId: actor.churchId,
        congregationId: updated.congregationId,
        date: updated.date,
        description: `Saída: ${updated.description}`,
        nature: "SAIDA",
        value: updated.value,
        accountId: updated.accountId,
        accountingCode: updated.accountingCode,
        costCenterId: updated.costCenterId,
        sourceType: "SAIDA",
        sourceId: updated.id,
        createdById: actor.userId,
      },
    });
  });
  await auditLog({
    userId: actor.userId,
    churchId: actor.churchId,
    action: "UPDATE",
    module: "saidas",
    entity: "Saída",
    entityId: id,
    description: "Saída baixada (paga)",
    newValues: { status: "PAGO" },
  });
  return { id };
}

async function cancelarSaida(actor: Actor, id: string) {
  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense || expense.churchId !== actor.churchId) {
    throw new Error("Saída não encontrada.");
  }
  if (expense.status === "CANCELADO") {
    throw new Error("Esta saída já foi cancelada.");
  }
  await assertLedgerPeriodOpen("saidas", {
    date: expense.date,
    congregationId: expense.congregationId,
  });
  await prisma.$transaction(async (tx) => {
    const updated = await tx.expense.update({
      where: { id },
      data: { status: "CANCELADO", cancelledAt: new Date(), cancelledById: actor.userId },
    });
    await tx.cashEntry.deleteMany({ where: { sourceType: "SAIDA", sourceId: updated.id } });
  });
  await auditLog({
    userId: actor.userId,
    churchId: actor.churchId,
    action: "CANCEL",
    module: "saidas",
    entity: "Saída",
    entityId: id,
    description: "Saída cancelada",
    newValues: { status: "CANCELADO" },
  });
  return { id };
}

export async function runRowAction(
  resourceKey: string,
  actionKey: string,
  actor: Actor,
  id: string
): Promise<Record<string, unknown>> {
  switch (`${resourceKey}.${actionKey}`) {
    case "visitantes.converter":
      return convertVisitor(actor, id);
    case "saidas.baixar":
      return baixarSaida(actor, id);
    case "saidas.cancelar":
      return cancelarSaida(actor, id);
    default:
      throw new Error("Ação desconhecida para este recurso.");
  }
}