import "server-only";
import { prisma } from "@/lib/prisma";
import type { AuditAction, Prisma } from "@prisma/client";

type AuditInput = {
  userId?: string | null;
  churchId?: string | null;
  action: AuditAction;
  module: string;
  entity?: string | null;
  entityId?: string | null;
  description?: string | null;
  oldValues?: Prisma.InputJsonValue | null;
  newValues?: Prisma.InputJsonValue | null;
  ip?: string | null;
};

export async function auditLog(input: AuditInput) {
  const {
    userId,
    churchId,
    action,
    module,
    entity,
    entityId,
    description,
    oldValues,
    newValues,
    ip,
  } = input;

  return prisma.auditLog.create({
    data: {
      userId: userId ?? null,
      churchId: churchId ?? null,
      action,
      module,
      entity: entity ?? null,
      entityId: entityId ?? null,
      description: description ?? null,
      oldValues: oldValues ?? undefined,
      newValues: newValues ?? undefined,
      ip: ip ?? null,
    },
  });
}