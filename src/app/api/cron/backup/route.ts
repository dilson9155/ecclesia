import { createBackup } from "@/services/backup.service";
import { getR2Config, uploadToR2 } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Backup automático (Vercel Cron). Exige `Authorization: Bearer <CRON_SECRET>`,
 * enviado automaticamente pelo agendador da Vercel.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json(
      { ok: false, error: "CRON_SECRET não configurado." },
      { status: 500 }
    );
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!getR2Config()) {
    return Response.json(
      { ok: false, error: "Cloudflare R2 não configurado." },
      { status: 500 }
    );
  }

  try {
    const result = await createBackup();
    const uploaded = await uploadToR2(result.key, result.buffer);

    return Response.json({
      ok: true,
      key: uploaded.key,
      createdAt: result.createdAt,
      tables: result.tables,
      rows: result.rows,
      sizeBytes: result.buffer.byteLength,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
