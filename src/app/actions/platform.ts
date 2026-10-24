"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import type { GenericStatus } from "@prisma/client";
import { requirePlatformAdmin } from "@/lib/rbac";
import {
  createChurchWithSubscription,
  setChurchStatus,
  updateChurchBilling,
  updatePlan,
  type ChurchBillingInput,
  type CreateChurchInput,
} from "@/services/platform.service";

function revalidatePlatform() {
  revalidatePath("/super-admin");
  revalidatePath("/super-admin/igrejas");
  revalidatePath("/super-admin/planos");
}

export async function createChurchAction(input: CreateChurchInput) {
  const user = await requirePlatformAdmin();
  try {
    const created = await createChurchWithSubscription(input, user.id);
    revalidatePlatform();
    return { ok: true as const, id: created.id };
  } catch (error) {
    return { ok: false as const, error: (error as Error).message };
  }
}

export async function updateChurchBillingAction(
  id: string,
  input: ChurchBillingInput
) {
  const user = await requirePlatformAdmin();
  try {
    await updateChurchBilling(id, input, user.id);
    revalidatePlatform();
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: (error as Error).message };
  }
}

export async function setChurchStatusAction(
  id: string,
  status: GenericStatus
) {
  const user = await requirePlatformAdmin();
  try {
    await setChurchStatus(id, status, user.id);
    revalidatePlatform();
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: (error as Error).message };
  }
}

export async function updatePlanAction(
  id: string,
  input: {
    name: string;
    description?: string | null;
    price: number;
    minMembers: number;
    maxMembers: number | null;
    active: boolean;
  }
) {
  const user = await requirePlatformAdmin();
  try {
    await updatePlan(id, input, user.id);
    revalidatePath("/super-admin/planos");
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: (error as Error).message };
  }
}
