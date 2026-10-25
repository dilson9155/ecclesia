import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { loadEnv } from "./load-env";
import { prisma } from "../src/lib/prisma";
import type { BackupPayload, BackupTable } from "../src/services/backup.service";

loadEnv();

const IGNORED_TABLES = new Set(["_prisma_migrations"]);
const CHUNK_SIZE = 200;

function quoteIdentifier(name: string) {
  return `"${name.replace(/"/g, '""')}"`;
}

function toParam(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") {
    const candidate = value as { type?: string; data?: number[] };
    if (candidate.type === "Buffer" && Array.isArray(candidate.data)) {
      return Buffer.from(candidate.data);
    }
  }
  return value;
}

/** Ordena as tabelas para que as referenciadas sejam inseridas primeiro. */
async function insertionOrder(tables: string[]) {
  const edges = await prisma.$queryRawUnsafe<Array<{ child: string; parent: string }>>(
    `SELECT child.relname AS child, parent.relname AS parent
       FROM pg_constraint c
       JOIN pg_class child ON child.oid = c.conrelid
       JOIN pg_class parent ON parent.oid = c.confrelid
      WHERE c.contype = 'f'`
  );

  const known = new Set(tables);
  const children = new Map<string, Set<string>>();
  const indegree = new Map<string, number>();
  for (const table of tables) {
    children.set(table, new Set());
    indegree.set(table, 0);
  }

  for (const { child, parent } of edges) {
    if (!known.has(child) || !known.has(parent) || child === parent) continue;
    const set = children.get(parent)!;
    if (!set.has(child)) {
      set.add(child);
      indegree.set(child, (indegree.get(child) ?? 0) + 1);
    }
  }

  const queue = tables
    .filter((table) => (indegree.get(table) ?? 0) === 0)
    .sort();
  const order: string[] = [];

  while (queue.length > 0) {
    const table = queue.shift()!;
    order.push(table);
    for (const child of Array.from(children.get(table) ?? []).sort()) {
      const next = (indegree.get(child) ?? 0) - 1;
      indegree.set(child, next);
      if (next === 0) {
        queue.push(child);
        queue.sort();
      }
    }
  }

  // Ciclos (referências mútuas) não deveriam existir; entram no fim.
  const remaining = tables.filter((table) => !order.includes(table)).sort();
  return [...order, ...remaining];
}

async function insertTable(table: BackupTable) {
  if (table.rows.length === 0) return 0;

  const columns = Array.from(
    new Set(table.rows.flatMap((row) => Object.keys(row)))
  );
  const columnList = columns.map(quoteIdentifier).join(", ");

  let inserted = 0;
  for (let start = 0; start < table.rows.length; start += CHUNK_SIZE) {
    const chunk = table.rows.slice(start, start + CHUNK_SIZE);
    const params: unknown[] = [];
    const placeholders = chunk.map((row) => {
      const slots = columns.map((column) => {
        params.push(toParam(row[column]));
        return `$${params.length}`;
      });
      return `(${slots.join(", ")})`;
    });

    await prisma.$executeRawUnsafe(
      `INSERT INTO ${quoteIdentifier(table.table)} (${columnList}) VALUES ${placeholders.join(", ")}`,
      ...params
    );
    inserted += chunk.length;
  }

  return inserted;
}

async function main() {
  const args = process.argv.slice(2);
  const confirm = args.includes("--confirm");
  const fileArg = args.find((arg) => !arg.startsWith("--"));

  let file = fileArg;
  if (!file) {
    const dir = join(process.cwd(), "backups");
    const files = (await readdir(dir).catch(() => []))
      .filter((name) => name.endsWith(".json.gz"))
      .sort();
    file = files.length > 0 ? join(dir, files[files.length - 1]) : undefined;
  }

  if (!file) {
    throw new Error("Informe o arquivo do backup: npm run restore -- backups/arquivo.json.gz --confirm");
  }

  const payload = JSON.parse(
    gunzipSync(await readFile(file)).toString("utf8")
  ) as BackupPayload;

  const tables = payload.tables.filter(
    (entry) => !IGNORED_TABLES.has(entry.table)
  );
  const totalRows = tables.reduce((total, entry) => total + entry.rows.length, 0);

  if (!confirm) {
    console.log(
      JSON.stringify(
        {
          file,
          createdAt: payload.createdAt,
          tables: tables.length,
          rows: totalRows,
          dryRun: true,
          hint: "Nada foi alterado. Rode novamente com --confirm para restaurar (sobrescreve os dados atuais).",
        },
        null,
        2
      )
    );
    return;
  }

  const order = await insertionOrder(tables.map((entry) => entry.table));
  const byName = new Map(tables.map((entry) => [entry.table, entry]));
  const truncateList = order.map(quoteIdentifier).join(", ");

  await prisma.$transaction(
    async () => {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${truncateList} CASCADE`);

      let restored = 0;
      for (const name of order) {
        const entry = byName.get(name);
        if (!entry) continue;
        restored += await insertTable(entry);
      }

      console.log(
        JSON.stringify(
          { ok: true, file, createdAt: payload.createdAt, tables: order.length, rows: restored },
          null,
          2
        )
      );
    },
    { timeout: 600_000, maxWait: 30_000 }
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
