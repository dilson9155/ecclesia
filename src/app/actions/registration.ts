"use server";

import "server-only";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getResource } from "@/modules/registration/definitions";
import type { ResourceDef } from "@/modules/registration/definitions";
import { requirePermission } from "@/lib/rbac";
import { saveRow, deleteRow } from "@/services/registration.service";

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
  revalidatePath(`/estrutura/${resourceKey}`);
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
  revalidatePath(`/estrutura/${resourceKey}`);
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
  revalidatePath(`/estrutura/${resourceKey}`);
  return { ok: true };
}