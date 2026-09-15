import type { Option } from "./validators";

export type { Option };

export type FieldDef = {
  key: string;
  label: string;
  type: "text" | "select" | "relation" | "checkbox" | "date" | "textarea" | "decimal";
  required?: boolean;
  readonly?: boolean;
  options?: Option[];
  relation?: { resourceKey: string; valueField: string; labelField: string };
  hint?: string;
};

export type RowActionDef = {
  key: string;
  label: string;
  permission: string;
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
  actions?: RowActionDef[];
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

export const PAYMENT_METHOD_OPTIONS: Option[] = [
  { value: "DINHEIRO", label: "Dinheiro" },
  { value: "PIX", label: "PIX" },
  { value: "CARTAO", label: "Cartão" },
  { value: "TRANSFERENCIA", label: "Transferência" },
  { value: "DEPOSITO", label: "Depósito" },
  { value: "BOLETO", label: "Boleto" },
  { value: "OUTROS", label: "Outros" },
];

export const OFFERING_TYPE_OPTIONS: Option[] = [
  { value: "CULTO", label: "Culto" },
  { value: "MISSOES", label: "Missões" },
  { value: "CONSTRUCAO", label: "Construção" },
  { value: "EVENTOS", label: "Eventos" },
  { value: "DEPARTAMENTO", label: "Departamento" },
  { value: "ESPECIAL", label: "Especial" },
  { value: "OUTROS", label: "Outros" },
];

export const EXPENSE_STATUS_OPTIONS: Option[] = [
  { value: "PENDENTE", label: "Pendente" },
  { value: "PAGO", label: "Pago" },
  { value: "CANCELADO", label: "Cancelado" },
];

export const ACCOUNT_NATURE_OPTIONS: Option[] = [
  { value: "RECEITA", label: "Receita" },
  { value: "DESPESA", label: "Despesa" },
];

export const ENTRY_NATURE_OPTIONS: Option[] = [
  { value: "ENTRADA", label: "Entrada" },
  { value: "SAIDA", label: "Saída" },
];

export const LEDGER_SOURCE_OPTIONS: Option[] = [
  { value: "DIZIMO", label: "Dízimo" },
  { value: "OFERTA", label: "Oferta" },
  { value: "ENTRADA", label: "Entrada" },
  { value: "SAIDA", label: "Saída" },
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
  {
    key: "visitantes",
    singular: "Visitante",
    plural: "Visitantes",
    description: "Visitantes das congregações, com conversão em membro",
    viewPermission: "visitantes.view",
    createPermission: "visitantes.create",
    editPermission: "visitantes.edit",
    deletePermission: "visitantes.delete",
    canCreate: true,
    canDelete: true,
    standalone: true,
    actions: [
      { key: "converter", label: "Converter em membro", permission: "membros.create" },
    ],
    fields: [
      {
        key: "congregationId",
        label: "Congregação",
        type: "relation",
        required: true,
        relation: { resourceKey: "congregacoes", valueField: "id", labelField: "name" },
      },
      { key: "name", label: "Nome completo", type: "text", required: true },
      { key: "phone", label: "Telefone", type: "text" },
      { key: "whatsapp", label: "WhatsApp", type: "text" },
      { key: "email", label: "E-mail", type: "text" },
      { key: "visitDate", label: "Data da visita", type: "date" },
      { key: "observations", label: "Observações", type: "textarea" },
      {
        key: "convertedToMemberId",
        label: "Situação",
        type: "text",
        readonly: true,
      },
    ],
  },
  {
    key: "contas",
    singular: "Conta",
    plural: "Contas",
    description: "Plano de contas contábil da igreja",
    viewPermission: "planoContas.view",
    createPermission: "planoContas.create",
    editPermission: "planoContas.edit",
    deletePermission: "planoContas.delete",
    canCreate: true,
    canDelete: true,
    standalone: true,
    fields: [
      { key: "code", label: "Código", type: "text", required: true, hint: "Ex.: 1.01.001" },
      { key: "name", label: "Nome", type: "text", required: true },
      {
        key: "nature",
        label: "Natureza",
        type: "select",
        required: true,
        options: ACCOUNT_NATURE_OPTIONS,
      },
      {
        key: "parentId",
        label: "Conta pai",
        type: "relation",
        relation: { resourceKey: "contas", valueField: "id", labelField: "name" },
      },
      { key: "description", label: "Descrição", type: "text" },
      { key: "status", label: "Situação", type: "select", options: STATUS_OPTIONS },
    ],
  },
  {
    key: "centrosCusto",
    singular: "Centro de Custo",
    plural: "Centros de Custo",
    description: "Centros de custo para rateio de despesas",
    viewPermission: "centrosCusto.view",
    createPermission: "centrosCusto.create",
    editPermission: "centrosCusto.edit",
    deletePermission: "centrosCusto.delete",
    canCreate: true,
    canDelete: true,
    standalone: true,
    fields: [
      { key: "code", label: "Código", type: "text", required: true, hint: "Ex.: ADM" },
      { key: "name", label: "Nome", type: "text", required: true },
      { key: "description", label: "Descrição", type: "text" },
      {
        key: "congregationId",
        label: "Congregação",
        type: "relation",
        relation: { resourceKey: "congregacoes", valueField: "id", labelField: "name" },
      },
      { key: "status", label: "Situação", type: "select", options: STATUS_OPTIONS },
    ],
  },
  {
    key: "dizimos",
    singular: "Dízimo",
    plural: "Dízimos",
    description: "Lançamento de dízimos com vínculo a membro e centro de custo",
    viewPermission: "dizimos.view",
    createPermission: "dizimos.create",
    editPermission: "dizimos.edit",
    deletePermission: "dizimos.cancel",
    canCreate: true,
    canDelete: true,
    standalone: true,
    fields: [
      {
        key: "congregationId",
        label: "Congregação",
        type: "relation",
        required: true,
        relation: { resourceKey: "congregacoes", valueField: "id", labelField: "name" },
      },
      {
        key: "memberId",
        label: "Membro (opcional)",
        type: "relation",
        relation: { resourceKey: "membros", valueField: "id", labelField: "name" },
      },
      { key: "date", label: "Data", type: "date", required: true },
      { key: "value", label: "Valor", type: "decimal", required: true },
      {
        key: "paymentMethod",
        label: "Forma de pagamento",
        type: "select",
        required: true,
        options: PAYMENT_METHOD_OPTIONS,
      },
      {
        key: "costCenterId",
        label: "Centro de custo",
        type: "relation",
        relation: { resourceKey: "centrosCusto", valueField: "id", labelField: "name" },
      },
      {
        key: "accountId",
        label: "Conta contábil",
        type: "relation",
        required: true,
        relation: { resourceKey: "contas", valueField: "id", labelField: "name" },
      },
      { key: "observation", label: "Observação", type: "text" },
      { key: "isAnonymous", label: "Anônimo", type: "checkbox" },
    ],
  },
  {
    key: "ofertas",
    singular: "Oferta",
    plural: "Ofertas",
    description: "Lançamento de ofertas por tipo, membro e centro de custo",
    viewPermission: "ofertas.view",
    createPermission: "ofertas.create",
    editPermission: "ofertas.edit",
    deletePermission: "ofertas.cancel",
    canCreate: true,
    canDelete: true,
    standalone: true,
    fields: [
      {
        key: "congregationId",
        label: "Congregação",
        type: "relation",
        required: true,
        relation: { resourceKey: "congregacoes", valueField: "id", labelField: "name" },
      },
      {
        key: "memberId",
        label: "Membro (opcional)",
        type: "relation",
        relation: { resourceKey: "membros", valueField: "id", labelField: "name" },
      },
      { key: "contributor", label: "Contribuinte (avulso)", type: "text" },
      {
        key: "type",
        label: "Tipo de oferta",
        type: "select",
        required: true,
        options: OFFERING_TYPE_OPTIONS,
      },
      { key: "date", label: "Data", type: "date", required: true },
      { key: "value", label: "Valor", type: "decimal", required: true },
      {
        key: "paymentMethod",
        label: "Forma de pagamento",
        type: "select",
        required: true,
        options: PAYMENT_METHOD_OPTIONS,
      },
      {
        key: "costCenterId",
        label: "Centro de custo",
        type: "relation",
        relation: { resourceKey: "centrosCusto", valueField: "id", labelField: "name" },
      },
      {
        key: "accountId",
        label: "Conta contábil",
        type: "relation",
        required: true,
        relation: { resourceKey: "contas", valueField: "id", labelField: "name" },
      },
      { key: "observation", label: "Observação", type: "text" },
      { key: "isAnonymous", label: "Anônimo", type: "checkbox" },
    ],
  },
];

export function getResource(key: string): ResourceDef | undefined {
  return RESOURCES.find((r) => r.key === key);
}