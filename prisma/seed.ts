import { PrismaClient, UserRoleName } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ROLES: Array<{ name: UserRoleName; description: string }> = [
  { name: "SUPER_ADMIN", description: "Super administrador: acesso total ao sistema" },
  { name: "ADMIN_SEDE", description: "Administrador da sede: gerencia toda a igreja" },
  { name: "ADMIN_CONGREGACAO", description: "Administrador de uma congregação" },
  { name: "FINANCEIRO", description: "Responsável pelo financeiro e contabilidade" },
  { name: "SECRETARIA", description: "Secretaria: membros, carteirinhas e cartas" },
  { name: "PASTOR", description: "Pastor: consulta e relatórios" },
  { name: "CONSULTA", description: "Acesso somente leitura" },
];

const PERMISSIONS: Array<{ key: string; name: string; group: string }> = [
  { key: "dashboard.view", name: "Visualizar dashboard", group: "Dashboard" },
  { key: "igrejas.view", name: "Visualizar igreja", group: "Igrejas" },
  { key: "igrejas.manage", name: "Gerenciar igreja", group: "Igrejas" },
  { key: "congregacoes.view", name: "Visualizar congregações", group: "Congregações" },
  { key: "congregacoes.create", name: "Criar congregações", group: "Congregações" },
  { key: "congregacoes.edit", name: "Editar congregações", group: "Congregações" },
  { key: "congregacoes.delete", name: "Excluir congregações", group: "Congregações" },
  { key: "sedes.view", name: "Visualizar sedes", group: "Sedes" },
  { key: "sedes.manage", name: "Gerenciar sedes", group: "Sedes" },
  { key: "membros.view", name: "Visualizar membros", group: "Membros" },
  { key: "membros.create", name: "Criar membros", group: "Membros" },
  { key: "membros.edit", name: "Editar membros", group: "Membros" },
  { key: "membros.delete", name: "Excluir membros", group: "Membros" },
  { key: "membros.export", name: "Exportar membros", group: "Membros" },
  { key: "visitantes.view", name: "Visualizar visitantes", group: "Visitantes" },
  { key: "visitantes.create", name: "Criar visitantes", group: "Visitantes" },
  { key: "visitantes.edit", name: "Editar visitantes", group: "Visitantes" },
  { key: "visitantes.delete", name: "Excluir visitantes", group: "Visitantes" },
  { key: "carteirinhas.view", name: "Visualizar carteirinhas", group: "Carteirinhas" },
  { key: "carteirinhas.emit", name: "Emitir carteirinhas", group: "Carteirinhas" },
  { key: "carteirinhas.delete", name: "Cancelar carteirinhas", group: "Carteirinhas" },
  { key: "cartas.view", name: "Visualizar cartas", group: "Cartas" },
  { key: "cartas.create", name: "Criar cartas", group: "Cartas" },
  { key: "cartas.edit", name: "Editar cartas", group: "Cartas" },
  { key: "cartas.delete", name: "Excluir cartas", group: "Cartas" },
  { key: "cartas.export", name: "Exportar cartas", group: "Cartas" },
  { key: "dizimos.view", name: "Visualizar dízimos", group: "Dízimos" },
  { key: "dizimos.create", name: "Criar dízimos", group: "Dízimos" },
  { key: "dizimos.cancel", name: "Cancelar dízimos", group: "Dízimos" },
  { key: "dizimos.estorno", name: "Estornar dízimos", group: "Dízimos" },
  { key: "ofertas.view", name: "Visualizar ofertas", group: "Ofertas" },
  { key: "ofertas.create", name: "Criar ofertas", group: "Ofertas" },
  { key: "ofertas.cancel", name: "Cancelar ofertas", group: "Ofertas" },
  { key: "ofertas.estorno", name: "Estornar ofertas", group: "Ofertas" },
  { key: "entradas.view", name: "Visualizar entradas", group: "Entradas" },
  { key: "entradas.create", name: "Criar entradas", group: "Entradas" },
  { key: "entradas.edit", name: "Editar entradas", group: "Entradas" },
  { key: "entradas.cancel", name: "Cancelar entradas", group: "Entradas" },
  { key: "entradas.estorno", name: "Estornar entradas", group: "Entradas" },
  { key: "saidas.view", name: "Visualizar saídas", group: "Saídas" },
  { key: "saidas.create", name: "Criar saídas", group: "Saídas" },
  { key: "saidas.edit", name: "Editar saídas", group: "Saídas" },
  { key: "saidas.baixar", name: "Dar baixa em saídas", group: "Saídas" },
  { key: "saidas.cancel", name: "Cancelar saídas", group: "Saídas" },
  { key: "saidas.estorno", name: "Estornar saídas", group: "Saídas" },
  { key: "fornecedores.view", name: "Visualizar fornecedores", group: "Fornecedores" },
  { key: "fornecedores.create", name: "Criar fornecedores", group: "Fornecedores" },
  { key: "fornecedores.edit", name: "Editar fornecedores", group: "Fornecedores" },
  { key: "fornecedores.delete", name: "Excluir fornecedores", group: "Fornecedores" },
  { key: "planoContas.view", name: "Visualizar plano de contas", group: "Plano de Contas" },
  { key: "planoContas.create", name: "Criar contas", group: "Plano de Contas" },
  { key: "planoContas.edit", name: "Editar contas", group: "Plano de Contas" },
  { key: "planoContas.delete", name: "Excluir contas", group: "Plano de Contas" },
  { key: "centrosCusto.view", name: "Visualizar centros de custo", group: "Centros de Custo" },
  { key: "centrosCusto.create", name: "Criar centros de custo", group: "Centros de Custo" },
  { key: "centrosCusto.edit", name: "Editar centros de custo", group: "Centros de Custo" },
  { key: "centrosCusto.delete", name: "Excluir centros de custo", group: "Centros de Custo" },
  { key: "livroCaixa.view", name: "Visualizar livro caixa", group: "Livro Caixa" },
  { key: "livroCaixa.export", name: "Exportar livro caixa", group: "Livro Caixa" },
  { key: "relatorios.view", name: "Visualizar relatórios", group: "Relatórios" },
  { key: "relatorios.export", name: "Exportar relatórios", group: "Relatórios" },
  { key: "fechamento.view", name: "Visualizar fechamento", group: "Fechamento" },
  { key: "fechamento.fechar", name: "Fechar mês", group: "Fechamento" },
  { key: "fechamento.reabrir", name: "Reabrir mês fechado", group: "Fechamento" },
  { key: "usuarios.view", name: "Visualizar usuários", group: "Usuários" },
  { key: "usuarios.manage", name: "Gerenciar usuários", group: "Usuários" },
  { key: "auditoria.view", name: "Visualizar auditoria", group: "Auditoria" },
  { key: "config.view", name: "Visualizar configurações", group: "Configurações" },
  { key: "config.edit", name: "Editar configurações", group: "Configurações" },
  { key: "backup.export", name: "Exportar backup", group: "Backup" },
  { key: "backup.restore", name: "Restaurar backup", group: "Backup" },
];

const ALL = PERMISSIONS.map((p) => p.key);

const ROLE_PERMISSIONS: Record<UserRoleName, string[]> = {
  SUPER_ADMIN: ALL,
  ADMIN_SEDE: ALL.filter(
    (k) => !["igrejas.manage", "backup.restore", "fechamento.reabrir"].includes(k)
  ),
  ADMIN_CONGREGACAO: [
    "dashboard.view",
    "igrejas.view",
    "sedes.view",
    "congregacoes.view",
    "membros.view", "membros.create", "membros.edit", "membros.export",
    "visitantes.view", "visitantes.create", "visitantes.edit",
    "carteirinhas.view", "carteirinhas.emit",
    "cartas.view", "cartas.create", "cartas.edit", "cartas.export",
    "dizimos.view", "dizimos.create", "dizimos.cancel", "dizimos.estorno",
    "ofertas.view", "ofertas.create", "ofertas.cancel", "ofertas.estorno",
    "entradas.view", "entradas.create", "entradas.edit", "entradas.cancel", "entradas.estorno",
    "saidas.view", "saidas.create", "saidas.edit", "saidas.baixar", "saidas.cancel", "saidas.estorno",
    "fornecedores.view", "fornecedores.create", "fornecedores.edit",
    "planoContas.view",
    "centrosCusto.view",
    "livroCaixa.view", "livroCaixa.export",
    "relatorios.view", "relatorios.export",
    "fechamento.view",
    "auditoria.view",
  ],
  FINANCEIRO: [
    "dashboard.view",
    "igrejas.view",
    "sedes.view",
    "congregacoes.view",
    "membros.view",
    "carteirinhas.view",
    "cartas.view",
    "dizimos.view", "dizimos.create", "dizimos.cancel", "dizimos.estorno",
    "ofertas.view", "ofertas.create", "ofertas.cancel", "ofertas.estorno",
    "entradas.view", "entradas.create", "entradas.edit", "entradas.cancel", "entradas.estorno",
    "saidas.view", "saidas.create", "saidas.edit", "saidas.baixar", "saidas.cancel", "saidas.estorno",
    "fornecedores.view", "fornecedores.create", "fornecedores.edit",
    "planoContas.view",
    "centrosCusto.view",
    "livroCaixa.view", "livroCaixa.export",
    "relatorios.view", "relatorios.export",
    "fechamento.view", "fechamento.fechar",
    "auditoria.view",
  ],
  SECRETARIA: [
    "dashboard.view",
    "igrejas.view",
    "sedes.view",
    "congregacoes.view",
    "membros.view", "membros.create", "membros.edit", "membros.export",
    "visitantes.view", "visitantes.create", "visitantes.edit",
    "carteirinhas.view", "carteirinhas.emit",
    "cartas.view", "cartas.create", "cartas.edit", "cartas.export",
    "relatorios.view",
  ],
  PASTOR: [
    "dashboard.view",
    "igrejas.view",
    "sedes.view",
    "congregacoes.view",
    "membros.view",
    "visitantes.view",
    "carteirinhas.view",
    "cartas.view",
    "dizimos.view",
    "ofertas.view",
    "entradas.view",
    "saidas.view",
    "fornecedores.view",
    "livroCaixa.view",
    "relatorios.view", "relatorios.export",
    "fechamento.view",
    "auditoria.view",
  ],
  CONSULTA: [
    "dashboard.view",
    "igrejas.view",
    "sedes.view",
    "congregacoes.view",
    "membros.view",
    "visitantes.view",
    "carteirinhas.view",
    "cartas.view",
    "dizimos.view",
    "ofertas.view",
    "entradas.view",
    "saidas.view",
    "fornecedores.view",
    "planoContas.view",
    "centrosCusto.view",
    "livroCaixa.view",
    "relatorios.view",
    "fechamento.view",
  ],
};

type AccountSeed = {
  code: string;
  name: string;
  nature: "RECEITA" | "DESPESA";
};

const ACCOUNTS: AccountSeed[] = [
  { code: "1", name: "RECEITAS", nature: "RECEITA" },
  { code: "1.01", name: "DÍZIMOS", nature: "RECEITA" },
  { code: "1.01.001", name: "Dízimos", nature: "RECEITA" },
  { code: "1.02", name: "OFERTAS", nature: "RECEITA" },
  { code: "1.02.001", name: "Oferta de culto", nature: "RECEITA" },
  { code: "1.02.002", name: "Missões", nature: "RECEITA" },
  { code: "1.02.003", name: "Construção", nature: "RECEITA" },
  { code: "1.02.004", name: "Eventos", nature: "RECEITA" },
  { code: "1.02.005", name: "Departamento", nature: "RECEITA" },
  { code: "1.02.006", name: "Oferta especial", nature: "RECEITA" },
  { code: "1.02.007", name: "Outras ofertas", nature: "RECEITA" },
  { code: "1.03", name: "DOAÇÕES", nature: "RECEITA" },
  { code: "1.03.001", name: "Doações de membros", nature: "RECEITA" },
  { code: "1.03.002", name: "Doações de não membros", nature: "RECEITA" },
  { code: "1.04", name: "OUTRAS RECEITAS", nature: "RECEITA" },
  { code: "1.04.001", name: "Aluguel de áreas", nature: "RECEITA" },
  { code: "1.04.002", name: "Receitas de eventos", nature: "RECEITA" },
  { code: "1.04.003", name: "Outras receitas", nature: "RECEITA" },
  { code: "2", name: "DESPESAS", nature: "DESPESA" },
  { code: "2.01", name: "ADMINISTRATIVAS", nature: "DESPESA" },
  { code: "2.01.001", name: "Energia elétrica", nature: "DESPESA" },
  { code: "2.01.002", name: "Água e esgoto", nature: "DESPESA" },
  { code: "2.01.003", name: "Internet", nature: "DESPESA" },
  { code: "2.01.004", name: "Telefone", nature: "DESPESA" },
  { code: "2.01.005", name: "Material de escritório", nature: "DESPESA" },
  { code: "2.01.006", name: "Impostos e taxas", nature: "DESPESA" },
  { code: "2.02", name: "PESSOAL", nature: "DESPESA" },
  { code: "2.02.001", name: "Salários", nature: "DESPESA" },
  { code: "2.02.002", name: "Honorários pastorais", nature: "DESPESA" },
  { code: "2.02.003", name: "Encargos sociais", nature: "DESPESA" },
  { code: "2.02.004", name: "Ajuda de custo", nature: "DESPESA" },
  { code: "2.03", name: "MANUTENÇÃO", nature: "DESPESA" },
  { code: "2.03.001", name: "Manutenção predial", nature: "DESPESA" },
  { code: "2.03.002", name: "Limpeza", nature: "DESPESA" },
  { code: "2.04", name: "MISSÕES", nature: "DESPESA" },
  { code: "2.04.001", name: "Missões nacionais", nature: "DESPESA" },
  { code: "2.04.002", name: "Missões internacionais", nature: "DESPESA" },
  { code: "2.05", name: "EVENTOS", nature: "DESPESA" },
  { code: "2.05.001", name: "Conferências e congressos", nature: "DESPESA" },
  { code: "2.06", name: "CONSTRUÇÃO", nature: "DESPESA" },
  { code: "2.06.001", name: "Materiais", nature: "DESPESA" },
  { code: "2.06.002", name: "Mão de obra", nature: "DESPESA" },
  { code: "2.07", name: "OUTRAS DESPESAS", nature: "DESPESA" },
  { code: "2.07.001", name: "Transporte", nature: "DESPESA" },
  { code: "2.07.002", name: "Outras despesas", nature: "DESPESA" },
];

const COST_CENTERS: Array<{ code: string; name: string; description: string }> = [
  { code: "ADM", name: "Administração", description: "Despesas administrativas gerais" },
  { code: "TEMPLO", name: "Templo", description: "Custos com o templo" },
  { code: "MISSOES", name: "Missões", description: "Projetos missionários" },
  { code: "EVANGELISMO", name: "Evangelismo", description: "Atividades evangelísticas" },
  { code: "EBD", name: "EBD", description: "Escola Bíblica Dominical" },
  { code: "JOVENS", name: "Jovens", description: "Ministério de jovens" },
  { code: "CRIANCAS", name: "Crianças", description: "Ministério infantil" },
  { code: "MUSICA", name: "Música", description: "Ministério de música" },
  { code: "SOCIAL", name: "Assistência social", description: "Ações sociais e beneficentes" },
  { code: "CONSTRUCAO", name: "Construção", description: "Obras e reformas" },
  { code: "EVENTOS", name: "Eventos", description: "Eventos e confraternizações" },
  { code: "COMUNICACAO", name: "Comunicação", description: "Comunicação e mídia" },
  { code: "TRANSPORTE", name: "Transporte", description: "Transporte e logística" },
];

async function seedAuth() {
  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: { name: role.name, description: role.description, system: true },
    });
  }

  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: { name: perm.name, group: perm.group },
      create: perm,
    });
  }

  const roles = await prisma.role.findMany();
  const perms = await prisma.permission.findMany();
  const permByKey = new Map(perms.map((p) => [p.key, p.id]));

  for (const roleName of Object.keys(ROLE_PERMISSIONS) as UserRoleName[]) {
    const role = roles.find((r) => r.name === roleName);
    if (!role) continue;
    const keys = ROLE_PERMISSIONS[roleName];
    const permissionIds = keys
      .filter((k) => permByKey.has(k))
      .map((k) => permByKey.get(k)!);
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    for (const permissionId of permissionIds) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: {},
        create: { roleId: role.id, permissionId },
      });
    }
  }
}

async function seedChurch() {
  let church = await prisma.church.findFirst();
  if (!church) {
    church = await prisma.church.create({
      data: { name: "Minha Igreja" },
    });
  }

  let sede = await prisma.sede.findFirst({ where: { churchId: church.id } });
  if (!sede) {
    sede = await prisma.sede.create({
      data: { churchId: church.id, name: "Sede Central" },
    });
  }

  const congregacao = await prisma.congregation.upsert({
    where: { sedeId_code: { sedeId: sede.id, code: "001" } },
    update: {},
    create: {
      churchId: church.id,
      sedeId: sede.id,
      code: "001",
      name: "Congregação Central",
    },
  });

  return { church, sede, congregacao };
}

async function seedAccounts(churchId: string) {
  const existing = await prisma.account.findMany({ where: { churchId } });
  const byCode = new Map(existing.map((a) => [a.accountingCode, a]));

  for (const acc of ACCOUNTS) {
    if (byCode.has(acc.code)) continue;
    const segments = acc.code.split(".");
    const level = segments.length;
    const parentCode = segments.slice(0, -1).join(".");
    const parent = parentCode ? byCode.get(parentCode) : null;
    const created = await prisma.account.create({
      data: {
        churchId,
        code: acc.code,
        name: acc.name,
        nature: acc.nature,
        level,
        accountingCode: acc.code,
        parentId: parent?.id ?? null,
      },
    });
    byCode.set(acc.code, created);
  }
}

async function seedCostCenters(churchId: string) {
  for (const cc of COST_CENTERS) {
    await prisma.costCenter.upsert({
      where: { churchId_code: { churchId, code: cc.code } },
      update: { name: cc.name },
      create: { churchId, code: cc.code, name: cc.name, description: cc.description },
    });
  }
}

async function seedAdmin(churchId: string) {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) return;

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return;

  const role = await prisma.role.findUnique({ where: { name: "SUPER_ADMIN" } });
  if (!role) return;

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: {
      churchId,
      name: "Administrador",
      email,
      passwordHash,
      roles: { create: { roleId: role.id } },
    },
  });
}

async function main() {
  await seedAuth();

  const { church, sede, congregacao } = await seedChurch();
  await seedAccounts(church.id);
  await seedCostCenters(church.id);
  await seedAdmin(church.id);

  const counts = {
    roles: await prisma.role.count(),
    permissions: await prisma.permission.count(),
    accounts: await prisma.account.count({ where: { churchId: church.id } }),
    costCenters: await prisma.costCenter.count({ where: { churchId: church.id } }),
    congregations: await prisma.congregation.count({ where: { churchId: church.id } }),
  };

  console.log("Seed concluído:");
  console.table(counts);
  console.log(`Igreja: ${church.name} · Sede: ${sede.name} · Congregação: ${congregacao.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });