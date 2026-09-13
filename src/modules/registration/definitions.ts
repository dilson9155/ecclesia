export type Option = { value: string; label: string };

export type FieldDef = {
  key: string;
  label: string;
  type: "text" | "select" | "relation" | "checkbox";
  required?: boolean;
  options?: Option[];
  relation?: { resourceKey: string; valueField: string; labelField: string };
  hint?: string;
};

export type ResourceDef = {
  key: string;
  singular: string;
  plural: string;
  description: string;
  viewPermission: string;
  createPermission: string;
  editPermission: string;
  deletePermission: string;
  canCreate: boolean;
  canDelete: boolean;
  fields: FieldDef[];
};

export const STATUS_OPTIONS: Option[] = [
  { value: "ATIVO", label: "Ativo" },
  { value: "INATIVO", label: "Inativo" },
];

export const RESOURCES: ResourceDef[] = [
  {
    key: "igrejas",
    singular: "Igreja",
    plural: "Igrejas",
    description: "Dados institucionais da igreja",
    viewPermission: "igrejas.view",
    createPermission: "igrejas.manage",
    editPermission: "igrejas.manage",
    deletePermission: "igrejas.manage",
    canCreate: false,
    canDelete: false,
    fields: [
      { key: "name", label: "Nome", type: "text", required: true },
      { key: "legalName", label: "Razão social", type: "text" },
      { key: "cnpj", label: "CNPJ", type: "text", hint: "Somente números" },
      { key: "phone", label: "Telefone", type: "text" },
      { key: "email", label: "E-mail", type: "text" },
      { key: "description", label: "Descrição", type: "text" },
      { key: "status", label: "Situação", type: "select", options: STATUS_OPTIONS },
    ],
  },
  {
    key: "sedes",
    singular: "Sede",
    plural: "Sedes",
    description: "Unidades (sedes) da igreja",
    viewPermission: "sedes.view",
    createPermission: "sedes.manage",
    editPermission: "sedes.manage",
    deletePermission: "sedes.manage",
    canCreate: true,
    canDelete: true,
    fields: [
      { key: "name", label: "Nome", type: "text", required: true },
      { key: "cnpj", label: "CNPJ", type: "text", hint: "Somente números" },
      { key: "phone", label: "Telefone", type: "text" },
      { key: "email", label: "E-mail", type: "text" },
      { key: "address", label: "Endereço", type: "text" },
      { key: "cep", label: "CEP", type: "text" },
      { key: "district", label: "Bairro", type: "text" },
      { key: "city", label: "Cidade", type: "text" },
      { key: "state", label: "UF", type: "text" },
      { key: "status", label: "Situação", type: "select", options: STATUS_OPTIONS },
    ],
  },
  {
    key: "congregacoes",
    singular: "Congregação",
    plural: "Congregações",
    description: "Congregações vinculadas às sedes",
    viewPermission: "congregacoes.view",
    createPermission: "congregacoes.create",
    editPermission: "congregacoes.edit",
    deletePermission: "congregacoes.delete",
    canCreate: true,
    canDelete: true,
    fields: [
      { key: "code", label: "Código", type: "text", required: true, hint: "Ex.: 002" },
      {
        key: "sedeId",
        label: "Sede",
        type: "relation",
        required: true,
        relation: { resourceKey: "sedes", valueField: "id", labelField: "name" },
      },
      { key: "name", label: "Nome", type: "text", required: true },
      { key: "phone", label: "Telefone", type: "text" },
      { key: "email", label: "E-mail", type: "text" },
      { key: "address", label: "Endereço", type: "text" },
      { key: "cep", label: "CEP", type: "text" },
      { key: "district", label: "Bairro", type: "text" },
      { key: "city", label: "Cidade", type: "text" },
      { key: "state", label: "UF", type: "text" },
      { key: "status", label: "Situação", type: "select", options: STATUS_OPTIONS },
    ],
  },
];

export function getResource(key: string): ResourceDef | undefined {
  return RESOURCES.find((r) => r.key === key);
}