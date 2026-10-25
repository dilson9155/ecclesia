import { gzipSync } from "node:zlib";
import { prisma } from "@/lib/prisma";

export type BackupTable = {
  table: string;
  rows: Record<string, unknown>[];
};

export type BackupPayload = {
  version: 1;
  createdAt: string;
  database: string;
  tables: BackupTable[];
};

export type BackupResult = {
  buffer: Buffer;
  key: string;
  createdAt: string;
  tables: number;
  rows: number;
};

function quoteIdentifier(name: string) {
  return `"${name.replace(/"/g, '""')}"`;
}

/** BigInt não é serializável em JSON; Decimal/Date já possuem toJSON. */
function jsonReplacer(_key: string, value: unknown) {
  if (typeof value === "bigint") return value.toString();
  return value;
}

/** Chave no bucket: ecclesia/AAAA-MM-DD/ecclesia-<timestamp>.json.gz */
export function backupKey(createdAt: string) {
  const stamp = createdAt.replace(/[:.]/g, "-");
  return `ecclesia/${createdAt.slice(0, 10)}/ecclesia-${stamp}.json.gz`;
}

/**
 * Lê todas as tabelas do schema atual e gera um snapshot JSON comprimido.
 * A leitura é genérica (information_schema), então novas tabelas entram no
 * backup automaticamente.
 */
export async function createBackup(): Promise<BackupResult> {
  const tableNames = await prisma.$queryRawUnsafe<Array<{ table_name: string }>>(
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = current_schema()
        AND table_type = 'BASE TABLE'
      ORDER BY table_name`
  );

  const tables: BackupTable[] = [];
  for (const { table_name } of tableNames) {
    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM ${quoteIdentifier(table_name)}`
    );
    tables.push({ table: table_name, rows });
  }

  const createdAt = new Date().toISOString();
  const payload: BackupPayload = {
    version: 1,
    createdAt,
    database: "ecclesia",
    tables,
  };

  const json = JSON.stringify(payload, jsonReplacer);
  const buffer = gzipSync(Buffer.from(json, "utf8"), { level: 9 });

  return {
    buffer,
    key: backupKey(createdAt),
    createdAt,
    tables: tables.length,
    rows: tables.reduce((total, entry) => total + entry.rows.length, 0),
  };
}
