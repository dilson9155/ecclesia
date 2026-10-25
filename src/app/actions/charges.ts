"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/lib/rbac";
import {
  cancelCharge,
  createCharge,
  generateMonthlyCharges,
  setChargePaid,
  setChargePending,
  updateCharge,
  type ChargeInput,
} from "@/services/charges.service";

function revalidateCharges() {
  revalidatePath("/super-admin");
  revalidatePath("/super-admin/cobrancas");
  revalidatePath("/cobranca");
  revalidatePath("/dashboard");
}

export async function createChargeAction(input: ChargeInput) {
  const user = await requirePlatformAdmin();
  try {
    const created = await createCharge(input, user.id);
    revalidateCharges();
    return { ok: true as const, id: created.id };
  } catch (error) {
    return { ok: false as const, error: (error as Error).message };
  }
}

export async function updateChargeAction(
  id: string,
  input: Omit<ChargeInput, "churchId">
) {
  const user = await requirePlatformAdmin();
  try {
    await updateCharge(id, input, user.id);
    revalidateCharges();
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: (error as Error).message };
  }
}

export async function setChargePaidAction(id: string, paidDate?: string | null) {
  const user = await requirePlatformAdmin();
  try {
    await setChargePaid(id, user.id, paidDate);
    revalidateCharges();
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: (error as Error).message };
  }
}

export async function setChargePendingAction(id: string) {
  const user = await requirePlatformAdmin();
  try {
    await setChargePending(id, user.id);
    revalidateCharges();
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: (error as Error).message };
  }
}

export async function cancelChargeAction(id: string, reason: string | null) {
  const user = await requirePlatformAdmin();
  try {
    await cancelCharge(id, reason, user.id);
    revalidateCharges();
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: (error as Error).message };
  }
}

export async function generateMonthlyChargesAction(
  referenceMonth: string,
  dueDay: number
) {
  const user = await requirePlatformAdmin();
  try {
    const result = await generateMonthlyCharges(referenceMonth, dueDay, user.id);
    revalidateCharges();
    return { ok: true as const, ...result };
  } catch (error) {
    return { ok: false as const, error: (error as Error).message };
  }
}
