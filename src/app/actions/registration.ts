"use server";

import "server-only";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getResource } from "@/modules/registration/definitions";
import type { ResourceDef } from "@/modules/registration/definitions";
import { requirePermission } from "@/lib/rbac";
import { saveRow, deleteRow } from "@/services/registration.service";
import { runRowAction } from "@/services/actions.service";
import { saveTithesBatch, type TitheBatchEntry } from "@/services/tithe-batch.service";
import { scopeFromUser } from "@/lib/scope";
import type { PaymentMethod } from "@prisma/client";

const STANDALONE_PATHS: Record<string, string> = {
  membros: "/membros",
  visitantes: "/visitantes",
  contas: "/plano-contas",
  centrosCusto: "/centros-custo",
  dizimos: "/dizimos",
  ofertas: "/ofertas",
  fornecedores: "/fornecedores",
  entradas: "/entradas",
  saidas: "/saidas",
};

function resourcePaths(resourceKey: string): string[] {
  const standalone = STANDALONE_PATHS[resourceKey];
  if (standalone) return [standalone];
  if (resourceKey === "sedes" || resourceKey === "congregacoes") {
    return [`/estrutura/${resourceKey}`, "/estrutura"];
  }
  return [`/estrutura/${resourceKey}`];
}

async function authorize(def: ResourceDef, operation: "create" | "update" | "delete") {
  const permission =
    operation === "create"
      ? def.createPermission
      : operation === "update"
        ? def.editPermission
        : def.deletePermission;
  const user = await requirePermission(permission);
  return user;
}

export async function createRecord(resourceKey: string, values: Record<string, unknown>) {
  const def = getResource(resourceKey);
  if (!def || !def.canCreate) redirect("/forbidden");
  const user = await authorize(def, "create");
  if (!user.churchId) return { ok: false, error: "Nenhuma igreja vinculada ao seu usuário." };
  try {
    await saveRow(resourceKey, { userId: user.id, scope: scopeFromUser(user) }, values, null);
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
  for (const p of resourcePaths(resourceKey)) revalidatePath(p);
  return { ok: true };
}

export async function updateRecord(resourceKey: string, id: string, values: Record<string, unknown>) {
  const def = getResource(resourceKey);
  if (!def) redirect("/forbidden");
  const user = await authorize(def, "update");
  if (!user.churchId) return { ok: false, error: "Nenhuma igreja vinculada ao seu usuário." };
  try {
    await saveRow(resourceKey, { userId: user.id, scope: scopeFromUser(user) }, values, id);
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
  for (const p of resourcePaths(resourceKey)) revalidatePath(p);
  return { ok: true };
}

export type TitheBatchActionInput = {
  congregationId: string;
  date: string;
  accountId: string;
  paymentMethod: PaymentMethod;
  costCenterId?: string | null;
  observation?: string | null;
  entries: TitheBatchEntry[];
};

export type TitheBatchActionResult =
  | { ok: true; count: number; total: number }
  | { ok: false; error: string };

export async function createTithesBatch(
  input: TitheBatchActionInput
): Promise<TitheBatchActionResult> {
  const user = await requirePermission("dizimos.create");
  if (!user.churchId) return { ok: false, error: "Nenhuma igreja vinculada ao seu usuário." };

  try {
    const result = await saveTithesBatch(
      user.churchId,
      user.id,
      scopeFromUser(user),
      input
    );
    revalidatePath("/dizimos");
    revalidatePath("/livro-caixa");
    revalidatePath("/relatorios/contribuicoes");
    return { ok: true, count: result.count, total: result.total };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export async function removeRecord(resourceKey: string, id: string) {
  const def = getResource(resourceKey);
  if (!def || !def.canDelete) redirect("/forbidden");
  const user = await authorize(def, "delete");
  if (!user.churchId) return { ok: false, error: "Nenhuma igreja vinculada ao seu usuário." };
  try {
    await deleteRow(resourceKey, { userId: user.id, scope: scopeFromUser(user) }, id);
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
  for (const p of resourcePaths(resourceKey)) revalidatePath(p);
  return { ok: true };
}

export async function runRowActionById(resourceKey: string, actionKey: string, id: string) {
  const def = getResource(resourceKey);
  const action = def?.actions?.find((a) => a.key === actionKey);
  if (!def || !action) redirect("/forbidden");
  const user = await requirePermission(action.permission);
  if (!user.churchId) return { ok: false, error: "Nenhuma igreja vinculada ao seu usuário." };
  try {
    await runRowAction(resourceKey, actionKey, { userId: user.id, scope: scopeFromUser(user) }, id);
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
  revalidatePath(`/${resourceKey}`);
  revalidatePath("/membros");
  return { ok: true };
}