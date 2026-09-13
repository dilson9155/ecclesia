import "server-only";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/services/audit.service";

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

export async function runRowAction(
  resourceKey: string,
  actionKey: string,
  actor: Actor,
  id: string
): Promise<Record<string, unknown>> {
  switch (`${resourceKey}.${actionKey}`) {
    case "visitantes.converter":
      return convertVisitor(actor, id);
    default:
      throw new Error("Ação desconhecida para este recurso.");
  }
}