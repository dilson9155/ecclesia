"use server";

import "server-only";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getResource } from "@/modules/registration/definitions";
import type { ResourceDef } from "@/modules/registration/definitions";
import { requirePermission } from "@/lib/rbac";
import { saveRow, deleteRow } from "@/services/registration.service";
import { runRowAction } from "@/services/actions.service";

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
  return standalone ? [standalone] : [`/estrutura/${resourceKey}`];
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
    await saveRow(resourceKey, { userId: user.id, churchId: user.churchId }, values, null);
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
    await saveRow(resourceKey, { userId: user.id, churchId: user.churchId }, values, id);
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
  for (const p of resourcePaths(resourceKey)) revalidatePath(p);
  return { ok: true };
}

export async function removeRecord(resourceKey: string, id: string) {
  const def = getResource(resourceKey);
  if (!def || !def.canDelete) redirect("/forbidden");
  const user = await authorize(def, "delete");
  if (!user.churchId) return { ok: false, error: "Nenhuma igreja vinculada ao seu usuário." };
  try {
    await deleteRow(resourceKey, { userId: user.id, churchId: user.churchId }, id);
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
    await runRowAction(resourceKey, actionKey, { userId: user.id, churchId: user.churchId }, id);
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
  revalidatePath(`/${resourceKey}`);
  revalidatePath("/membros");
  return { ok: true };
}