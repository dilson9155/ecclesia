import "server-only";
import { prisma } from "@/lib/prisma";
import { getResource } from "@/modules/registration/definitions";
import type { FieldDef } from "@/modules/registration/definitions";
import { validateField } from "@/modules/registration/validators";
import { auditLog } from "@/services/audit.service";
import type { EntryNature, LedgerSource } from "@prisma/client";
import {
  scopedCongregationIds,
  assertCongregationInScope,
  type DataScope,
} from "@/lib/scope";
import {
  canCreateSede,
  canDeleteSede,
  canEditSede,
  canManageCongregationsIn,
} from "@/modules/structure/policy";

export type Actor = { userId: string; scope: DataScope };

type ModelKey =
  | "church"
  | "sede"
  | "congregation"
  | "member"
  | "account"
  | "costCenter"
  | "tithe"
  | "offering"
  | "supplier"
  | "income"
  | "expense";

const MODEL_BY_RESOURCE: Record<string, ModelKey> = {
  igrejas: "church",
  sedes: "sede",
  congregacoes: "congregation",
  membros: "member",
  contas: "account",
  centrosCusto: "costCenter",
  dizimos: "tithe",
  ofertas: "offering",
  fornecedores: "supplier",
  entradas: "income",
  saidas: "expense",
};

const SORT_BY_MODEL: Record<ModelKey, { field: string; direction: "asc" | "desc" }> = {
  church: { field: "name", direction: "asc" },
  sede: { field: "name", direction: "asc" },
  congregation: { field: "code", direction: "asc" },
  member: { field: "code", direction: "asc" },
  account: { field: "accountingCode", direction: "asc" },
  costCenter: { field: "code", direction: "asc" },
  tithe: { field: "date", direction: "desc" },
  offering: { field: "date", direction: "desc" },
  supplier: { field: "name", direction: "asc" },
  income: { field: "date", direction: "desc" },
  expense: { field: "date", direction: "desc" },
};

type LedgerResource = "dizimos" | "ofertas" | "entradas" | "saidas";

const LEDGER_SOURCE_BY_RESOURCE: Record<LedgerResource, LedgerSource> = {
  dizimos: "DIZIMO",
  ofertas: "OFERTA",
  entradas: "ENTRADA",
  saidas: "SAIDA",
};

function isLedgerResource(resourceKey: string): resourceKey is LedgerResource {
  return (
    resourceKey === "dizimos" ||
    resourceKey === "ofertas" ||
    resourceKey === "entradas" ||
    resourceKey === "saidas"
  );
}

function shouldPostLedger(
  resourceKey: string,
  existing: Row | null,
  data: Record<string, unknown>
): boolean {
  if (!isLedgerResource(resourceKey)) return false;
  if (resourceKey !== "saidas") return true;
  const status =
    (data.status as string | undefined) ??
    (existing?.status as string | undefined) ??
    "PENDENTE";
  return status === "PAGO";
}

export async function assertLedgerPeriodOpen(
  resourceKey: string,
  data: { date?: unknown; congregationId?: unknown }
): Promise<void> {
  if (!isLedgerResource(resourceKey)) return;
  let date: Date | null = null;
  if (data.date instanceof Date) date = data.date;
  else if (data.date) {
    const d = new Date(String(data.date));
    if (!Number.isNaN(d.getTime())) date = d;
  }
  const congregationId = String(data.congregationId ?? "");
  if (!date || !congregationId) return;
  const closing = await prisma.financialClosing.findUnique({
    where: {
      congregationId_year_month: {
        congregationId,
        year: date.getFullYear(),
        month: date.getMonth() + 1,
      },
    },
  });
  if (closing && closing.status === "FECHADO") {
    throw new Error("Período fechado. Reabra o fechamento para lançar neste mês.");
  }
}

function ledgerFromRow(resourceKey: LedgerResource, actor: { userId: string }, row: Row) {
  let title: string;
  if (resourceKey === "dizimos") title = "Dízimo";
  else if (resourceKey === "ofertas") title = "Oferta";
  else if (resourceKey === "entradas") title = String(row.description ?? "");
  else title = `Saída: ${String(row.description ?? "")}`;
  if (resourceKey === "dizimos" && row.isAnonymous) title = `${title} (anônimo)`;
  if (resourceKey === "ofertas" && row.type) title = `${title} (${String(row.type).toLowerCase()})`;

  return {
    date: row.date as Date,
    description: title,
    nature: (resourceKey === "saidas" ? "SAIDA" : "ENTRADA") as EntryNature,
    value: row.value as number,
    accountId: String(row.accountId),
    accountingCode: String(row.accountingCode),
    costCenterId: row.costCenterId ? String(row.costCenterId) : null,
    sourceType: LEDGER_SOURCE_BY_RESOURCE[resourceKey],
    sourceId: row.id,
    createdById: actor.userId,
  };
}

export type Row = {
  id: string;
  [key: string]: unknown;
};

export type Option = { value: string; label: string };

function coerceValue(field: FieldDef, raw: unknown): unknown {
  if (raw === null || raw === undefined || raw === "") {
    return null;
  }
  if (field.type === "date") {
    const d = new Date(String(raw));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (field.type === "decimal") {
    const n = Number(String(raw).replace(",", "."));
    return Number.isNaN(n) ? null : n;
  }
  return String(raw);
}

export function buildData(resourceKey: string, values: Record<string, unknown>) {
  const def = getResource(resourceKey);
  if (!def) throw new Error(`Recurso desconhecido: ${resourceKey}`);
  const data: Record<string, unknown> = {};
  for (const field of def.fields) {
    if (field.readonly) continue;
    if (
      field.required &&
      (values[field.key] === undefined || values[field.key] === "" || values[field.key] === null)
    ) {
      throw new Error(`Campo obrigatório: ${field.label}`);
    }
    if (values[field.key] !== undefined && values[field.key] !== "") {
      const error = validateField(resourceKey, field.key, String(values[field.key]));
      if (error) throw new Error(error);
    }
    const value = coerceValue(field, values[field.key]);
    if (value === null) continue;
    data[field.key] = value;
  }
  return data;
}

type ChurchRecordKind = "account" | "costCenter" | "supplier" | "member";

type ChurchRecord = {
  id: string;
  churchId: string;
  congregationId?: string | null;
};

async function loadChurchRecord(
  kind: ChurchRecordKind,
  id: string
): Promise<ChurchRecord | null> {
  if (kind === "account") {
    return prisma.account.findUnique({
      where: { id },
      select: { id: true, churchId: true },
    });
  }
  if (kind === "costCenter") {
    return prisma.costCenter.findUnique({
      where: { id },
      select: { id: true, churchId: true, congregationId: true },
    });
  }
  if (kind === "supplier") {
    return prisma.supplier.findUnique({
      where: { id },
      select: { id: true, churchId: true },
    });
  }
  return prisma.member.findUnique({
    where: { id },
    select: { id: true, churchId: true, congregationId: true },
  });
}

async function assertChurchReference(
  kind: ChurchRecordKind,
  id: unknown,
  scope: DataScope,
  label: string
): Promise<ChurchRecord | null> {
  if (!id) return null;
  if (!scope.churchId) {
    throw new Error("Nenhuma igreja vinculada ao seu usuário.");
  }
  const record = await loadChurchRecord(kind, String(id));
  if (!record || record.churchId !== scope.churchId) {
    throw new Error(`${label} não pertence à sua igreja.`);
  }
  if (record.congregationId) {
    await assertCongregationInScope(scope, record.congregationId);
  }
  return record;
}

/**
 * Garante que todos os vínculos enviados pelo formulário pertencem à igreja
 * e ao escopo do usuário. Sem isso, um ID forjado poderia apontar para outra
 * igreja/congregação mesmo que a tela não mostrasse a opção.
 */
async function assertReferencesInScope(
  resourceKey: string,
  scope: DataScope,
  data: Record<string, unknown>,
  id: string | null
): Promise<void> {
  switch (resourceKey) {
    case "contas": {
      if (!data.parentId) break;
      const parent = await assertChurchReference(
        "account",
        data.parentId,
        scope,
        "Conta pai"
      );
      if (parent && id && parent.id === id) {
        throw new Error("Uma conta não pode ser filha dela mesma.");
      }
      break;
    }
    case "centrosCusto": {
      if (data.congregationId) {
        await assertCongregationInScope(
          scope,
          String(data.congregationId)
        );
      }
      break;
    }
    case "dizimos":
    case "ofertas": {
      await assertChurchReference(
        "account",
        data.accountId,
        scope,
        "Conta contábil"
      );
      if (data.memberId) {
        await assertChurchReference("member", data.memberId, scope, "Membro");
      }
      if (data.costCenterId) {
        await assertChurchReference(
          "costCenter",
          data.costCenterId,
          scope,
          "Centro de custo"
        );
      }
      break;
    }
    case "entradas":
    case "saidas": {
      await assertChurchReference(
        "account",
        data.accountId,
        scope,
        "Conta contábil"
      );
      if (data.costCenterId) {
        await assertChurchReference(
          "costCenter",
          data.costCenterId,
          scope,
          "Centro de custo"
        );
      }
      if (data.supplierId) {
        await assertChurchReference(
          "supplier",
          data.supplierId,
          scope,
          "Fornecedor"
        );
      }
      break;
    }
    default:
      break;
  }
}

/**
 * Aplica as regras de hierarquia nas escritas de sede/congregação.
 * A permissão do papel é validada na server action; aqui garantimos que o
 * escopo de dados também seja respeitado mesmo em chamadas diretas.
 */
async function assertStructureWrite(
  resourceKey: string,
  scope: DataScope,
  id: string | null,
  data: Record<string, unknown>,
  existing: Row | null
): Promise<void> {
  if (!scope.churchId) {
    throw new Error("Nenhuma igreja vinculada ao seu usuário.");
  }

  // A estrutura contratada no painel da plataforma limita a criação de unidades.
  if (
    (resourceKey === "sedes" && !id) ||
    (resourceKey === "congregacoes" && !id)
  ) {
    const church = await prisma.church.findUnique({
      where: { id: scope.churchId },
      select: { structureType: true },
    });
    if (church?.structureType === "SEDE_ONLY") {
      if (resourceKey === "congregacoes") {
        throw new Error(
          "O plano desta igreja é somente sede e não permite cadastrar congregações."
        );
      }
      const sedeCount = await prisma.sede.count({
        where: { churchId: scope.churchId },
      });
      if (sedeCount > 0) {
        throw new Error(
          "O plano desta igreja permite apenas uma sede. Fale com o administrador da plataforma para alterar o plano."
        );
      }
    }
  }

  if (resourceKey === "sedes") {
    if (!id) {
      if (!canCreateSede(scope)) {
        throw new Error(
          "Somente o administrador da igreja pode cadastrar novas sedes."
        );
      }
      return;
    }
    if (!canEditSede(scope, String(existing?.id ?? id))) {
      throw new Error("Você não pode alterar esta sede.");
    }
    return;
  }

  if (resourceKey === "congregacoes") {
    const sedeId = String(data.sedeId ?? existing?.sedeId ?? "");
    if (!sedeId) {
      throw new Error("Campo obrigatório: Sede");
    }
    if (!canManageCongregationsIn(scope, sedeId)) {
      throw new Error("Você só pode gerenciar congregações da sua sede.");
    }
    if (id && existing && String(existing.sedeId) !== sedeId) {
      throw new Error(
        "Não é possível transferir uma congregação para outra sede."
      );
    }
    const sede = await prisma.sede.findUnique({
      where: { id: sedeId },
      select: { churchId: true },
    });
    if (!sede || sede.churchId !== scope.churchId) {
      throw new Error("Sede não encontrada na sua igreja.");
    }
  }
}

async function assertCanDeleteStructure(
  resourceKey: string,
  scope: DataScope,
  existing: Row
): Promise<void> {
  const existingId = String(existing.id);

  if (resourceKey === "sedes") {
    if (!canDeleteSede(scope)) {
      throw new Error(
        "Somente o administrador da igreja pode excluir sedes."
      );
    }
    const [congregations, members, users] = await Promise.all([
      prisma.congregation.count({ where: { sedeId: existingId } }),
      prisma.member.count({ where: { sedeId: existingId } }),
      prisma.user.count({ where: { sedeId: existingId } }),
    ]);
    if (congregations > 0 || members > 0 || users > 0) {
      throw new Error(
        "Não é possível excluir esta sede: remova as congregações, membros e usuários vinculados primeiro."
      );
    }
    return;
  }

  if (resourceKey === "congregacoes") {
    const sedeId = String(existing.sedeId ?? "");
    if (!canManageCongregationsIn(scope, sedeId)) {
      throw new Error("Você só pode excluir congregações da sua sede.");
    }
    const relationCounts = await prisma.congregation.findUnique({
      where: { id: existingId },
      select: {
        _count: {
          select: {
            members: true,
            visitors: true,
            tithes: true,
            offerings: true,
            incomes: true,
            expenses: true,
            cashEntries: true,
            cards: true,
            documents: true,
            closings: true,
            users: true,
            costCenters: true,
          },
        },
      },
    });
    if (!relationCounts) throw new Error("Congregação não encontrada.");
    const hasLinks = Object.values(relationCounts._count).some(
      (count) => count > 0
    );
    if (hasLinks) {
      throw new Error(
        "Não é possível excluir esta congregação: existem membros, registros financeiros ou usuários vinculados."
      );
    }
  }
}

function scopeFilter(
  resourceKey: string,
  scope: DataScope
): Promise<Record<string, unknown>> {
  const churchWhere = scope.churchId
    ? { churchId: scope.churchId }
    : { id: "__none__" };
  if (!scope.churchId) {
    return Promise.resolve({ id: "__none__" });
  }
  if (scope.isSuperAdmin && !scope.sedeId) {
    if (resourceKey === "igrejas") return Promise.resolve({ id: scope.churchId });
    return Promise.resolve(churchWhere);
  }
  switch (resourceKey) {
    case "igrejas":
      return Promise.resolve({ id: scope.churchId });
    case "sedes":
      return Promise.resolve(
        scope.sedeId
          ? { id: scope.sedeId, churchId: scope.churchId }
          : { id: "__none__" }
      );
    case "congregacoes":
      if (scope.congregationId) {
        return Promise.resolve({
          id: scope.congregationId,
          churchId: scope.churchId,
        });
      }
      return Promise.resolve(
        scope.sedeId
          ? { sedeId: scope.sedeId, churchId: scope.churchId }
          : { id: "__none__" }
      );
    case "membros":
    case "visitantes":
    case "dizimos":
    case "ofertas":
    case "entradas":
    case "saidas":
      return scopedCongregationIds(scope).then((congregationIds) => ({
        ...churchWhere,
        congregationId: {
          in: congregationIds.length ? congregationIds : ["__none__"],
        },
      }));
    case "centrosCusto":
      // Centros de custo da igreja (sem congregação) + os do escopo do usuário.
      return scopedCongregationIds(scope).then((congregationIds) => ({
        ...churchWhere,
        OR: [
          { congregationId: null },
          {
            congregationId: {
              in: congregationIds.length ? congregationIds : ["__none__"],
            },
          },
        ],
      }));
    default:
      // contas e fornecedores são referências no nível da igreja
      return Promise.resolve(churchWhere);
  }
}

async function assertScopedRecord(
  resourceKey: string,
  scope: DataScope,
  existing: Row
): Promise<void> {
  const scopedWhere = await scopeFilter(resourceKey, scope);
  if (scopedWhere.id && existing.id !== scopedWhere.id) {
    throw new Error("Registro não pertence à sua igreja.");
  }
  if (scopedWhere.churchId && existing.churchId !== scopedWhere.churchId) {
    throw new Error("Registro não pertence à sua igreja.");
  }
  if (
    typeof scopedWhere.sedeId === "string" &&
    existing.sedeId !== scopedWhere.sedeId
  ) {
    throw new Error("Registro não pertence à sua sede.");
  }
  if (typeof existing.congregationId === "string") {
    await assertCongregationInScope(scope, existing.congregationId);
  }
}

export async function listRows(
  resourceKey: string,
  scope: DataScope
): Promise<Row[]> {
  const model = MODEL_BY_RESOURCE[resourceKey];
  if (!model) return [];
  const def = getResource(resourceKey)!;
  const { field, direction } = SORT_BY_MODEL[model];
  const delegate = prisma[model] as unknown as {
    findMany: (args: { where?: Record<string, unknown>; orderBy?: Record<string, unknown> }) => Promise<Row[]>;
  };
  const rows = await delegate.findMany({
    where: await scopeFilter(resourceKey, scope),
    orderBy: { [field]: direction },
  });
  return rows.map((row) => {
    const out: Row = { id: row.id };
    for (const f of def.fields) {
      if (f.type === "date" && row[f.key] instanceof Date) {
        out[f.key] = (row[f.key] as Date).toISOString().slice(0, 10);
        continue;
      }
      if (f.type === "decimal" && row[f.key] != null) {
        out[f.key] = Number(row[f.key]);
        continue;
      }
      out[f.key] = row[f.key] as unknown;
    }
    return out;
  });
}

export async function getRelationOptions(
  resourceKey: string,
  scope: DataScope
): Promise<Record<string, Option[]>> {
  const def = getResource(resourceKey);
  if (!def) return {};
  const out: Record<string, Option[]> = {};

  for (const field of def.fields) {
    if (field.type !== "relation" || !field.relation) continue;
    const { resourceKey: targetKey, valueField, labelField } = field.relation;
    const targetModel = MODEL_BY_RESOURCE[targetKey];
    if (!targetModel) continue;
    const delegate = prisma[targetModel] as unknown as {
      findMany: (args: { where?: Record<string, unknown>; orderBy?: Record<string, unknown> }) => Promise<Row[]>;
    };
    const targetRows = await delegate.findMany({
      where: await scopeFilter(targetKey, scope),
      orderBy: { [SORT_BY_MODEL[targetModel].field]: SORT_BY_MODEL[targetModel].direction },
    });
    out[field.key] = targetRows.map((r) => ({
      value: String(r[valueField]),
      label: String(r[labelField] ?? "—"),
    }));
  }
  return out;
}

export async function saveRow(
  resourceKey: string,
  actor: Actor,
  values: Record<string, unknown>,
  id: string | null
): Promise<Row> {
  const model = MODEL_BY_RESOURCE[resourceKey];
  if (!model) throw new Error(`Recurso desconhecido: ${resourceKey}`);
  const def = getResource(resourceKey)!;
  const data = buildData(resourceKey, values) as Record<string, unknown>;

  if (resourceKey === "igrejas" && !id) {
    throw new Error("A entidade igreja é única e não pode ser criada aqui.");
  }
  if (resourceKey !== "igrejas") {
    data.churchId = actor.scope.churchId;
  }

  if (resourceKey === "membros" || isLedgerResource(resourceKey)) {
    const congregationId = String(data.congregationId ?? "");
    if (!congregationId) throw new Error("Campo obrigatório: Congregação");
    if (resourceKey !== "membros") {
      await assertCongregationInScope(actor.scope, congregationId);
    }
  }

  if (resourceKey === "membros") {
    const congregationId = String(data.congregationId ?? "");
    const congregation = await prisma.congregation.findUnique({ where: { id: congregationId } });
    if (!congregation) throw new Error("Congregação não encontrada.");
    await assertCongregationInScope(actor.scope, congregationId);
    if (!data.code) {
      const count = await prisma.member.count({ where: { congregationId } });
      data.code = String(count + 1).padStart(4, "0");
    }
    data.sedeId = congregation.sedeId;
  }

  const countDelegate = prisma[model] as unknown as {
    count: (args: { where: Record<string, unknown> }) => Promise<number>;
    aggregate: (args: { where: Record<string, unknown>; _max: Record<string, boolean> }) => Promise<{ _max: Record<string, string | null> }>;
  };

  if (resourceKey === "contas") {
    if (!data.accountingCode) throw new Error("Campo obrigatório: Código contábil");
    if (data.parentId === "") data.parentId = null;
  }

  if (resourceKey === "centrosCusto") {
    if (!data.code) throw new Error("Campo obrigatório: Código");
    if (data.congregationId === "") data.congregationId = null;
  }

  if (resourceKey === "dizimos" || resourceKey === "ofertas") {
    const congregationId = String(data.congregationId ?? "");
    if (!congregationId) throw new Error("Campo obrigatório: Congregação");
    if (!data.accountId) throw new Error("Campo obrigatório: Conta contábil");
    if (data.memberId === "") data.memberId = null;
    if (data.costCenterId === "") data.costCenterId = null;
    if (!data.accountingCode) data.accountingCode = data.accountId;
    if (!data.paymentMethod) data.paymentMethod = "DINHEIRO";
    if (resourceKey === "ofertas" && !data.type) data.type = "CULTO";
  }

  if (resourceKey === "entradas" || resourceKey === "saidas") {
    const congregationId = String(data.congregationId ?? "");
    if (!congregationId) throw new Error("Campo obrigatório: Congregação");
    if (!data.accountId) throw new Error("Campo obrigatório: Conta contábil");
    if (!data.code) {
      const agg = await countDelegate.aggregate({
        where: { congregationId },
        _max: { code: true },
      });
      const maxCode = agg._max.code;
      data.code = maxCode
        ? String(Number(maxCode) + 1).padStart(4, "0")
        : "0001";
    }
    if (!data.accountingCode) data.accountingCode = data.accountId;
    if (!data.paymentMethod) data.paymentMethod = "DINHEIRO";
    if (data.costCenterId === "") data.costCenterId = null;
    if (resourceKey === "saidas" && data.supplierId === "") data.supplierId = null;
  }

  if (resourceKey === "fornecedores") {
    if (data.cpfCnpj === "") data.cpfCnpj = null;
    if (data.pix === "") data.pix = null;
    if (data.pixKeyType === "") data.pixKeyType = null;
  }

  const delegate = prisma[model] as unknown as {
    create: (args: { data: Record<string, unknown> }) => Promise<Row>;
    update: (args: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => Promise<Row>;
    findUnique: (args: { where: { id: string } }) => Promise<Row | null>;
  };

  const ledgerResource = isLedgerResource(resourceKey) ? resourceKey : null;

  let existing: Row | null = null;
  if (id) {
    const found = await delegate.findUnique({ where: { id } });
    if (!found) throw new Error("Registro não encontrado.");
    await assertScopedRecord(resourceKey, actor.scope, found);
    existing = found;
  }

  await assertStructureWrite(resourceKey, actor.scope, id, data, existing);
  await assertReferencesInScope(resourceKey, actor.scope, data, id);
  await assertLedgerPeriodOpen(resourceKey, data);

  async function saveLedgerRow(tx: {
    [key: string]: unknown;
  }): Promise<Row> {
    const txDelegate = tx[model] as unknown as {
      create: (args: { data: Record<string, unknown> }) => Promise<Row>;
      update: (args: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => Promise<Row>;
    };
    const cashEntry = tx.cashEntry as unknown as {
      deleteMany: (args: { where: Record<string, unknown> }) => Promise<void>;
      create: (args: { data: Record<string, unknown> }) => Promise<Row>;
    };
    const row = id
      ? await txDelegate.update({ where: { id }, data })
      : await txDelegate.create({ data });
    const sourceType = LEDGER_SOURCE_BY_RESOURCE[resourceKey as LedgerResource];
    await cashEntry.deleteMany({ where: { sourceType, sourceId: row.id } });
    if (shouldPostLedger(resourceKey, existing, data)) {
      await cashEntry.create({
        data: {
          churchId: actor.scope.churchId,
          congregationId: String(row.congregationId),
          ...ledgerFromRow(resourceKey as LedgerResource, actor, row),
        },
      });
    }
    return row;
  }

  if (id) {
    const updated = ledgerResource
      ? await prisma.$transaction((tx) => saveLedgerRow(tx))
      : await delegate.update({ where: { id }, data });
    await auditLog({
      userId: actor.userId,
      churchId: actor.scope.churchId,
      action: "UPDATE",
      module: def.key,
      entity: def.singular,
      entityId: updated.id,
      description: `Registro atualizado (${def.singular})`,
      newValues: data as never,
    });
    return updated;
  }

  const created = ledgerResource
    ? await prisma.$transaction((tx) => saveLedgerRow(tx))
    : await delegate.create({ data });
  await auditLog({
    userId: actor.userId,
    churchId: actor.scope.churchId,
    action: "CREATE",
    module: def.key,
    entity: def.singular,
    entityId: created.id,
    description: `Registro criado (${def.singular})`,
    newValues: data as never,
  });
  return created;
}

export async function deleteRow(
  resourceKey: string,
  actor: Actor,
  id: string
): Promise<void> {
  const model = MODEL_BY_RESOURCE[resourceKey];
  if (!model) throw new Error(`Recurso desconhecido: ${resourceKey}`);
  const def = getResource(resourceKey)!;
  const delegate = prisma[model] as unknown as {
    delete: (args: { where: { id: string } }) => Promise<Row>;
    findUnique: (args: { where: { id: string } }) => Promise<Row | null>;
  };

  const existing = await delegate.findUnique({ where: { id } });
  if (!existing) throw new Error("Registro não encontrado.");
  await assertScopedRecord(resourceKey, actor.scope, existing);
  await assertCanDeleteStructure(resourceKey, actor.scope, existing);

  if (resourceKey === "saidas" && existing.status === "PAGO") {
    throw new Error("Saída paga não pode ser excluída. Cancele antes.");
  }

  await assertLedgerPeriodOpen(resourceKey, {
    date: existing.date as Date,
    congregationId: existing.congregationId,
  });

  await prisma.$transaction(async (tx) => {
    const txDelegate = tx[model] as unknown as {
      delete: (args: { where: { id: string } }) => Promise<Row>;
    };
    if (isLedgerResource(resourceKey)) {
      const cashEntry = tx.cashEntry as unknown as {
        deleteMany: (args: { where: Record<string, unknown> }) => Promise<void>;
      };
      await cashEntry.deleteMany({
        where: {
          sourceType: LEDGER_SOURCE_BY_RESOURCE[resourceKey],
          sourceId: id,
        },
      });
    }
    await txDelegate.delete({ where: { id } });
  });

  await auditLog({
    userId: actor.userId,
    churchId: actor.scope.churchId,
    action: "DELETE",
    module: def.key,
    entity: def.singular,
    entityId: id,
    description: `Registro excluído (${def.singular})`,
  });
}