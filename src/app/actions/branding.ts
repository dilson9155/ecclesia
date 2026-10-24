"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { updateChurchBranding } from "@/services/branding.service";

export type BrandingActionInput = {
  logoUrl: string | null;
  pastorName: string;
  pastorSignatureUrl: string | null;
  secretaryName: string;
  secretarySignatureUrl: string | null;
  treasurerName: string;
  treasurerSignatureUrl: string | null;
};

export async function saveBranding(input: BrandingActionInput) {
  const user = await requirePermission("config.edit");
  if (!user.churchId) {
    return { ok: false, error: "Nenhuma igreja vinculada ao seu usuário." };
  }

  try {
    await updateChurchBranding(user.churchId, user.id, input);
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }

  revalidatePath("/configuracoes");
  revalidatePath("/cartas");
  revalidatePath("/relatorios");
  revalidatePath("/carteirinhas");

  return { ok: true };
}
