import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";

export async function GET(request: Request) {
  const user = await requirePermission("livroCaixa.export");
  if (!user.churchId) {
    return new Response("Igreja não encontrada.", { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get("month");
  if (!monthParam || !/^\d{4}-\d{2}$/.test(monthParam)) {
    return new Response("Parâmetro month inválido (use AAAA-MM).", { status: 400 });
  }
  const [yearStr, monthStr] = monthParam.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (Number.isNaN(year) || Number.isNaN(month) || month < 1 || month > 12) {
    return new Response("Parâmetro month inválido.", { status: 400 });
  }

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const entries = await prisma.cashEntry.findMany({
    where: {
      churchId: user.churchId,
      date: { gte: start, lt: end },
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    include: {
      account: { select: { name: true } },
      costCenter: { select: { name: true } },
    },
  });

  const BOM = "\uFEFF";
  const header = [
    "Data",
    "Descrição",
    "Natureza",
    "Valor",
    "Nº Documento",
    "Conta",
    "Código Contábil",
    "Centro de Custo",
  ].join(";");
  const lines = entries.map((e) =>
    [
      e.date.toISOString().slice(0, 10),
      `"${(e.description ?? "").replace(/"/g, '""')}"`,
      e.nature,
      e.value.toString().replace(".", ","),
      e.document ?? "",
      e.account?.name ?? "",
      e.accountingCode ?? "",
      e.costCenter?.name ?? "",
    ].join(";")
  );

  const csv = [BOM, header, ...lines].join("\r\n");
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="livro-caixa-${monthParam}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}