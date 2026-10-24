"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import type { DocumentType } from "@prisma/client";
import {
  deleteLetterTemplate,
  saveLetterTemplate,
} from "@/services/documents.service";

export type LetterTemplateActionInput = {
  id?: string | null;
  type: DocumentType;
  title: string;
  body: string;
  active: boolean;
};

export async function saveTemplate(input: LetterTemplateActionInput) {
  const user = await requirePermission("cartas.edit");
  if (!user.churchId) {
    return { ok: false, error: "Nenhuma igreja vinculada ao seu usuário." };
  }

  try {
    await saveLetterTemplate(user.churchId, user.id, input);
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }

  revalidatePath("/cartas");
  revalidatePath("/cartas/modelos");
  revalidatePath("/configuracoes");
  return { ok: true };
}

export async function removeTemplate(templateId: string) {
  const user = await requirePermission("cartas.edit");
  if (!user.churchId) {
    return { ok: false, error: "Nenhuma igreja vinculada ao seu usuário." };
  }

  try {
    await deleteLetterTemplate(user.churchId, user.id, templateId);
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }

  revalidatePath("/cartas");
  revalidatePath("/cartas/modelos");
  revalidatePath("/configuracoes");
  return { ok: true };
}
