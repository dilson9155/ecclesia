import "server-only";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/services/audit.service";
import { getChurchBranding } from "@/services/branding.service";
import type { DocumentType } from "@prisma/client";
import { assertCongregationInScope, type DataScope } from "@/lib/scope";

function congregationIn(ids: string[] | null | undefined) {
  return ids ? { congregationId: { in: ids.length ? ids : ["__none__"] } } : {};
}

export async function listLetters(
  churchId: string,
  congregationIds?: string[] | null
) {
  return prisma.document.findMany({
    where: { churchId, ...congregationIn(congregationIds) },
    orderBy: { createdAt: "desc" },
    include: {
      member: { select: { id: true, name: true, code: true } },
      congregation: { select: { id: true, name: true } },
      template: { select: { id: true, title: true } },
    },
  });
}

export async function getLetter(
  churchId: string,
  documentId: string,
  congregationIds?: string[] | null
) {
  return prisma.document.findFirst({
    where: { id: documentId, churchId, ...congregationIn(congregationIds) },
    include: {
      member: true,
      congregation: true,
      church: true,
    },
  });
}

export async function getTemplates(churchId: string, onlyActive = false) {
  return prisma.letterTemplate.findMany({
    where: { churchId, ...(onlyActive ? { active: true } : {}) },
    orderBy: [{ title: "asc" }],
  });
}

export type LetterTemplateInput = {
  id?: string | null;
  type: DocumentType;
  title: string;
  body: string;
  active?: boolean;
};

export async function saveLetterTemplate(
  churchId: string,
  userId: string,
  input: LetterTemplateInput
) {
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title) throw new Error("Informe o título do modelo.");
  if (!body) throw new Error("Informe o texto do modelo.");

  const data = {
    type: input.type,
    title,
    body,
    active: input.active ?? true,
  };

  if (input.id) {
    const existing = await prisma.letterTemplate.findFirst({
      where: { id: input.id, churchId },
      select: { id: true },
    });
    if (!existing) throw new Error("Modelo de carta não encontrado.");

    const updated = await prisma.letterTemplate.update({
      where: { id: input.id },
      data,
    });
    await auditLog({
      userId,
      churchId,
      action: "UPDATE",
      module: "cartas",
      entity: "Modelo de carta",
      entityId: updated.id,
      description: `Modelo "${title}" atualizado`,
    });
    return updated;
  }

  const created = await prisma.letterTemplate.create({
    data: { churchId, ...data },
  });
  await auditLog({
    userId,
    churchId,
    action: "CREATE",
    module: "cartas",
    entity: "Modelo de carta",
    entityId: created.id,
    description: `Modelo "${title}" criado`,
  });
  return created;
}

export async function deleteLetterTemplate(
  churchId: string,
  userId: string,
  templateId: string
) {
  const template = await prisma.letterTemplate.findFirst({
    where: { id: templateId, churchId },
    include: { _count: { select: { documents: true } } },
  });
  if (!template) throw new Error("Modelo de carta não encontrado.");

  if (template._count.documents > 0) {
    await prisma.letterTemplate.update({
      where: { id: templateId },
      data: { active: false },
    });
    await auditLog({
      userId,
      churchId,
      action: "UPDATE",
      module: "cartas",
      entity: "Modelo de carta",
      entityId: templateId,
      description: `Modelo "${template.title}" arquivado (possui documentos vinculados)`,
    });
    return;
  }

  await prisma.letterTemplate.delete({ where: { id: templateId } });
  await auditLog({
    userId,
    churchId,
    action: "DELETE",
    module: "cartas",
    entity: "Modelo de carta",
    entityId: templateId,
    description: `Modelo "${template.title}" excluído`,
  });
}

export async function getMemberOptions(
  churchId: string,
  congregationIds?: string[] | null
) {
  return prisma.member.findMany({
    where: { churchId, situation: "ATIVO", ...congregationIn(congregationIds) },
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

const MARITAL_LABELS: Record<string, string> = {
  SOLTEIRO: "Solteiro(a)",
  CASADO: "Casado(a)",
  DIVORCIADO: "Divorciado(a)",
  VIUVO: "Viúvo(a)",
  UNIAO_ESTAVEL: "União estável",
};

export async function buildContext(
  churchId: string,
  memberId?: string | null
): Promise<Ctx> {
  const [church, branding, member] = await Promise.all([
    prisma.church.findUnique({ where: { id: churchId } }),
    getChurchBranding(churchId),
    memberId
      ? prisma.member.findUnique({
          where: { id: memberId },
          include: { congregation: { include: { sede: true } } },
        })
      : Promise.resolve(null),
  ]);
  if (memberId && !member) throw new Error("Membro não encontrado.");
  if (member && member.churchId !== churchId) {
    throw new Error("Membro não pertence à sua igreja.");
  }

  const congregation = member?.congregation ?? null;
  const city = congregation?.city ?? "";
  const state = congregation?.state ?? "";

  return {
    "{igreja}": church?.legalName || church?.name || "",
    "{legalName}": church?.legalName || "",
    "{cnpj}": church?.cnpj || "",
    "{nome}": member?.name || "",
    "{matricula}": member?.code || "",
    "{cpf}": member?.cpf || "",
    "{rg}": member?.rg || "",
    "{nascimento}": fmtDate(member?.birthDate),
    "{estado_civil}": member?.maritalStatus
      ? MARITAL_LABELS[member.maritalStatus] ?? member.maritalStatus
      : "",
    "{congregacao}": congregation?.name || "",
    "{sede}": congregation?.sede?.name || "",
    "{cidade}": city,
    "{uf}": state,
    "{endereco}": member?.address || "",
    "{bairro}": member?.district || "",
    "{cep}": member?.cep || "",
    "{telefone}": member?.phone || member?.whatsapp || "",
    "{email}": member?.email || "",
    "{batismo}": fmtDate(member?.baptismDate),
    "{admissao}": fmtDate(member?.receptionDate ?? member?.createdAt),
    "{cargo}": member?.cargo || "",
    "{ministerio}": member?.ministerio || "",
    "{departamento}": member?.departamento || "",
    "{pastor}": branding.pastor.name,
    "{secretario}": branding.secretary.name,
    "{tesoureiro}": branding.treasurer.name,
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
  input: CreateLetterInput,
  scope?: DataScope
) {
  const template = input.templateId
    ? await prisma.letterTemplate.findFirst({
        where: { id: input.templateId, churchId, active: true },
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
  if (input.memberId && (!member || member.churchId !== churchId)) {
    throw new Error("Membro não pertence à sua igreja.");
  }

  const congregationId =
    input.congregationId ?? member?.congregationId ?? null;
  if (congregationId) {
    const congregation = await prisma.congregation.findUnique({
      where: { id: congregationId },
      select: { id: true, churchId: true },
    });
    if (!congregation || congregation.churchId !== churchId) {
      throw new Error("Congregação não pertence à sua igreja.");
    }
  }
  if (scope) {
    await assertCongregationInScope(scope, congregationId);
  }

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