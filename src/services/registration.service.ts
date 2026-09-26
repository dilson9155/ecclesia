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
      return Promise.resolve(scope.sedeId ? { id: scope.sedeId } : { id: "__none__" });
    case "congregacoes":
      if (scope.congregationId) {
        return Promise.resolve({ id: scope.congregationId });
      }
      return Promise.resolve(scope.sedeId ? { sedeId: scope.sedeId } : { id: "__none__" });
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
    default:
      // contas, centrosCusto e fornecedores são referências no nível da igreja
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