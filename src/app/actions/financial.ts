"use server";

import "server-only";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { assertCongregationInScope, scopeFromUser } from "@/lib/scope";

async function assertCongregationOwned(
  congregationId: string,
  churchId: string
): Promise<void> {
  const congregation = await prisma.congregation.findUnique({
    where: { id: congregationId },
    select: { id: true, churchId: true },
  });
  if (!congregation || congregation.churchId !== churchId) {
    throw new Error("Congregação não pertence à sua igreja.");
  }
}

export async function closePeriod(
  congregationId: string,
  year: number,
  month: number,
  observations?: string
) {
  try {
    const user = await requirePermission("fechamento.fechar");
    if (!user.churchId) throw new Error("Igreja não vinculada.");
    await assertCongregationOwned(congregationId, user.churchId);
    await assertCongregationInScope(scopeFromUser(user), congregationId);

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const existing = await prisma.financialClosing.findUnique({
      where: { congregationId_year_month: { congregationId, year, month } },
    });
    if (existing && existing.status === "FECHADO") {
      throw new Error("Período já está fechado.");
    }

    const [revenueAgg, expenseAgg] = await Promise.all([
      prisma.cashEntry.aggregate({
        where: {
          churchId: user.churchId,
          congregationId,
          date: { gte: start, lt: end },
          nature: "ENTRADA",
        },
        _sum: { value: true },
      }),
      prisma.cashEntry.aggregate({
        where: {
          churchId: user.churchId,
          congregationId,
          date: { gte: start, lt: end },
          nature: "SAIDA",
        },
        _sum: { value: true },
      }),
    ]);

    const revenue = revenueAgg._sum.value ?? 0;
    const expense = expenseAgg._sum.value ?? 0;
    const balance = Number(revenue) - Number(expense);

    await prisma.financialClosing.upsert({
      where: { congregationId_year_month: { congregationId, year, month } },
      create: {
        churchId: user.churchId,
        congregationId,
        year,
        month,
        status: "FECHADO",
        revenue,
        expense,
        balance,
        observations,
        closedAt: new Date(),
        closedById: user.id,
      },
      update: {
        status: "FECHADO",
        revenue,
        expense,
        balance,
        observations,
        closedAt: new Date(),
        closedById: user.id,
        reopenedAt: null,
        reopenedById: null,
      },
    });

    revalidatePath("/fechamento");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export async function reopenPeriod(
  congregationId: string,
  year: number,
  month: number
) {
  try {
    const user = await requirePermission("fechamento.reabrir");
    if (!user.churchId) throw new Error("Igreja não vinculada.");
    await assertCongregationOwned(congregationId, user.churchId);
    await assertCongregationInScope(scopeFromUser(user), congregationId);

    const existing = await prisma.financialClosing.findUnique({
      where: { congregationId_year_month: { congregationId, year, month } },
    });
    if (!existing || existing.status === "ABERTO") {
      throw new Error("Período já está aberto.");
    }

    await prisma.financialClosing.update({
      where: { id: existing.id },
      data: { status: "ABERTO", reopenedAt: new Date(), reopenedById: user.id },
    });

    revalidatePath("/fechamento");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}