"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import {
  scopeFromUser,
  scopedCongregationIdsOrNull,
} from "@/lib/scope";
import { issueCard, issueCards, cancelCard } from "@/services/cards.service";

export async function emitCard(memberId: string) {
  const user = await requirePermission("carteirinhas.emit");
  if (!user.churchId) return { ok: false, error: "Nenhuma igreja vinculada ao seu usuário." };
  try {
    await issueCard(user.churchId, user.id, memberId, scopeFromUser(user));
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
  revalidatePath("/carteirinhas");
  revalidatePath("/membros");
  return { ok: true };
}

export async function emitCardsBatch(memberIds: string[]) {
  const user = await requirePermission("carteirinhas.emit");
  if (!user.churchId) return { ok: false, error: "Nenhuma igreja vinculada ao seu usuário." };
  try {
    const cards = await issueCards(
      user.churchId,
      user.id,
      memberIds,
      scopeFromUser(user)
    );
    revalidatePath("/carteirinhas");
    revalidatePath("/membros");
    return { ok: true, count: cards.length, cardIds: cards.map((card) => card.id) };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export async function cancelCardById(cardId: string) {
  const user = await requirePermission("carteirinhas.delete");
  if (!user.churchId) return { ok: false, error: "Nenhuma igreja vinculada ao seu usuário." };
  try {
    const congregationIds = await scopedCongregationIdsOrNull(scopeFromUser(user));
    await cancelCard(user.churchId, user.id, cardId, congregationIds);
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
  revalidatePath("/carteirinhas");
  return { ok: true };
}
