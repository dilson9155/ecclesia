import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { SessionUser } from "@/types/next-auth";

export async function currentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  const user = session.user as SessionUser;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    roles: user.roles ?? [],
    permissions: user.permissions ?? [],
    churchId: user.churchId ?? null,
    sedeId: user.sedeId ?? null,
    congregationId: user.congregationId ?? null,
  };
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function can(user: SessionUser, permission: string): Promise<boolean> {
  return user.permissions.includes("*") || user.permissions.includes(permission);
}

export async function requirePermission(
  permission: string
): Promise<SessionUser> {
  const user = await requireAuth();
  const ok = await can(user, permission);
  if (!ok) {
    redirect("/forbidden");
  }
  return user;
}