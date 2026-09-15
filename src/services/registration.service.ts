import "server-only";
import { prisma } from "@/lib/prisma";
import { getResource } from "@/modules/registration/definitions";
import type { FieldDef } from "@/modules/registration/definitions";
import { validateField } from "@/modules/registration/validators";
import { auditLog } from "@/services/audit.service";
import type { EntryNature, LedgerSource } from "@prisma/client";

type LedgerResource = "dizimos" | "ofertas";

const LEDGER_SOURCE_BY_RESOURCE: Record<LedgerResource, LedgerSource> = {
  dizimos: "DIZIMO",
  ofertas: "OFERTA",
};

function isLedgerResource(resourceKey: string): resourceKey is LedgerResource {
  return resourceKey === "dizimos" || resourceKey === "ofertas";
}

function ledgerDataFor(
  resourceKey: LedgerResource,
  actor: { userId: string },
  data: Record<string, unknown>
) {
  const isTithe = resourceKey === "dizimos";
  return {
    date: data.date as Date,
    description: isTithe
      ? `Dízimo${data.isAnonymous ? " (anônimo)" : ""}`
      : `Oferta${data.type ? ` (${String(data.type).toLowerCase()})` : ""}`,
    nature: "ENTRADA" as EntryNature,
    value: data.value as number,
    accountId: String(data.accountId),
    accountingCode: String(data.accountingCode),
    costCenterId: data.costCenterId ? String(data.costCenterId) : null,
    sourceType: LEDGER_SOURCE_BY_RESOURCE[resourceKey],
    createdById: actor.userId,
  };
}

type ModelKey = "church" | "sede" | "congregation" | "member" | "account" | "costCenter" | "tithe" | "offering";

const MODEL_BY_RESOURCE: Record<string, ModelKey> = {
  igrejas: "church",
  sedes: "sede",
  congregacoes: "congregation",
  membros: "member",
  contas: "account",
  centrosCusto: "costCenter",
  dizimos: "tithe",
  ofertas: "offering",
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
};

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

function scopeFilter(resourceKey: string, churchId: string) {
  if (resourceKey === "igrejas") return { id: churchId };
  return { churchId };
}

export async function listRows(resourceKey: string, churchId: string): Promise<Row[]> {
  const model = MODEL_BY_RESOURCE[resourceKey];
  if (!model) return [];
  const def = getResource(resourceKey)!;
  const { field, direction } = SORT_BY_MODEL[model];
  const delegate = prisma[model] as unknown as {
    findMany: (args: { where?: Record<string, unknown>; orderBy?: Record<string, unknown> }) => Promise<Row[]>;
  };
  const rows = await delegate.findMany({
    where: scopeFilter(resourceKey, churchId),
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
  churchId: string
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
      where: scopeFilter(targetKey, churchId),
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
  actor: { userId: string; churchId: string },
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
    data.churchId = actor.churchId;
  }

  if (resourceKey === "membros") {
    const congregationId = String(data.congregationId ?? "");
    if (!congregationId) throw new Error("Campo obrigatório: Congregação");
    const congregation = await prisma.congregation.findUnique({ where: { id: congregationId } });
    if (!congregation) throw new Error("Congregação não encontrada.");
    if (!data.code) {
      const count = await prisma.member.count({ where: { congregationId } });
      data.code = String(count + 1).padStart(4, "0");
    }
    data.sedeId = congregation.sedeId;
  }

  if (resourceKey === "contas") {
    if (!data.accountingCode) throw new Error("Campo obrigatório: Código contábil");
    if (data.parentId === "") data.parentId = null;
  }

  if (resourceKey === "centrosCusto") {
    if (!data.code) throw new Error("Campo obrigatório: Código");
    if (data.congregationId === "") data.congregationId = null;
  }

  if (resourceKey === "dizimos") {
    const congregationId = String(data.congregationId ?? "");
    if (!congregationId) throw new Error("Campo obrigatório: Congregação");
    if (!data.accountId) throw new Error("Campo obrigatório: Conta contábil");
    if (data.memberId === "") data.memberId = null;
    if (data.costCenterId === "") data.costCenterId = null;
    if (!data.accountingCode) data.accountingCode = data.accountId;
    if (!data.paymentMethod) data.paymentMethod = "DINHEIRO";
  }

  if (resourceKey === "ofertas") {
    const congregationId = String(data.congregationId ?? "");
    if (!congregationId) throw new Error("Campo obrigatório: Congregação");
    if (!data.accountId) throw new Error("Campo obrigatório: Conta contábil");
    if (data.memberId === "") data.memberId = null;
    if (data.costCenterId === "") data.costCenterId = null;
    if (!data.accountingCode) data.accountingCode = data.accountId;
    if (!data.paymentMethod) data.paymentMethod = "DINHEIRO";
    if (!data.type) data.type = "CULTO";
  }

  const delegate = prisma[model] as unknown as {
    create: (args: { data: Record<string, unknown> }) => Promise<Row>;
    update: (args: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => Promise<Row>;
    findUnique: (args: { where: { id: string } }) => Promise<Row | null>;
  };

  const scopedWhere = scopeFilter(resourceKey, actor.churchId);
  const ledger = isLedgerResource(resourceKey)
    ? ledgerDataFor(resourceKey, actor, data)
    : null;

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
    let row: Row;
    if (id) {
      row = await txDelegate.update({ where: { id }, data });
      await cashEntry.deleteMany({
        where: {
          sourceType: LEDGER_SOURCE_BY_RESOURCE[resourceKey as LedgerResource],
          sourceId: row.id,
        },
      });
    } else {
      row = await txDelegate.create({ data });
    }
    await cashEntry.create({
      data: {
        churchId: actor.churchId,
        congregationId: String(data.congregationId),
        ...(ledger as Record<string, unknown>),
        sourceId: row.id,
      },
    });
    return row;
  }

  if (id) {
    const existing = await delegate.findUnique({ where: { id } });
    if (!existing) throw new Error("Registro não encontrado.");
    if (scopedWhere.id && existing.id !== scopedWhere.id) {
      throw new Error("Registro não pertence à sua igreja.");
    }
    if (scopedWhere.churchId && existing.churchId !== scopedWhere.churchId) {
      throw new Error("Registro não pertence à sua igreja.");
    }
    const updated = ledger
      ? await prisma.$transaction((tx) => saveLedgerRow(tx))
      : await delegate.update({ where: { id }, data });
    await auditLog({
      userId: actor.userId,
      churchId: actor.churchId,
      action: "UPDATE",
      module: def.key,
      entity: def.singular,
      entityId: updated.id,
      description: `Registro atualizado (${def.singular})`,
      newValues: data as never,
    });
    return updated;
  }

  const created = ledger
    ? await prisma.$transaction((tx) => saveLedgerRow(tx))
    : await delegate.create({ data });
  await auditLog({
    userId: actor.userId,
    churchId: actor.churchId,
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
  actor: { userId: string; churchId: string },
  id: string
): Promise<void> {
  const model = MODEL_BY_RESOURCE[resourceKey];
  if (!model) throw new Error(`Recurso desconhecido: ${resourceKey}`);
  const def = getResource(resourceKey)!;
  const delegate = prisma[model] as unknown as {
    delete: (args: { where: { id: string } }) => Promise<Row>;
    findUnique: (args: { where: { id: string } }) => Promise<Row | null>;
  };

  const scopedWhere = scopeFilter(resourceKey, actor.churchId);
  const existing = await delegate.findUnique({ where: { id } });
  if (!existing) throw new Error("Registro não encontrado.");
  if (scopedWhere.id && existing.id !== scopedWhere.id) {
    throw new Error("Registro não pertence à sua igreja.");
  }
  if (scopedWhere.churchId && existing.churchId !== scopedWhere.churchId) {
    throw new Error("Registro não pertence à sua igreja.");
  }

  if (isLedgerResource(resourceKey)) {
    await prisma.$transaction(async (tx) => {
      const txDelegate = tx[model] as unknown as {
        delete: (args: { where: { id: string } }) => Promise<Row>;
      };
      const cashEntry = tx.cashEntry as unknown as {
        deleteMany: (args: { where: Record<string, unknown> }) => Promise<void>;
      };
      await cashEntry.deleteMany({
        where: {
          sourceType: LEDGER_SOURCE_BY_RESOURCE[resourceKey],
          sourceId: id,
        },
      });
      await txDelegate.delete({ where: { id } });
    });
  } else {
    await delegate.delete({ where: { id } });
  }

  await auditLog({
    userId: actor.userId,
    churchId: actor.churchId,
    action: "DELETE",
    module: def.key,
    entity: def.singular,
    entityId: id,
    description: `Registro excluído (${def.singular})`,
  });
}