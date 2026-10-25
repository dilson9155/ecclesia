"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import {
  scopeFromUser,
  scopedCongregationIdsOrNull,
} from "@/lib/scope";
import { issueCard, issueCards, cancelCard } from "@/services/cards.service";

function parseValidity(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T12:00:00-03:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function emitCard(memberId: string, validityDate?: string | null) {
  const user = await requirePermission("carteirinhas.emit");
  if (!user.churchId) {
    return { ok: false, error: "Nenhuma igreja vinculada ao seu usuário." };
  }
  try {
    await issueCard(
      user.churchId,
      user.id,
      memberId,
      parseValidity(validityDate),
      scopeFromUser(user)
    );
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
  revalidatePath("/carteirinhas");
  revalidatePath("/membros");
  return { ok: true };
}

export async function emitCardsBatch(
  memberIds: string[],
  validityDate?: string | null
) {
  const user = await requirePermission("carteirinhas.emit");
  if (!user.churchId) {
    return { ok: false, error: "Nenhuma igreja vinculada ao seu usuário." };
  }
  try {
    const cards = await issueCards(
      user.churchId,
      user.id,
      memberIds,
      parseValidity(validityDate),
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
  if (!user.churchId) {
    return { ok: false, error: "Nenhuma igreja vinculada ao seu usuário." };
  }
  try {
    const congregationIds = await scopedCongregationIdsOrNull(scopeFromUser(user));
    await cancelCard(user.churchId, user.id, cardId, congregationIds);
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
  revalidatePath("/carteirinhas");
  return { ok: true };
}
