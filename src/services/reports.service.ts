import "server-only";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/format";

export type MemberReportRow = {
  code: string;
  name: string;
  congregation: string;
  situation: string;
  gender: string | null;
  maritalStatus: string | null;
  city: string | null;
  phone: string | null;
  birthDate: string | null;
  conversionDate: string | null;
};

export type FinancialAccountRow = {
  accountingCode: string;
  name: string;
  nature: string;
  revenue: number;
  expense: number;
  balance: number;
};

export type FinancialEntryRow = {
  date: string;
  description: string;
  nature: "ENTRADA" | "SAIDA";
  value: number;
  congregation: string;
  account: string;
  costCenter: string | null;
};

export type ContributionRow = {
  date: string;
  kind: "DÍZIMO" | "OFERTA";
  contributor: string;
  code: string | null;
  congregation: string;
  value: number;
};

export type ContributionMemberRow = {
  memberId: string;
  name: string;
  code: string;
  congregation: string;
  tithe: number;
  offering: number;
  total: number;
};

export type ReportContext = {
  churchId: string;
  churchName: string;
  churchCnpj: string | null;
  sedeName: string | null;
};

function toMonthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function getReportContext(churchId: string): Promise<ReportContext> {
  const church = await prisma.church.findUnique({
    where: { id: churchId },
    include: { sedes: { take: 1 } },
  });
  return {
    churchId,
    churchName: church?.name ?? "Igreja",
    churchCnpj: church?.cnpj ?? null,
    sedeName: church?.sedes[0]?.name ?? null,
  };
}

export function defaultRange(): { from: Date; to: Date } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from, to: now };
}

export async function fetchCongregations(churchId: string) {
  return prisma.congregation.findMany({
    where: { churchId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

/** Relatório de membros (mapa) */
export async function getMemberReport(
  churchId: string,
  opts: { congregationId?: string; situation?: string } = {}
) {
  const where: Record<string, unknown> = { churchId };
  if (opts.congregationId) where.congregationId = opts.congregationId;
  if (opts.situation) where.situation = opts.situation;

  const members = await prisma.member.findMany({
    where,
    include: { congregation: { select: { name: true } } },
    orderBy: [{ congregation: { name: "asc" } }, { name: "asc" }],
  });

  const rows: MemberReportRow[] = members.map((m) => ({
    code: m.code,
    name: m.name,
    congregation: m.congregation?.name ?? "—",
    situation: m.situation,
    gender: m.gender,
    maritalStatus: m.maritalStatus,
    city: m.city,
    phone: m.phone ?? m.whatsapp,
    birthDate: m.birthDate ? m.birthDate.toISOString().slice(0, 10) : null,
    conversionDate: m.conversionDate ? m.conversionDate.toISOString().slice(0, 10) : null,
  }));

  const bySituation = new Map<string, number>();
  const byCongregation = new Map<string, number>();
  for (const r of rows) {
    bySituation.set(r.situation, (bySituation.get(r.situation) ?? 0) + 1);
    byCongregation.set(r.congregation, (byCongregation.get(r.congregation) ?? 0) + 1);
  }

  return {
    rows,
    total: rows.length,
    bySituation: Object.fromEntries(bySituation),
    byCongregation: Object.fromEntries(byCongregation),
  };
}

/** Relatório financeiro (fluxo de caixa por conta) */
export async function getFinancialReport(
  churchId: string,
  opts: { from?: Date; to?: Date; congregationId?: string } = {}
) {
  const { from, to } = defaultRange();
  const gte = opts.from ?? from;
  const lte = opts.to ?? to;

  const where: Record<string, unknown> = {
    churchId,
    date: { gte, lte },
  };
  if (opts.congregationId) where.congregationId = opts.congregationId;

  const entries = await prisma.cashEntry.findMany({
    where,
    include: {
      account: { select: { name: true, nature: true } },
      costCenter: { select: { name: true } },
      congregation: { select: { name: true } },
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  const entryRows: FinancialEntryRow[] = entries.map((e) => ({
    date: e.date.toISOString().slice(0, 10),
    description: e.description,
    nature: e.nature,
    value: Number(e.value),
    congregation: e.congregation?.name ?? "—",
    account: e.account?.name ?? "—",
    costCenter: e.costCenter?.name ?? null,
  }));

  const byAccount = new Map<string, FinancialAccountRow>();
  const monthly = new Map<string, { month: string; revenue: number; expense: number }>();
  let revenue = 0;
  let expense = 0;

  for (const e of entryRows) {
    if (e.nature === "ENTRADA") revenue += e.value;
    else expense += e.value;

    const mk = toMonthKey(new Date(e.date + "T00:00:00"));
    const cur = monthly.get(mk) ?? { month: mk, revenue: 0, expense: 0 };
    if (e.nature === "ENTRADA") cur.revenue += e.value;
    else cur.expense += e.value;
    monthly.set(mk, cur);

    const key = e.account;
    const acct = byAccount.get(key) ?? {
      accountingCode: "",
      name: e.account,
      nature: e.nature,
      revenue: 0,
      expense: 0,
      balance: 0,
    };
    if (e.nature === "ENTRADA") acct.revenue += e.value;
    else acct.expense += e.value;
    acct.balance = acct.revenue - acct.expense;
    byAccount.set(key, acct);
  }

  return {
    rows: Array.from(byAccount.values()).sort((a, b) => a.name.localeCompare(b.name)),
    entries: entryRows,
    totals: { revenue, expense, balance: revenue - expense },
    monthly: Array.from(monthly.values()).sort((a, b) => a.month.localeCompare(b.month)),
  };
}

function contributorLabel(memberName?: string | null, contributor?: string | null): string {
  return memberName ?? contributor ?? "Anônimo";
}

/** Relatório de contribuições (dízimos + ofertas) */
export async function getContributionsReport(
  churchId: string,
  opts: { from?: Date; to?: Date; congregationId?: string; type?: string } = {}
) {
  const { from, to } = defaultRange();
  const gte = opts.from ?? from;
  const lte = opts.to ?? to;
  const type = opts.type ?? "ambos";

  const whereTithe: Record<string, unknown> = { churchId, date: { gte, lte } };
  const whereOffering: Record<string, unknown> = { churchId, date: { gte, lte } };
  if (opts.congregationId) {
    whereTithe.congregationId = opts.congregationId;
    whereOffering.congregationId = opts.congregationId;
  }

  const tithes = type === "ofertas"
    ? []
    : await prisma.tithe.findMany({
        where: whereTithe,
        include: {
          member: { select: { name: true, code: true } },
          congregation: { select: { name: true } },
        },
        orderBy: { date: "asc" },
      });

  const offerings = type === "dizimos"
    ? []
    : await prisma.offering.findMany({
        where: whereOffering,
        include: {
          member: { select: { name: true, code: true } },
          congregation: { select: { name: true } },
        },
        orderBy: { date: "asc" },
      });

    type InternalRow = ContributionRow & { _memberId: string | null };

  const rows: InternalRow[] = [
    ...tithes.map((t) => ({
      date: t.date.toISOString().slice(0, 10),
      kind: "DÍZIMO" as const,
      contributor: t.isAnonymous ? "Anônimo" : contributorLabel(t.member?.name),
      code: t.isAnonymous ? null : t.member?.code ?? null,
      congregation: t.congregation?.name ?? "—",
      value: Number(t.value),
      _memberId: t.memberId ?? null,
    })),
    ...offerings.map((o) => ({
      date: o.date.toISOString().slice(0, 10),
      kind: "OFERTA" as const,
      contributor: o.isAnonymous ? "Anônimo" : contributorLabel(o.member?.name, o.contributor),
      code: o.isAnonymous ? null : o.member?.code ?? null,
      congregation: o.congregation?.name ?? "—",
      value: Number(o.value),
      _memberId: o.memberId ?? null,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  const perMemberMap = new Map<
    string,
    { memberId: string; name: string; code: string; congregation: string; tithe: number; offering: number; total: number }
  >();
  for (const r of rows) {
    const key = r._memberId ?? `avulso:${r.contributor}`;
    const cur = perMemberMap.get(key) ?? {
      memberId: key,
      name: r.contributor,
      code: r.code ?? "",
      congregation: r.congregation,
      tithe: 0,
      offering: 0,
      total: 0,
    };
    if (r.kind === "DÍZIMO") cur.tithe += r.value;
    else cur.offering += r.value;
    cur.total = cur.tithe + cur.offering;
    perMemberMap.set(key, cur);
  }

  const perMember: ContributionMemberRow[] = Array.from(perMemberMap.values()).sort(
    (a, b) => a.name.localeCompare(b.name)
  );

  const totalTithe = rows.filter((r) => r.kind === "DÍZIMO").reduce((s, r) => s + r.value, 0);
  const totalOffering = rows.filter((r) => r.kind === "OFERTA").reduce((s, r) => s + r.value, 0);

  return {
    rows: rows.map((row) => ({
      date: row.date,
      kind: row.kind,
      contributor: row.contributor,
      code: row.code,
      congregation: row.congregation,
      value: row.value,
    })),
    perMember,
    totals: { tithe: totalTithe, offering: totalOffering, total: totalTithe + totalOffering },
  };
}

/* ---------- Builders CSV / plano de linhas para Excel ---------- */

export function memberReportSheet(rows: MemberReportRow[]) {
  const header = ["Código", "Nome", "Congregação", "Situação", "Sexo", "Estado Civil", "Cidade", "Telefone", "Nascimento"];
  const body = rows.map((r) => [
    r.code,
    r.name,
    r.congregation,
    r.situation,
    kindLabel("gender", r.gender),
    r.maritalStatus ?? "",
    r.city ?? "",
    r.phone ?? "",
    r.birthDate ?? "",
  ]);
  return { header, body };
}

export function memberReportCsv(rows: MemberReportRow[]): string {
  const { header, body } = memberReportSheet(rows);
  return "\uFEFF" + [header, ...body].map((l) => l.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";")).join("\r\n");
}

export function financialReportSheet(report: Awaited<ReturnType<typeof getFinancialReport>>) {
  const header = ["Conta", "Natureza", "Entradas (R$)", "Saídas (R$)", "Saldo (R$)"];
  const body = report.rows.map((r) => [
    r.name,
    r.nature,
    formatMoney(r.revenue),
    formatMoney(r.expense),
    formatMoney(r.balance),
  ]);
  body.push(["TOTAL", "", formatMoney(report.totals.revenue), formatMoney(report.totals.expense), formatMoney(report.totals.balance)]);
  return { header, body };
}

export function financialReportCsv(report: Awaited<ReturnType<typeof getFinancialReport>>): string {
  const { header, body } = financialReportSheet(report);
  return "\uFEFF" + [header, ...body].map((l) => l.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";")).join("\r\n");
}

export function contributionsReportSheet(report: Awaited<ReturnType<typeof getContributionsReport>>) {
  const header = ["Data", "Tipo", "Membro/Contribuinte", "Código", "Congregação", "Valor (R$)"];
  const body = report.rows.map((r) => [
    r.date,
    r.kind,
    r.contributor,
    r.code ?? "",
    r.congregation,
    formatMoney(r.value),
  ]);
  body.push(["", "TOTAL", "", "", "", formatMoney(report.totals.total)]);
  return { header, body };
}

export function contributionsReportCsv(report: Awaited<ReturnType<typeof getContributionsReport>>): string {
  const { header, body } = contributionsReportSheet(report);
  return "\uFEFF" + [header, ...body].map((l) => l.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";")).join("\r\n");
}

export function kindLabel(
  kind: "gender" | "maritalStatus" | "situation" | "offeringType",
  value: string | null | undefined
): string {
  if (!value) return "";
  const labels: Record<"gender" | "maritalStatus" | "situation" | "offeringType", Record<string, string>> = {
    gender: { MASCULINO: "Masculino", FEMININO: "Feminino" },
    maritalStatus: {
      SOLTEIRO: "Solteiro(a)",
      CASADO: "Casado(a)",
      DIVORCIADO: "Divorciado(a)",
      VIUVO: "Viúvo(a)",
      UNIAO_ESTAVEL: "União estável",
    },
    situation: {
      ATIVO: "Ativo",
      INATIVO: "Inativo",
      TRANSFERIDO: "Transferido",
      DESLIGADO: "Desligado",
      FALECIDO: "Falecido",
    },
    offeringType: {
      CULTO: "Culto",
      MISSOES: "Missões",
      CONSTRUCAO: "Construção",
      EVENTOS: "Eventos",
      DEPARTAMENTO: "Departamento",
      ESPECIAL: "Especial",
      OUTROS: "Outros",
    },
  };
  return labels[kind][value] ?? value;
}