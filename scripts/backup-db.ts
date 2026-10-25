import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadEnv } from "./load-env";
import { prisma } from "../src/lib/prisma";
import { getR2Config, uploadToR2 } from "../src/lib/r2";
import { createBackup } from "../src/services/backup.service";

loadEnv();

/**
 * Backup lógico do banco: gera um .json.gz com todas as tabelas, salva em
 * `backups/` e envia para o Cloudflare R2 quando as credenciais existirem.
 *
 * Uso: npm run backup
 */
async function main() {
  const startedAt = Date.now();
  const result = await createBackup();

  const fileName = result.key.split("/").pop() ?? "backup.json.gz";
  const localPath = join(process.cwd(), "backups", fileName);
  await mkdir(join(process.cwd(), "backups"), { recursive: true });
  await writeFile(localPath, result.buffer);

  const config = getR2Config();
  const uploaded = config ? await uploadToR2(result.key, result.buffer) : null;

  console.log(
    JSON.stringify(
      {
        ok: true,
        createdAt: result.createdAt,
        tables: result.tables,
        rows: result.rows,
        sizeBytes: result.buffer.byteLength,
        localPath,
        uploaded: uploaded
          ? { bucket: config?.bucket, key: uploaded.key }
          : "R2 não configurado (backup salvo apenas localmente)",
        durationMs: Date.now() - startedAt,
      },
      null,
      2
    )
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
