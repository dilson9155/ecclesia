"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { issueCard, cancelCard } from "@/services/cards.service";

export async function emitCard(memberId: string) {
  const user = await requirePermission("carteirinhas.emit");
  if (!user.churchId) return { ok: false, error: "Nenhuma igreja vinculada ao seu usuário." };
  try {
    await issueCard(user.churchId, user.id, memberId);
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
  revalidatePath("/carteirinhas");
  revalidatePath("/membros");
  return { ok: true };
}

export async function cancelCardById(cardId: string) {
  const user = await requirePermission("carteirinhas.delete");
  if (!user.churchId) return { ok: false, error: "Nenhuma igreja vinculada ao seu usuário." };
  try {
    await cancelCard(user.churchId, user.id, cardId);
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
  revalidatePath("/carteirinhas");
  return { ok: true };
}