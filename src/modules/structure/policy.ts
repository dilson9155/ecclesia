/**
 * Regras de hierarquia da igreja.
 *
 * SUPER_ADMIN (sem sede) = visão da igreja inteira.
 * ADMIN_SEDE (sede vinculada) = gerencia apenas as congregações da sua sede.
 * ADMIN_CONGREGACAO (congregação vinculada) = somente leitura da própria congregação.
 */
export type StructureScope = {
  sedeId: string | null;
  congregationId: string | null;
  isSuperAdmin: boolean;
};

export function isChurchWide(scope: StructureScope): boolean {
  return scope.isSuperAdmin && !scope.sedeId;
}

export function canCreateSede(scope: StructureScope): boolean {
  return isChurchWide(scope);
}

export function canDeleteSede(scope: StructureScope): boolean {
  return isChurchWide(scope);
}

export function canEditSede(
  scope: StructureScope,
  sedeId: string
): boolean {
  if (isChurchWide(scope)) return true;
  return scope.sedeId === sedeId && !scope.congregationId;
}

export function canManageCongregations(scope: StructureScope): boolean {
  return (
    isChurchWide(scope) ||
    (Boolean(scope.sedeId) && !scope.congregationId)
  );
}

export function canManageCongregationsIn(
  scope: StructureScope,
  sedeId: string
): boolean {
  if (isChurchWide(scope)) return true;
  return scope.sedeId === sedeId && !scope.congregationId;
}
