import type { Option } from "./validators";

export type { Option };

export type FieldDef = {
  key: string;
  label: string;
  type: "text" | "select" | "relation" | "checkbox" | "date";
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
  standalone?: boolean;
  fields: FieldDef[];
};

export const STATUS_OPTIONS: Option[] = [
  { value: "ATIVO", label: "Ativo" },
  { value: "INATIVO", label: "Inativo" },
];

export const MEMBER_STATUS_OPTIONS: Option[] = [
  { value: "ATIVO", label: "Ativo" },
  { value: "INATIVO", label: "Inativo" },
  { value: "TRANSFERIDO", label: "Transferido" },
  { value: "DESLIGADO", label: "Desligado" },
  { value: "FALECIDO", label: "Falecido" },
];

export const GENDER_OPTIONS: Option[] = [
  { value: "MASCULINO", label: "Masculino" },
  { value: "FEMININO", label: "Feminino" },
];

export const MARITAL_STATUS_OPTIONS: Option[] = [
  { value: "SOLTEIRO", label: "Solteiro(a)" },
  { value: "CASADO", label: "Casado(a)" },
  { value: "DIVORCIADO", label: "Divorciado(a)" },
  { value: "VIUVO", label: "Viúvo(a)" },
  { value: "UNIAO_ESTAVEL", label: "União estável" },
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
  {
    key: "membros",
    singular: "Membro",
    plural: "Membros",
    description: "Membros da igreja com dados pessoais, eclesiásticos e de contato",
    viewPermission: "membros.view",
    createPermission: "membros.create",
    editPermission: "membros.edit",
    deletePermission: "membros.delete",
    canCreate: true,
    canDelete: true,
    standalone: true,
    fields: [
      {
        key: "code",
        label: "Matrícula",
        type: "text",
        hint: "Deixe em branco para gerar automático",
      },
      {
        key: "congregationId",
        label: "Congregação",
        type: "relation",
        required: true,
        relation: { resourceKey: "congregacoes", valueField: "id", labelField: "name" },
      },
      { key: "name", label: "Nome completo", type: "text", required: true },
      {
        key: "cpf",
        label: "CPF",
        type: "text",
        hint: "Somente números",
      },
      { key: "rg", label: "RG", type: "text" },
      { key: "birthDate", label: "Data de nascimento", type: "date" },
      { key: "gender", label: "Sexo", type: "select", options: GENDER_OPTIONS },
      { key: "maritalStatus", label: "Estado civil", type: "select", options: MARITAL_STATUS_OPTIONS },
      { key: "phone", label: "Telefone", type: "text" },
      { key: "whatsapp", label: "WhatsApp", type: "text" },
      { key: "email", label: "E-mail", type: "text" },
      { key: "address", label: "Endereço", type: "text" },
      { key: "cep", label: "CEP", type: "text" },
      { key: "district", label: "Bairro", type: "text" },
      { key: "city", label: "Cidade", type: "text" },
      { key: "state", label: "UF", type: "text" },
      { key: "conversionDate", label: "Data de conversão", type: "date" },
      { key: "baptismDate", label: "Data de batismo", type: "date" },
      { key: "receptionDate", label: "Data de recepção", type: "date" },
      { key: "cargo", label: "Cargo", type: "text" },
      { key: "ministerio", label: "Ministério", type: "text" },
      { key: "departamento", label: "Departamento", type: "text" },
      { key: "situation", label: "Situação", type: "select", options: MEMBER_STATUS_OPTIONS },
      { key: "observations", label: "Observações", type: "text" },
    ],
  },
];

export function getResource(key: string): ResourceDef | undefined {
  return RESOURCES.find((r) => r.key === key);
}