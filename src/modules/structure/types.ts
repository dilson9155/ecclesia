export type StructureCongregation = {
  id: string;
  code: string;
  name: string;
  status: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  cep: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  memberCount: number;
  userCount: number;
};

export type StructureSede = {
  id: string;
  name: string;
  cnpj: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  cep: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  status: string;
  congregationCount: number;
  memberCount: number;
  userCount: number;
  congregations: StructureCongregation[];
};

export type StructureOverviewData = {
  sedes: StructureSede[];
  totals: {
    sedes: number;
    congregations: number;
    members: number;
    users: number;
  };
  canManageSedes: boolean;
  canManageCongregations: boolean;
  isSuperAdmin: boolean;
  scopedSedeId: string | null;
  scopedCongregationId: string | null;
  scopeLabel: string;
};
