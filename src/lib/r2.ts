import { AwsClient } from "aws4fetch";

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

/**
 * Credenciais do Cloudflare R2 usadas para guardar os backups do banco.
 * Retorna null quando a integração não está configurada (ex.: ambiente local
 * sem as variáveis), permitindo que o backup continue apenas em disco.
 */
export function getR2Config(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET?.trim();

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;

  return { accountId, accessKeyId, secretAccessKey, bucket };
}

export function r2Endpoint(config: R2Config) {
  return `https://${config.accountId}.r2.cloudflarestorage.com`;
}

/** Envia um objeto para o bucket configurado usando a API S3 do R2. */
export async function uploadToR2(
  key: string,
  body: Uint8Array,
  contentType = "application/gzip"
) {
  const config = getR2Config();
  if (!config) {
    throw new Error(
      "Cloudflare R2 não configurado: defina R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY e R2_BUCKET."
    );
  }

  const client = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: "s3",
    region: "auto",
  });

  const url = `${r2Endpoint(config)}/${config.bucket}/${key}`;
  const response = await client.fetch(url, {
    method: "PUT",
    body: body as unknown as BodyInit,
    headers: { "content-type": contentType },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Falha ao enviar ${key} para o R2 (${response.status}): ${detail.slice(0, 300)}`
    );
  }

  return { key, size: body.byteLength };
}
