import "server-only";

import type { NoticeLevel, PlatformNotice } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/services/audit.service";

export type NoticeView = {
  id: string;
  title: string;
  message: string;
  level: NoticeLevel;
  active: boolean;
  publishedAt: string;
  expiresAt: string | null;
  createdAt: string;
};

export type NoticeInput = {
  title: string;
  message: string;
  level: NoticeLevel;
  active?: boolean;
  expiresAt?: string | null;
};

const LEVELS: NoticeLevel[] = ["INFO", "ALERTA", "URGENTE"];

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T23:59:59-03:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function serialize(notice: PlatformNotice): NoticeView {
  return {
    id: notice.id,
    title: notice.title,
    message: notice.message,
    level: notice.level,
    active: notice.active,
    publishedAt: notice.publishedAt.toISOString(),
    expiresAt: notice.expiresAt?.toISOString() ?? null,
    createdAt: notice.createdAt.toISOString(),
  };
}

function validate(input: NoticeInput) {
  const title = input.title?.trim();
  const message = input.message?.trim();
  if (!title || title.length < 3) throw new Error("Informe o título do comunicado.");
  if (!message || message.length < 3) {
    throw new Error("Escreva a mensagem do comunicado.");
  }
  if (!LEVELS.includes(input.level)) {
    throw new Error("Selecione o nível do comunicado.");
  }
  return { title, message };
}

export async function listNotices(): Promise<NoticeView[]> {
  const notices = await prisma.platformNotice.findMany({
    orderBy: [{ publishedAt: "desc" }],
  });
  return notices.map(serialize);
}

/** Comunicados visíveis para todas as igrejas e congregações. */
export async function listActiveNotices(limit = 12): Promise<NoticeView[]> {
  const now = new Date();
  const notices = await prisma.platformNotice.findMany({
    where: {
      active: true,
      publishedAt: { lte: now },
      OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
    },
    orderBy: [{ publishedAt: "desc" }],
    take: limit,
  });
  return notices.map(serialize);
}

export async function createNotice(
  input: NoticeInput,
  actorUserId: string
): Promise<{ id: string }> {
  const { title, message } = validate(input);

  const notice = await prisma.platformNotice.create({
    data: {
      title,
      message,
      level: input.level,
      active: input.active ?? true,
      expiresAt: parseDate(input.expiresAt),
      createdById: actorUserId,
    },
  });

  await auditLog({
    userId: actorUserId,
    action: "CREATE",
    module: "plataforma",
    entity: "PlatformNotice",
    entityId: notice.id,
    description: `Comunicado publicado: ${title}`,
    newValues: { level: input.level, expiresAt: input.expiresAt ?? null },
  });

  return { id: notice.id };
}

export async function updateNotice(
  id: string,
  input: NoticeInput,
  actorUserId: string
): Promise<void> {
  const existing = await prisma.platformNotice.findUnique({ where: { id } });
  if (!existing) throw new Error("Comunicado não encontrado.");
  const { title, message } = validate(input);

  await prisma.platformNotice.update({
    where: { id },
    data: {
      title,
      message,
      level: input.level,
      active: input.active ?? existing.active,
      expiresAt: parseDate(input.expiresAt),
    },
  });

  await auditLog({
    userId: actorUserId,
    action: "UPDATE",
    module: "plataforma",
    entity: "PlatformNotice",
    entityId: id,
    description: `Comunicado atualizado: ${title}`,
  });
}

export async function setNoticeActive(
  id: string,
  active: boolean,
  actorUserId: string
): Promise<void> {
  const existing = await prisma.platformNotice.findUnique({ where: { id } });
  if (!existing) throw new Error("Comunicado não encontrado.");

  await prisma.platformNotice.update({ where: { id }, data: { active } });

  await auditLog({
    userId: actorUserId,
    action: "UPDATE",
    module: "plataforma",
    entity: "PlatformNotice",
    entityId: id,
    description: `Comunicado ${active ? "reativado" : "desativado"}: ${existing.title}`,
  });
}

export async function deleteNotice(
  id: string,
  actorUserId: string
): Promise<void> {
  const existing = await prisma.platformNotice.findUnique({ where: { id } });
  if (!existing) throw new Error("Comunicado não encontrado.");

  await prisma.platformNotice.delete({ where: { id } });

  await auditLog({
    userId: actorUserId,
    action: "DELETE",
    module: "plataforma",
    entity: "PlatformNotice",
    entityId: id,
    description: `Comunicado removido: ${existing.title}`,
  });
}
