import "server-only";
import { prisma } from "@/lib/prisma";

export type DataScope = {
  churchId: string | null;
  sedeId: string | null;
  congregationId: string | null;
  isSuperAdmin: boolean;
};

export function scopeFromUser(user: {
  churchId?: string | null;
  sedeId?: string | null;
  congregationId?: string | null;
  roles?: string[];
}): DataScope {
  return {
    churchId: user.churchId ?? null,
    sedeId: user.sedeId ?? null,
    congregationId: user.congregationId ?? null,
    isSuperAdmin: (user.roles ?? []).includes("SUPER_ADMIN"),
  };
}

/** Congregações acessíveis a um dado escopo. */
export async function scopedCongregationIds(
  scope: DataScope
): Promise<string[]> {
  if (scope.congregationId) return [scope.congregationId];
  if (scope.sedeId) {
    const rows = await prisma.congregation.findMany({
      where: { sedeId: scope.sedeId },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }
  return [];
}

/** Verifica se a congregação informada pertence à igreja e ao escopo do usuário. */
export async function assertCongregationInScope(
  scope: DataScope,
  congregationId: string | null | undefined
): Promise<void> {
  if (!congregationId) return;
  if (!scope.churchId) {
    throw new Error("Nenhuma igreja vinculada ao seu usuário.");
  }
  const congregation = await prisma.congregation.findUnique({
    where: { id: congregationId },
    select: { id: true, churchId: true },
  });
  if (!congregation || congregation.churchId !== scope.churchId) {
    throw new Error("Essa congregação não pertence à sua igreja.");
  }
  if (scope.isSuperAdmin && !scope.sedeId) return;
  const allowed = await scopedCongregationIds(scope);
  if (!allowed.includes(congregationId)) {
    throw new Error("Essa congregação não pertence ao seu escopo de acesso.");
  }
}