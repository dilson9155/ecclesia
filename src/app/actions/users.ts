"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { scopeFromUser } from "@/lib/scope";
import {
  createUser,
  updateUser,
  toggleUserActive,
  resetUserPassword,
  type UserActor,
} from "@/services/users.service";

function actorFromSession(user: {
  id: string;
  roles: string[];
  churchId?: string | null;
  sedeId?: string | null;
  congregationId?: string | null;
}): UserActor {
  return { userId: user.id, roles: user.roles, scope: scopeFromUser(user) };
}

export async function createUserAction(input: {
  name: string;
  email: string;
  password: string;
  roleId: string;
  sedeId?: string | null;
  congregationId?: string | null;
  active?: boolean;
}) {
  const user = await requirePermission("usuarios.manage");
  try {
    const created = await createUser(actorFromSession(user), input);
    revalidatePath("/usuarios");
    return { ok: true as const, id: created.id };
  } catch (error) {
    return { ok: false as const, error: (error as Error).message };
  }
}

export async function updateUserAction(
  id: string,
  input: {
    name: string;
    email: string;
    roleId?: string;
    sedeId?: string | null;
    congregationId?: string | null;
    active?: boolean;
    password?: string;
  }
) {
  const user = await requirePermission("usuarios.manage");
  try {
    const updated = await updateUser(actorFromSession(user), id, input);
    revalidatePath("/usuarios");
    return { ok: true as const, id: updated.id };
  } catch (error) {
    return { ok: false as const, error: (error as Error).message };
  }
}

export async function toggleUserActiveAction(id: string) {
  const user = await requirePermission("usuarios.manage");
  try {
    await toggleUserActive(actorFromSession(user), id);
    revalidatePath("/usuarios");
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: (error as Error).message };
  }
}

export async function resetUserPasswordAction(id: string, password: string) {
  const user = await requirePermission("usuarios.manage");
  try {
    await resetUserPassword(actorFromSession(user), id, password);
    revalidatePath("/usuarios");
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: (error as Error).message };
  }
}