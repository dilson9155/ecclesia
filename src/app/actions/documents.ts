"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { createLetter, deleteLetter } from "@/services/documents.service";
import type { DocumentType } from "@prisma/client";

export type NewLetterInput = {
  memberId?: string | null;
  congregacaoId?: string | null;
  type: DocumentType;
  templateId?: string | null;
  title?: string | null;
  content?: string | null;
  signatureName?: string | null;
};

export async function newLetter(input: NewLetterInput) {
  const user = await requirePermission("cartas.create");
  if (!user.churchId) return { ok: false, error: "Nenhuma igreja vinculada ao seu usuário." };
  try {
    if (!input.title && !input.templateId) {
      return { ok: false, error: "Informe o modelo ou um título para a carta." };
    }
    await createLetter(user.churchId, user.id, {
      memberId: input.memberId,
      congregationId: input.congregacaoId,
      type: input.type,
      templateId: input.templateId,
      title: input.title,
      content: input.content,
      signatureName: input.signatureName,
    });
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
  revalidatePath("/cartas");
  return { ok: true };
}

export async function removeLetter(documentId: string) {
  const user = await requirePermission("cartas.delete");
  if (!user.churchId) return { ok: false, error: "Nenhuma igreja vinculada ao seu usuário." };
  try {
    await deleteLetter(user.churchId, user.id, documentId);
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
  revalidatePath("/cartas");
  return { ok: true };
}