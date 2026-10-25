import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Carrega `.env` e `.env.local` (este último com prioridade) sem dependências
 * extras. Usado pelos scripts de backup/restore, que rodam fora do Next.
 */
export function loadEnv() {
  for (const file of [".env", ".env.local"]) {
    const path = join(process.cwd(), file);
    if (!existsSync(path)) continue;

    for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;

      const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
      if (!match) continue;

      let value = match[2].trim();
      const quoted =
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"));
      if (quoted) value = value.slice(1, -1);

      process.env[match[1]] = value;
    }
  }
}
