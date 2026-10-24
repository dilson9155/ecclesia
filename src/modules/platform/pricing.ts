import type { PlanStructureType, SubscriptionStatus } from "@prisma/client";

export const STRUCTURE_TYPE_LABELS: Record<PlanStructureType, string> = {
  SEDE_ONLY: "Somente sede",
  SEDE_AND_CONGREGATIONS: "Sede + congregações",
};

export const STRUCTURE_TYPE_DESCRIPTIONS: Record<PlanStructureType, string> = {
  SEDE_ONLY: "Igreja com uma única unidade (sede), sem congregações.",
  SEDE_AND_CONGREGATIONS: "Igreja com sede e uma ou mais congregações vinculadas.",
};

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  TRIALING: "Em teste",
  ACTIVE: "Ativa",
  PAST_DUE: "Em atraso",
  SUSPENDED: "Suspensa",
  CANCELED: "Cancelada",
  EXPIRED: "Expirada",
};

export const SUBSCRIPTION_STATUS_VARIANTS: Record<
  SubscriptionStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  TRIALING: "secondary",
  ACTIVE: "default",
  PAST_DUE: "destructive",
  SUSPENDED: "destructive",
  CANCELED: "outline",
  EXPIRED: "outline",
};

export type DefaultPlan = {
  code: string;
  name: string;
  description: string;
  structureType: PlanStructureType;
  minMembers: number;
  maxMembers: number | null;
  price: number;
  maxSedes: number | null;
  maxCongregations: number | null;
};

const FEATURES = [
  "Dashboard e indicadores",
  "Membros, visitantes e carteirinhas",
  "Cartas e declarações em PDF",
  "Dízimos, ofertas e livro caixa",
  "Relatórios e fechamento mensal",
  "Usuários com controle de acesso",
];

const NETWORK_FEATURES = [
  ...FEATURES,
  "Gestão de sede e congregações",
  "Relatórios consolidados por unidade",
];

export const DEFAULT_PLANS: DefaultPlan[] = [
  {
    code: "SEDE_50",
    name: "Sede Essencial",
    description: "Para igrejas de sede única com até 50 membros.",
    structureType: "SEDE_ONLY",
    minMembers: 0,
    maxMembers: 50,
    price: 59.9,
    maxSedes: 1,
    maxCongregations: 0,
  },
  {
    code: "SEDE_100",
    name: "Sede Crescimento",
    description: "Para igrejas de sede única com 51 a 100 membros.",
    structureType: "SEDE_ONLY",
    minMembers: 51,
    maxMembers: 100,
    price: 89.9,
    maxSedes: 1,
    maxCongregations: 0,
  },
  {
    code: "SEDE_200",
    name: "Sede Consolidada",
    description: "Para igrejas de sede única com 101 a 200 membros.",
    structureType: "SEDE_ONLY",
    minMembers: 101,
    maxMembers: 200,
    price: 129.9,
    maxSedes: 1,
    maxCongregations: 0,
  },
  {
    code: "SEDE_400",
    name: "Sede Avançada",
    description: "Para igrejas de sede única com 201 a 400 membros.",
    structureType: "SEDE_ONLY",
    minMembers: 201,
    maxMembers: 400,
    price: 179.9,
    maxSedes: 1,
    maxCongregations: 0,
  },
  {
    code: "SEDE_700",
    name: "Sede Premium",
    description: "Para igrejas de sede única com 401 a 700 membros.",
    structureType: "SEDE_ONLY",
    minMembers: 401,
    maxMembers: 700,
    price: 239.9,
    maxSedes: 1,
    maxCongregations: 0,
  },
  {
    code: "SEDE_1000",
    name: "Sede Master",
    description: "Para igrejas de sede única com 701 a 1.000 membros.",
    structureType: "SEDE_ONLY",
    minMembers: 701,
    maxMembers: 1000,
    price: 299.9,
    maxSedes: 1,
    maxCongregations: 0,
  },
  {
    code: "SEDE_ENTERPRISE",
    name: "Sede Enterprise",
    description: "Para igrejas de sede única com mais de 1.000 membros.",
    structureType: "SEDE_ONLY",
    minMembers: 1001,
    maxMembers: null,
    price: 399.9,
    maxSedes: 1,
    maxCongregations: 0,
  },
  {
    code: "REDE_150",
    name: "Rede Inicial",
    description: "Sede + congregações com até 150 membros no total.",
    structureType: "SEDE_AND_CONGREGATIONS",
    minMembers: 0,
    maxMembers: 150,
    price: 109.9,
    maxSedes: null,
    maxCongregations: null,
  },
  {
    code: "REDE_300",
    name: "Rede Crescimento",
    description: "Sede + congregações com 151 a 300 membros no total.",
    structureType: "SEDE_AND_CONGREGATIONS",
    minMembers: 151,
    maxMembers: 300,
    price: 159.9,
    maxSedes: null,
    maxCongregations: null,
  },
  {
    code: "REDE_500",
    name: "Rede Expansão",
    description: "Sede + congregações com 301 a 500 membros no total.",
    structureType: "SEDE_AND_CONGREGATIONS",
    minMembers: 301,
    maxMembers: 500,
    price: 219.9,
    maxSedes: null,
    maxCongregations: null,
  },
  {
    code: "REDE_800",
    name: "Rede Consolidada",
    description: "Sede + congregações com 501 a 800 membros no total.",
    structureType: "SEDE_AND_CONGREGATIONS",
    minMembers: 501,
    maxMembers: 800,
    price: 289.9,
    maxSedes: null,
    maxCongregations: null,
  },
  {
    code: "REDE_1200",
    name: "Rede Avançada",
    description: "Sede + congregações com 801 a 1.200 membros no total.",
    structureType: "SEDE_AND_CONGREGATIONS",
    minMembers: 801,
    maxMembers: 1200,
    price: 359.9,
    maxSedes: null,
    maxCongregations: null,
  },
  {
    code: "REDE_2000",
    name: "Rede Premium",
    description: "Sede + congregações com 1.201 a 2.000 membros no total.",
    structureType: "SEDE_AND_CONGREGATIONS",
    minMembers: 1201,
    maxMembers: 2000,
    price: 449.9,
    maxSedes: null,
    maxCongregations: null,
  },
  {
    code: "REDE_ENTERPRISE",
    name: "Rede Enterprise",
    description: "Sede + congregações com mais de 2.000 membros no total.",
    structureType: "SEDE_AND_CONGREGATIONS",
    minMembers: 2001,
    maxMembers: null,
    price: 599.9,
    maxSedes: null,
    maxCongregations: null,
  },
];

export function planFeatures(structureType: PlanStructureType): string[] {
  return structureType === "SEDE_ONLY" ? FEATURES : NETWORK_FEATURES;
}

export function memberRangeLabel(
  minMembers: number,
  maxMembers: number | null
): string {
  const format = (value: number) =>
    new Intl.NumberFormat("pt-BR").format(value);
  if (maxMembers === null) return `Acima de ${format(minMembers - 1)} membros`;
  if (minMembers <= 0) return `Até ${format(maxMembers)} membros`;
  return `${format(minMembers)} a ${format(maxMembers)} membros`;
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}
