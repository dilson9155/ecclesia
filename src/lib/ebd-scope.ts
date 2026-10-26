import "server-only";

import { prisma } from "@/lib/prisma";
import { scopeFromUser, scopedCongregationIdsOrNull } from "@/lib/scope";
import type { EbdScope } from "@/services/ebd.service";
import type { SessionUser } from "@/types/next-auth";

/**
 * Perfis que enxergam todas as classes do seu escopo de congregação.
 * Somente o perfil Professor da EBD fica limitado às classes em que leciona.
 */
const WIDE_EBD_ROLES = new Set([
  "SUPER_ADMIN",
  "ADMIN_SEDE",
  "ADMIN_CONGREGACAO",
  "SUPERINTENDENTE_EBD",
  "SECRETARIA_EBD",
  "SECRETARIA",
  "FINANCEIRO",
  "PASTOR",
  "CONSULTA",
]);

/** Usuário cujo único acesso é o perfil Professor da EBD. */
export function isEbdTeacherOnly(user: SessionUser): boolean {
  return (
    user.roles.includes("PROFESSOR_EBD") &&
    !user.roles.some((role) => WIDE_EBD_ROLES.has(role))
  );
}

/**
 * Monta o escopo da EBD a partir do usuário logado.
 * Professores recebem `classIds` com apenas as suas classes (vazio = nenhuma).
 */
export async function ebdScopeFromUser(user: SessionUser): Promise<EbdScope> {
  const congregationIds = await scopedCongregationIdsOrNull(scopeFromUser(user));
  if (!user.churchId) {
    return { churchId: "", congregationIds, classIds: [] };
  }

  const isProfessor = user.roles.includes("PROFESSOR_EBD");
  const hasWideRole = user.roles.some((role) => WIDE_EBD_ROLES.has(role));
  if (!isProfessor || hasWideRole) {
    return { churchId: user.churchId, congregationIds, classIds: null };
  }

  const teacher = await prisma.ebdTeacher.findUnique({
    where: { userId: user.id },
    select: {
      active: true,
      classes: { select: { classId: true } },
    },
  });

  return {
    churchId: user.churchId,
    congregationIds,
    classIds:
      teacher && teacher.active
        ? Array.from(new Set(teacher.classes.map((item) => item.classId)))
        : [],
  };
}
