"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import type { PaymentMethod } from "@prisma/client";
import { requirePermission } from "@/lib/rbac";
import { scopeFromUser } from "@/lib/scope";
import {
  cancelPayable,
  createPayable,
  payPayable,
  reversePayment,
  updatePayable,
  type PayableInput,
} from "@/services/payables.service";

type ActionResult = { ok: true } | { ok: false; error: string };

function revalidatePayables() {
  for (const path of [
    "/contas-a-pagar",
    "/saidas",
    "/livro-caixa",
    "/dashboard",
    "/relatorios/financeiro",
  ]) {
    revalidatePath(path);
  }
}

function failure(error: unknown): ActionResult {
  return {
    ok: false,
    error: error instanceof Error ? error.message : "Erro inesperado.",
  };
}

export async function createPayableAction(
  input: PayableInput
): Promise<ActionResult> {
  const user = await requirePermission("saidas.create");
  if (!user.churchId) {
    return { ok: false, error: "Nenhuma igreja vinculada ao seu usuário." };
  }
  try {
    await createPayable(
      { userId: user.id, scope: scopeFromUser(user) },
      input
    );
  } catch (error) {
    return failure(error);
  }
  revalidatePayables();
  return { ok: true };
}

export async function updatePayableAction(
  id: string,
  input: Omit<PayableInput, "installments">
): Promise<ActionResult> {
  const user = await requirePermission("saidas.edit");
  if (!user.churchId) {
    return { ok: false, error: "Nenhuma igreja vinculada ao seu usuário." };
  }
  try {
    await updatePayable(
      { userId: user.id, scope: scopeFromUser(user) },
      id,
      input
    );
  } catch (error) {
    return failure(error);
  }
  revalidatePayables();
  return { ok: true };
}

export type PayActionInput = {
  expenseId: string;
  value: number;
  date: string;
  paymentMethod: PaymentMethod;
  document?: string | null;
  notes?: string | null;
};

export async function payPayableAction(
  input: PayActionInput
): Promise<ActionResult> {
  const user = await requirePermission("saidas.baixar");
  if (!user.churchId) {
    return { ok: false, error: "Nenhuma igreja vinculada ao seu usuário." };
  }
  try {
    await payPayable({ userId: user.id, scope: scopeFromUser(user) }, input);
  } catch (error) {
    return failure(error);
  }
  revalidatePayables();
  return { ok: true };
}

export async function reversePaymentAction(
  paymentId: string,
  reason?: string | null
): Promise<ActionResult> {
  const user = await requirePermission("saidas.baixar");
  if (!user.churchId) {
    return { ok: false, error: "Nenhuma igreja vinculada ao seu usuário." };
  }
  try {
    await reversePayment(
      { userId: user.id, scope: scopeFromUser(user) },
      paymentId,
      reason
    );
  } catch (error) {
    return failure(error);
  }
  revalidatePayables();
  return { ok: true };
}

export async function cancelPayableAction(
  id: string,
  reason?: string | null
): Promise<ActionResult> {
  const user = await requirePermission("saidas.cancel");
  if (!user.churchId) {
    return { ok: false, error: "Nenhuma igreja vinculada ao seu usuário." };
  }
  try {
    await cancelPayable(
      { userId: user.id, scope: scopeFromUser(user) },
      id,
      reason
    );
  } catch (error) {
    return failure(error);
  }
  revalidatePayables();
  return { ok: true };
}
