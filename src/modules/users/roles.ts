export const ROLE_ORDER = [
  "SUPER_ADMIN",
  "ADMIN_SEDE",
  "ADMIN_CONGREGACAO",
  "FINANCEIRO",
  "SECRETARIA",
  "PASTOR",
  "CONSULTA",
] as const;

export type UserRoleName = (typeof ROLE_ORDER)[number];

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Administrador",
  ADMIN_SEDE: "Administrador da Sede",
  ADMIN_CONGREGACAO: "Administrador da Congregação",
  FINANCEIRO: "Financeiro",
  SECRETARIA: "Secretaria",
  PASTOR: "Pastor",
  CONSULTA: "Consulta",
};

export const ROLE_RANK: Record<string, number> = {
  SUPER_ADMIN: 6,
  ADMIN_SEDE: 5,
  ADMIN_CONGREGACAO: 4,
  FINANCEIRO: 3,
  SECRETARIA: 2,
  PASTOR: 1,
  CONSULTA: 0,
};

export function roleRank(roles: string[]): number {
  return roles.reduce(
    (max, r) => Math.max(max, ROLE_RANK[r] ?? 0),
    0
  );
}

export function roleLabel(name: string | null | undefined): string {
  if (!name) return "—";
  return ROLE_LABELS[name] ?? name;
}