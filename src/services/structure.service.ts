import "server-only";
import { prisma } from "@/lib/prisma";
import type { DataScope } from "@/lib/scope";
import {
  canCreateSede,
  canManageCongregations,
} from "@/modules/structure/policy";
import type {
  StructureOverviewData,
  StructureSede,
} from "@/modules/structure/types";

function emptyOverview(): StructureOverviewData {
  return {
    sedes: [],
    totals: { sedes: 0, congregations: 0, members: 0, users: 0 },
    canManageSedes: false,
    canManageCongregations: false,
    isSuperAdmin: false,
    scopedSedeId: null,
    scopedCongregationId: null,
    scopeLabel: "Nenhuma unidade",
  };
}

/**
 * Monta a visão hierárquica da estrutura respeitando o escopo do usuário.
 * - Igreja inteira: todas as sedes.
 * - Sede: somente a própria sede e suas congregações.
 * - Congregação: somente a própria congregação (sem vazar totais da sede).
 */
export async function getStructureOverview(
  scope: DataScope
): Promise<StructureOverviewData> {
  if (!scope.churchId) return emptyOverview();

  const sedeWhere = scope.sedeId
    ? { id: scope.sedeId, churchId: scope.churchId }
    : scope.congregationId
      ? {
          churchId: scope.churchId,
          congregations: { some: { id: scope.congregationId } },
        }
      : { churchId: scope.churchId };

  const rows = await prisma.sede.findMany({
    where: sedeWhere,
    orderBy: { name: "asc" },
    include: {
      congregations: {
        where: scope.congregationId
          ? { id: scope.congregationId }
          : undefined,
        orderBy: { name: "asc" },
        include: {
          _count: { select: { members: true, users: true } },
        },
      },
      _count: {
        select: { congregations: true, members: true, users: true },
      },
    },
  });

  const scopedToCongregation = Boolean(scope.congregationId);

  const sedes: StructureSede[] = rows.map((sede) => {
    const congregations = sede.congregations.map((congregation) => ({
      id: congregation.id,
      code: congregation.code,
      name: congregation.name,
      status: congregation.status,
      phone: congregation.phone,
      email: congregation.email,
      address: congregation.address,
      cep: congregation.cep,
      district: congregation.district,
      city: congregation.city,
      state: congregation.state,
      memberCount: congregation._count.members,
      userCount: congregation._count.users,
    }));

    return {
      id: sede.id,
      name: sede.name,
      cnpj: sede.cnpj,
      phone: sede.phone,
      email: sede.email,
      address: sede.address,
      cep: sede.cep,
      district: sede.district,
      city: sede.city,
      state: sede.state,
      status: sede.status,
      congregationCount: scopedToCongregation
        ? congregations.length
        : sede._count.congregations,
      memberCount: scopedToCongregation
        ? congregations.reduce((sum, item) => sum + item.memberCount, 0)
        : sede._count.members,
      userCount: scopedToCongregation
        ? congregations.reduce((sum, item) => sum + item.userCount, 0)
        : sede._count.users,
      congregations,
    };
  });

  const firstSede = sedes[0];
  const firstCongregation = firstSede?.congregations[0];
  const scopeLabel = scope.congregationId
    ? `${firstSede?.name ?? "Sede"} · ${firstCongregation?.name ?? "Congregação"}`
    : scope.sedeId
      ? firstSede?.name ?? "Sede"
      : "Toda a igreja";

  const totalUsers =
    scope.isSuperAdmin && !scope.sedeId
      ? await prisma.user.count({ where: { churchId: scope.churchId } })
      : sedes.reduce((sum, sede) => sum + sede.userCount, 0);

  return {
    sedes,
    totals: {
      sedes: sedes.length,
      congregations: sedes.reduce(
        (sum, sede) => sum + sede.congregationCount,
        0
      ),
      members: sedes.reduce((sum, sede) => sum + sede.memberCount, 0),
      users: totalUsers,
    },
    canManageSedes: canCreateSede(scope),
    canManageCongregations: canManageCongregations(scope),
    isSuperAdmin: scope.isSuperAdmin,
    scopedSedeId: scope.sedeId,
    scopedCongregationId: scope.congregationId,
    scopeLabel,
  };
}
