import "server-only";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/services/audit.service";
import type { DocumentType } from "@prisma/client";

export async function listLetters(churchId: string) {
  return prisma.document.findMany({
    where: { churchId },
    orderBy: { createdAt: "desc" },
    include: {
      member: { select: { id: true, name: true, code: true } },
      congregation: { select: { id: true, name: true } },
      template: { select: { id: true, title: true } },
    },
  });
}

export async function getLetter(churchId: string, documentId: string) {
  return prisma.document.findFirst({
    where: { id: documentId, churchId },
    include: {
      member: true,
      congregation: true,
      church: true,
    },
  });
}

export async function getTemplates(churchId: string) {
  return prisma.letterTemplate.findMany({
    where: { churchId },
    orderBy: { title: "asc" },
  });
}

export async function getMemberOptions(churchId: string) {
  return prisma.member.findMany({
    where: { churchId, situation: "ATIVO" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      code: true,
      congregation: { select: { name: true } },
    },
  });
}

type Ctx = Record<string, string>;

function fmtDate(d?: Date | null): string {
  if (!d) return "";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

export async function buildContext(
  churchId: string,
  memberId?: string | null
): Promise<Ctx> {
  const church = await prisma.church.findUnique({ where: { id: churchId } });
  const member = memberId
    ? await prisma.member.findUnique({
        where: { id: memberId },
        include: { congregation: true },
      })
    : null;
  if (memberId && !member) throw new Error("Membro não encontrado.");

  const congregation = member?.congregation ?? null;
  const city = congregation?.city ?? "";
  const state = congregation?.state ?? "";

  return {
    "{igreja}": church?.legalName || church?.name || "",
    "{legalName}": church?.legalName || "",
    "{cnpj}": church?.cnpj || "",
    "{nome}": member?.name || "",
    "{matricula}": member?.code || "",
    "{congregacao}": congregation?.name || "",
    "{cidade}": city,
    "{uf}": state,
    "{batismo}": fmtDate(member?.baptismDate),
    "{admissao}": fmtDate(member?.receptionDate ?? member?.createdAt),
    "{cargo}": member?.cargo || "",
    "{data}": fmtDate(new Date()),
  };
}

export function renderContent(body: string, ctx: Ctx): string {
  let out = body;
  for (const [key, value] of Object.entries(ctx)) {
    out = out.split(key).join(value);
  }
  return out;
}

type CreateLetterInput = {
  memberId?: string | null;
  congregationId?: string | null;
  type: DocumentType;
  templateId?: string | null;
  title?: string | null;
  content?: string | null;
  signatureName?: string | null;
};

export async function createLetter(
  churchId: string,
  userId: string,
  input: CreateLetterInput
) {
  const template = input.templateId
    ? await prisma.letterTemplate.findFirst({
        where: { id: input.templateId, churchId },
      })
    : null;
  if (input.templateId && !template) {
    throw new Error("Modelo de carta não encontrado.");
  }

  const ctx = await buildContext(churchId, input.memberId);

  const contentBase = input.content && input.content.trim()
    ? input.content
    : template?.body ?? "";
  const content = renderContent(contentBase, ctx);

  const title =
    (input.title && input.title.trim() ? input.title : template?.title) ??
    "Documento";

  const member = input.memberId
    ? await prisma.member.findUnique({ where: { id: input.memberId } })
    : null;
  const congregationId =
    input.congregationId ?? member?.congregationId ?? null;

  const count = await prisma.document.count({ where: { churchId } });
  const now = new Date();
  const protocol = `DOC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${String(count + 1).padStart(4, "0")}`;

  const document = await prisma.document.create({
    data: {
      churchId,
      congregationId,
      memberId: member?.id ?? null,
      type: input.type,
      templateId: template?.id ?? null,
      protocol,
      title,
      content,
      signatureName: input.signatureName || undefined,
      issueDate: now,
      createdById: userId,
    },
  });

  await auditLog({
    userId,
    churchId,
    action: "CREATE",
    module: "cartas",
    entity: "Documento",
    entityId: document.id,
    description: `Documento "${title}" gerado (${input.type})`,
  });
  return document;
}

export async function deleteLetter(
  churchId: string,
  userId: string,
  documentId: string
) {
  const document = await prisma.document.findFirst({
    where: { id: documentId, churchId },
  });
  if (!document) throw new Error("Documento não encontrado.");

  await prisma.document.delete({ where: { id: documentId } });
  await auditLog({
    userId,
    churchId,
    action: "DELETE",
    module: "cartas",
    entity: "Documento",
    entityId: documentId,
    description: `Documento "${document.title}" excluído`,
  });
}