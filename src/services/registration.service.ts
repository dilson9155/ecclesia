import "server-only";
import { prisma } from "@/lib/prisma";
import { getResource } from "@/modules/registration/definitions";
import type { FieldDef } from "@/modules/registration/definitions";
import { auditLog } from "@/services/audit.service";

type ModelKey = "church" | "sede" | "congregation";

const MODEL_BY_RESOURCE: Record<string, ModelKey> = {
  igrejas: "church",
  sedes: "sede",
  congregacoes: "congregation",
};

const SORT_BY_MODEL: Record<ModelKey, { field: string; direction: "asc" }> = {
  church: { field: "name", direction: "asc" },
  sede: { field: "name", direction: "asc" },
  congregation: { field: "code", direction: "asc" },
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
  return String(raw);
}

export function buildData(resourceKey: string, values: Record<string, unknown>) {
  const def = getResource(resourceKey);
  if (!def) throw new Error(`Recurso desconhecido: ${resourceKey}`);
  const data: Record<string, unknown> = {};
  for (const field of def.fields) {
    if (
      field.required &&
      (values[field.key] === undefined || values[field.key] === "" || values[field.key] === null)
    ) {
      throw new Error(`Campo obrigatório: ${field.label}`);
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

  const delegate = prisma[model] as unknown as {
    create: (args: { data: Record<string, unknown> }) => Promise<Row>;
    update: (args: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => Promise<Row>;
    findUnique: (args: { where: { id: string } }) => Promise<Row | null>;
  };

  const scopedWhere = scopeFilter(resourceKey, actor.churchId);

  if (id) {
    const existing = await delegate.findUnique({ where: { id } });
    if (!existing) throw new Error("Registro não encontrado.");
    if (scopedWhere.id && existing.id !== scopedWhere.id) {
      throw new Error("Registro não pertence à sua igreja.");
    }
    if (scopedWhere.churchId && existing.churchId !== scopedWhere.churchId) {
      throw new Error("Registro não pertence à sua igreja.");
    }
    const updated = await delegate.update({ where: { id }, data });
    await auditLog({
      userId: actor.userId,
      churchId: actor.churchId,
      action: "UPDATE",
      module: "estrutura",
      entity: def.singular,
      entityId: updated.id,
      description: `Atualizada ${def.singular}`,
      newValues: data as never,
    });
    return updated;
  }

  const created = await delegate.create({ data });
  await auditLog({
    userId: actor.userId,
    churchId: actor.churchId,
    action: "CREATE",
    module: "estrutura",
    entity: def.singular,
    entityId: created.id,
    description: `Criada ${def.singular}`,
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

  await delegate.delete({ where: { id } });
  await auditLog({
    userId: actor.userId,
    churchId: actor.churchId,
    action: "DELETE",
    module: "estrutura",
    entity: def.singular,
    entityId: id,
    description: `Excluída ${def.singular}`,
  });
}