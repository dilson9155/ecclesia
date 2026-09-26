import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

// server-only deve ser no-op fora do Next (ambiente node do vitest).
vi.mock("server-only", () => ({}));

const TEST_DB_URL = process.env.TEST_DATABASE_URL ?? "";
const RUN_ISOLATION = TEST_DB_URL.includes("ecclesia_iso_test");

// Só roda contra o banco de teste descartável; nunca contra produção.
const describeRun = RUN_ISOLATION ? describe : describe.skip;

let prisma: PrismaClient;
type DBCtx = {
  churchA: string;
  churchB: string;
  sedeA: string;
  sedeB: string;
  congA: string;
  congB: string;
  memberA: string;
  memberB: string;
};

let ctx: DBCtx = null as unknown as DBCtx;

async function loadServices() {
  process.env.DATABASE_URL = TEST_DB_URL;
  const prismaMod = await import("@/lib/prisma");
  return prismaMod.prisma;
}

describeRun("isolamento entre igrejas (banco de teste)", () => {
  beforeAll(async () => {
    prisma = await loadServices();

    await prisma.$executeRawUnsafe('TRUNCATE TABLE "tithes" CASCADE');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "offerings" CASCADE');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "cash_entries" CASCADE');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "accounts" CASCADE');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "members" CASCADE');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "congregations" CASCADE');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "sedes" CASCADE');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "churches" CASCADE');

    await prisma.church.create({ data: { id: "churchA", name: "Igreja A" } });
    await prisma.church.create({ data: { id: "churchB", name: "Igreja B" } });
    await prisma.sede.create({ data: { id: "sedeA", name: "Sede A", churchId: "churchA", status: "ATIVO" } });
    await prisma.sede.create({ data: { id: "sedeB", name: "Sede B", churchId: "churchB", status: "ATIVO" } });
    await prisma.congregation.create({ data: { id: "congA", name: "Cong A", code: "001", churchId: "churchA", sedeId: "sedeA", status: "ATIVO" } });
    await prisma.congregation.create({ data: { id: "congB", name: "Cong B", code: "001", churchId: "churchB", sedeId: "sedeB", status: "ATIVO" } });
    await prisma.member.create({ data: { id: "memberA", name: "Membro A 1", churchId: "churchA", congregationId: "congA", sedeId: "sedeA", code: "0001", situation: "ATIVO" } });
    await prisma.member.create({ data: { id: "memberB", name: "Membro B 1", churchId: "churchB", congregationId: "congB", sedeId: "sedeB", code: "0001", situation: "ATIVO" } });

    ctx = {
      churchA: "churchA",
      churchB: "churchB",
      sedeA: "sedeA",
      sedeB: "sedeB",
      congA: "congA",
      congB: "congB",
      memberA: "memberA",
      memberB: "memberB",
    };
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it("escopo do super admin enxerga a igreja inteira (null) e nada além", async () => {
    const { scopedCongregationIdsOrNull, accessibleCongregations } = await import("@/lib/scope");
    const scopeA = { churchId: ctx.churchA, sedeId: null, congregationId: null, isSuperAdmin: true };
    const scopeB = { churchId: ctx.churchB, sedeId: null, congregationId: null, isSuperAdmin: true };

    expect(await scopedCongregationIdsOrNull(scopeA)).toBeNull();
    expect(await scopedCongregationIdsOrNull(scopeB)).toBeNull();

    const congsA = await accessibleCongregations(scopeA);
    const congsB = await accessibleCongregations(scopeB);
    expect(congsA.map((c) => c.id)).toEqual(["congA"]);
    expect(congsB.map((c) => c.id)).toEqual(["congB"]);
  });

  it("admin de sede enxerga apenas as congregações da própria sede", async () => {
    const { scopedCongregationIdsOrNull, accessibleCongregations } = await import("@/lib/scope");
    const scopeSedeA = { churchId: ctx.churchA, sedeId: ctx.sedeA, congregationId: null, isSuperAdmin: false };
    const scopeSedeB = { churchId: ctx.churchB, sedeId: ctx.sedeB, congregationId: null, isSuperAdmin: false };

    expect(await scopedCongregationIdsOrNull(scopeSedeA)).toEqual(["congA"]);
    expect(await scopedCongregationIdsOrNull(scopeSedeB)).toEqual(["congB"]);
    expect(await accessibleCongregations(scopeSedeA)).toHaveLength(1);
    expect(await accessibleCongregations(scopeSedeB)).toHaveLength(1);

    const { assertCongregationInScope } = await import("@/lib/scope");
    await expect(assertCongregationInScope(scopeSedeA, ctx.congB)).rejects.toThrow(/não pertence à sua igreja/);
  });

  it("listRows de membros retorna apenas a própria igreja", async () => {
    const { listRows } = await import("@/services/registration.service");
    const scopeA = { churchId: ctx.churchA, sedeId: null, congregationId: null, isSuperAdmin: true };
    const scopeB = { churchId: ctx.churchB, sedeId: null, congregationId: null, isSuperAdmin: true };

    const rowsA = await listRows("membros", scopeA);
    const rowsB = await listRows("membros", scopeB);
    const namesA = rowsA.map((r) => r.name);
    const namesB = rowsB.map((r) => r.name);

    expect(namesA).toEqual(["Membro A 1"]);
    expect(namesB).toEqual(["Membro B 1"]);
    expect(namesA.some((n) => namesB.includes(n))).toBe(false);
  });

  it("congregationWhere nunca mistura congregações de igrejas diferentes", async () => {
    const { congregationWhere } = await import("@/lib/scope");
    const scopeA = { churchId: ctx.churchA, sedeId: null, congregationId: null, isSuperAdmin: true };
    const scopeB = { churchId: ctx.churchB, sedeId: null, congregationId: null, isSuperAdmin: true };
    const sedeA = { churchId: ctx.churchA, sedeId: ctx.sedeA, congregationId: null, isSuperAdmin: false };
    const sedeB = { churchId: ctx.churchB, sedeId: ctx.sedeB, congregationId: null, isSuperAdmin: false };

    const adminWhereA = await congregationWhere(scopeA);
    const adminWhereB = await congregationWhere(scopeB);
    expect(adminWhereA).toEqual({ churchId: ctx.churchA });
    expect(adminWhereB).toEqual({ churchId: ctx.churchB });

    const whereA = (await congregationWhere(sedeA)) as { churchId: string; congregationId?: { in?: string[] } };
    const whereB = (await congregationWhere(sedeB)) as { churchId: string; congregationId?: { in?: string[] } };

    expect(whereA.churchId).toBe(ctx.churchA);
    expect(whereB.churchId).toBe(ctx.churchB);
    const inA = whereA.congregationId?.in ?? [];
    const inB = whereB.congregationId?.in ?? [];
    expect(inA).toEqual(["congA"]);
    expect(inB).toEqual(["congB"]);
    expect(inA.some((id) => inB.includes(id))).toBe(false);
    expect(inB.some((id) => inA.includes(id))).toBe(false);
  });

  it("saveRow rejeita criar membro numa congregação de outra igreja", async () => {
    const { saveRow } = await import("@/services/registration.service");
    const actorB = { userId: "userB", scope: { churchId: ctx.churchB, sedeId: null, congregationId: null, isSuperAdmin: true } };

    await expect(
      saveRow("membros", actorB, { name: "Invasor", congregationId: ctx.congA }, null)
    ).rejects.toThrow(/não pertence à sua igreja|escopo/);
  });

  it("deleteRow rejeita excluir membro de outra igreja", async () => {
    const { deleteRow } = await import("@/services/registration.service");
    const actorB = { userId: "userB", scope: { churchId: ctx.churchB, sedeId: null, congregationId: null, isSuperAdmin: true } };

    await expect(deleteRow("membros", actorB, ctx.memberA)).rejects.toThrow(/não pertence/);
    expect(
      await prisma.member.findUnique({ where: { id: ctx.memberA } })
    ).not.toBeNull();
  });

  it("relatório de membros respeita o escopo de congregações", async () => {
    const { getMemberReport } = await import("@/services/reports.service");
    const repA = await getMemberReport(ctx.churchA, { congregationIds: ["congA"] });
    const repB = await getMemberReport(ctx.churchB, { congregationIds: ["congB"] });
    expect(repA.rows.map((r) => r.name)).toEqual(["Membro A 1"]);
    expect(repB.rows.map((r) => r.name)).toEqual(["Membro B 1"]);
    expect(repA.total).toBe(1);
    expect(repB.total).toBe(1);
  });

  it("usuário sem igreja vinculada falha fechado (não vê nada)", async () => {
    const { listRows } = await import("@/services/registration.service");
    const noChurchScope = { churchId: null, sedeId: null, congregationId: null, isSuperAdmin: true };
    const rows = await listRows("membros", noChurchScope);
    expect(rows).toEqual([]);
  });
});