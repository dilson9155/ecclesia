import "server-only";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/services/audit.service";
import {
  assertCongregationInScope,
  scopedCongregationIds,
  type DataScope,
} from "@/lib/scope";
import {
  roleRank,
  roleLabel,
  ROLE_ORDER,
  ROLE_RANK,
  type UserRoleName,
} from "@/modules/users/roles";

export type UserActor = {
  userId: string;
  roles: string[];
  scope: DataScope;
};

export type UserListItem = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  lastLoginAt: string | null;
  churchId: string | null;
  sedeId: string | null;
  congregationId: string | null;
  sedeName: string | null;
  congregationName: string | null;
  roles: string[];
  roleIds: string[];
};

export type Option = { value: string; label: string };

export type CongregationOption = Option & { sedeId: string };

export type ManagerData = {
  sedes: Option[];
  congregations: CongregationOption[];
  roles: { id: string; name: string; label: string }[];
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

async function emailTaken(
  email: string,
  ignoreId?: string
): Promise<boolean> {
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  return Boolean(existing && existing.id !== ignoreId);
}

function assertUserInScope(
  target: { sedeId: string | null; congregationId: string | null },
  scope: DataScope
): void {
  if (scope.isSuperAdmin && !scope.sedeId) return;
  if (scope.congregationId) {
    if (target.congregationId !== scope.congregationId) {
      throw new Error("Este usuário não pertence ao seu escopo.");
    }
    return;
  }
  if (scope.sedeId) {
    if (target.sedeId !== scope.sedeId) {
      throw new Error("Este usuário não pertence à sua sede.");
    }
    return;
  }
  throw new Error("Este usuário não pertence ao seu escopo.");
}

async function resolveTargetScope(
  actor: UserActor,
  roleName: string,
  input: { sedeId?: string | null; congregationId?: string | null }
): Promise<{ sedeId: string | null; congregationId: string | null }> {
  const churchId = actor.scope.churchId;
  if (!churchId) throw new Error("Nenhuma igreja vinculada ao seu usuário.");

  const congregationId = input.congregationId
    ? String(input.congregationId)
    : null;
  const sedeId = input.sedeId ? String(input.sedeId) : null;

  if (roleName === "SUPER_ADMIN") {
    if (congregationId || sedeId) {
      throw new Error(
        "Super Administrador não pode ter sede ou congregação vinculada."
      );
    }
    return { sedeId: null, congregationId: null };
  }

  if (roleName === "ADMIN_SEDE" && congregationId) {
    throw new Error(
      "Administrador da Sede deve ser vinculado apenas à sede, sem congregação."
    );
  }
  if (roleName === "ADMIN_CONGREGACAO" && !congregationId) {
    throw new Error(
      "Administrador da Congregação deve ter uma congregação vinculada."
    );
  }

  if (!congregationId && !sedeId) {
    throw new Error(
      "Informe a sede (ou a congregação) de vínculo do usuário."
    );
  }

  if (congregationId) {
    await assertCongregationInScope(actor.scope, congregationId);
    const congregation = await prisma.congregation.findUnique({
      where: { id: congregationId },
      select: { id: true, churchId: true, sedeId: true },
    });
    if (!congregation || congregation.churchId !== churchId) {
      throw new Error("Congregação não encontrada na sua igreja.");
    }
    return { sedeId: congregation.sedeId, congregationId };
  }

  if (sedeId) {
    if (actor.scope.sedeId && sedeId !== actor.scope.sedeId) {
      throw new Error("Você só pode vincular usuários à sua própria sede.");
    }
    const sede = await prisma.sede.findUnique({
      where: { id: sedeId },
      select: { id: true, churchId: true },
    });
    if (!sede || sede.churchId !== churchId) {
      throw new Error("Sede não encontrada na sua igreja.");
    }
  }

  return { sedeId, congregationId: null };
}

function assertAssignableRole(actor: UserActor, roleName: string): void {
  const newRank = ROLE_RANK[roleName] ?? 0;
  const actorRank = roleRank(actor.roles);
  if (roleName === "SUPER_ADMIN" && !actor.roles.includes("SUPER_ADMIN")) {
    throw new Error("Somente Super Administradores criam Super Administradores.");
  }
  if (!actor.roles.includes("SUPER_ADMIN") && newRank >= actorRank) {
    throw new Error(
      `Você não pode atribuir o papel "${roleLabel(roleName)}" (acima ou igual ao seu nível).`
    );
  }
}

export async function listUsers(
  actor: UserActor
): Promise<UserListItem[]> {
  const churchId = actor.scope.churchId;
  if (!churchId) return [];
  const where: { churchId: string; sedeId?: string; congregationId?: string } = {
    churchId,
  };

  if (actor.scope.isSuperAdmin && !actor.scope.sedeId) {
    // vê usuários de toda a igreja
  } else if (actor.scope.congregationId) {
    where.congregationId = actor.scope.congregationId;
  } else if (actor.scope.sedeId) {
    where.sedeId = actor.scope.sedeId;
  } else {
    where.sedeId = "__none__";
  }

  const rows = await prisma.user.findMany({
    where,
    include: {
      roles: { include: { role: true } },
      sede: { select: { id: true, name: true } },
      congregation: { select: { id: true, name: true } },
    },
    orderBy: [{ name: "asc" }],
  });

  return rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    active: u.active,
    lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
    churchId: u.churchId,
    sedeId: u.sedeId,
    congregationId: u.congregationId,
    sedeName: u.sede?.name ?? null,
    congregationName: u.congregation?.name ?? null,
    roles: u.roles.map((ur) => ur.role.name),
    roleIds: u.roles.map((ur) => ur.role.id),
  }));
}

export async function loadManagerData(actor: UserActor): Promise<ManagerData> {
  const churchId = actor.scope.churchId;
  if (!churchId) {
    return { sedes: [], congregations: [], roles: [] };
  }

  const sedes = await prisma.sede.findMany({
    where: { churchId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const sedeOptions = actor.scope.isSuperAdmin
    ? sedes.map((s) => ({ value: s.id, label: s.name }))
    : actor.scope.sedeId
      ? sedes
          .filter((s) => s.id === actor.scope.sedeId)
          .map((s) => ({ value: s.id, label: s.name }))
      : [];

  const congregationIds = await scopedCongregationIds(actor.scope);
  const superAdminAll =
    actor.scope.isSuperAdmin && !actor.scope.sedeId;
  const congregations = await prisma.congregation.findMany({
    where: superAdminAll
      ? { churchId }
      : congregationIds.length > 0
        ? { id: { in: congregationIds } }
        : { id: "__none__" },
    select: { id: true, name: true, sedeId: true },
    orderBy: { name: "asc" },
  });
  const congregationOptions = congregations.map((c) => ({
    value: c.id,
    label: c.name,
    sedeId: c.sedeId,
  }));

  const allRoles = await prisma.role.findMany({
    where: { active: true },
    orderBy: [
      { name: "desc" },
    ],
  });
  const actorRank = roleRank(actor.roles);
  const roles = allRoles
    .filter((r) => {
      const name = r.name as UserRoleName;
      if (actor.roles.includes("SUPER_ADMIN")) return true;
      return ROLE_RANK[name] < actorRank;
    })
    .sort(
      (a, b) =>
        ROLE_ORDER.indexOf(a.name as UserRoleName) -
        ROLE_ORDER.indexOf(b.name as UserRoleName)
    )
    .map((r) => ({ id: r.id, name: r.name as string, label: roleLabel(r.name) }));

  return {
    sedes: sedeOptions,
    congregations: congregationOptions,
    roles,
  };
}

export async function createUser(
  actor: UserActor,
  input: {
    name: string;
    email: string;
    password: string;
    roleId: string;
    sedeId?: string | null;
    congregationId?: string | null;
    active?: boolean;
  }
): Promise<{ id: string }> {
  const churchId = actor.scope.churchId;
  if (!churchId) throw new Error("Nenhuma igreja vinculada ao seu usuário.");

  const name = input.name.trim();
  const email = normalizeEmail(input.email);
  if (!name) throw new Error("Informe o nome do usuário.");
  if (!EMAIL_RE.test(email)) throw new Error("E-mail inválido.");
  if (input.password.length < 6) {
    throw new Error("A senha deve ter no mínimo 6 caracteres.");
  }

  const role = await prisma.role.findUnique({
    where: { id: input.roleId },
    select: { id: true, name: true, active: true },
  });
  if (!role || !role.active) throw new Error("Papel inválido ou inativo.");
  assertAssignableRole(actor, role.name as UserRoleName);

  const scoped = await resolveTargetScope(actor, role.name, {
    sedeId: input.sedeId,
    congregationId: input.congregationId,
  });

  if (await emailTaken(email)) {
    throw new Error("Já existe um usuário com este e-mail.");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.create({
    data: {
      churchId,
      sedeId: scoped.sedeId,
      congregationId: scoped.congregationId,
      name,
      email,
      passwordHash,
      active: input.active !== false,
      roles: { create: { roleId: role.id } },
    },
  });

  await auditLog({
    userId: actor.userId,
    churchId,
    action: "CREATE",
    module: "usuarios",
    entity: "User",
    entityId: user.id,
    description: `Usuário criado: ${name} (${email}) — ${roleLabel(role.name)}`,
  });
  return { id: user.id };
}

export async function updateUser(
  actor: UserActor,
  id: string,
  input: {
    name: string;
    email: string;
    roleId?: string;
    sedeId?: string | null;
    congregationId?: string | null;
    active?: boolean;
    password?: string;
  }
): Promise<{ id: string }> {
  const churchId = actor.scope.churchId;
  if (!churchId) throw new Error("Nenhuma igreja vinculada ao seu usuário.");

  const target = await prisma.user.findUnique({
    where: { id },
    include: { roles: { include: { role: true } } },
  });
  if (!target) throw new Error("Usuário não encontrado.");
  assertUserInScope(target, actor.scope);

  const isSelf = target.id === actor.userId;
  const targetRoles = target.roles.map((ur) => ur.role.name);
  const targetIsSuperAdmin = targetRoles.includes("SUPER_ADMIN");

  if (targetIsSuperAdmin && !actor.roles.includes("SUPER_ADMIN")) {
    throw new Error("Somente Super Administradores podem alterar Super Administradores.");
  }

  const name = input.name.trim();
  const email = normalizeEmail(input.email);
  if (!name) throw new Error("Informe o nome do usuário.");
  if (!EMAIL_RE.test(email)) throw new Error("E-mail inválido.");
  if (await emailTaken(email, target.id)) {
    throw new Error("Já existe um usuário com este e-mail.");
  }

  if (!isSelf) {
    const targetRank = roleRank(targetRoles);
    const actorRank = roleRank(actor.roles);
    if (!actor.roles.includes("SUPER_ADMIN") && targetRank >= actorRank) {
      throw new Error(
        "Você não pode alterar um usuário com papel igual ou superior ao seu."
      );
    }
  }

  const namedRole =
    input.roleId
      ? await prisma.role.findUnique({
          where: { id: input.roleId },
          select: { id: true, name: true, active: true },
        })
      : null;
  if (input.roleId && (!namedRole || !namedRole.active)) {
    throw new Error("Papel inválido ou inativo.");
  }

  if (!isSelf && input.roleId && namedRole) {
    assertAssignableRole(actor, namedRole.name as UserRoleName);
  }

  const basicData: {
    name: string;
    email: string;
    active?: boolean;
    sedeId?: string | null;
    congregationId?: string | null;
    passwordHash?: string;
  } = { name, email };

  if (input.password !== undefined && input.password !== "") {
    if (input.password.length < 6) {
      throw new Error("A senha deve ter no mínimo 6 caracteres.");
    }
    basicData.passwordHash = await bcrypt.hash(input.password, 12);
  }

  if (!isSelf && input.active !== undefined) {
    basicData.active = input.active;
  }

  if (!isSelf) {
    const nextRoleName = (namedRole?.name ?? targetRoles[0]) as string;
    const scoped = await resolveTargetScope(actor, nextRoleName, {
      sedeId: input.sedeId ?? target.sedeId,
      congregationId: input.congregationId ?? target.congregationId,
    });
    basicData.sedeId = scoped.sedeId;
    basicData.congregationId = scoped.congregationId;
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id }, data: basicData });
    if (!isSelf && namedRole) {
      await tx.userRole.deleteMany({ where: { userId: target.id } });
      await tx.userRole.create({
        data: { userId: target.id, roleId: namedRole.id },
      });
    }
  });

  await auditLog({
    userId: actor.userId,
    churchId,
    action: "UPDATE",
    module: "usuarios",
    entity: "User",
    entityId: target.id,
    description: `Usuário atualizado: ${name} (${email})`,
  });
  return { id: target.id };
}

export async function toggleUserActive(
  actor: UserActor,
  id: string
): Promise<boolean> {
  const churchId = actor.scope.churchId;
  if (!churchId) throw new Error("Nenhuma igreja vinculada ao seu usuário.");

  const target = await prisma.user.findUnique({
    where: { id },
    include: { roles: { include: { role: true } } },
  });
  if (!target) throw new Error("Usuário não encontrado.");
  assertUserInScope(target, actor.scope);

  if (target.id === actor.userId) {
    throw new Error("Você não pode desativar o próprio acesso.");
  }
  const targetRoles = target.roles.map((ur) => ur.role.name);
  if (targetRoles.includes("SUPER_ADMIN") && !actor.roles.includes("SUPER_ADMIN")) {
    throw new Error("Somente Super Administradores podem alterar este usuário.");
  }

  const next = !target.active;
  await prisma.user.update({
    where: { id },
    data: { active: next },
  });

  await auditLog({
    userId: actor.userId,
    churchId,
    action: "UPDATE",
    module: "usuarios",
    entity: "User",
    entityId: target.id,
    description: next
      ? `Usuário ativado: ${target.email}`
      : `Usuário desativado: ${target.email}`,
  });
  return next;
}

export async function resetUserPassword(
  actor: UserActor,
  id: string,
  password: string
): Promise<void> {
  const churchId = actor.scope.churchId;
  if (!churchId) throw new Error("Nenhuma igreja vinculada ao seu usuário.");

  const target = await prisma.user.findUnique({
    where: { id },
    include: { roles: { include: { role: true } } },
  });
  if (!target) throw new Error("Usuário não encontrado.");
  assertUserInScope(target, actor.scope);

  const targetRoles = target.roles.map((ur) => ur.role.name);
  if (targetRoles.includes("SUPER_ADMIN") && !actor.roles.includes("SUPER_ADMIN")) {
    throw new Error("Somente Super Administradores podem alterar este usuário.");
  }
  if (password.length < 6) {
    throw new Error("A senha deve ter no mínimo 6 caracteres.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { id },
    data: { passwordHash },
  });

  await auditLog({
    userId: actor.userId,
    churchId,
    action: "UPDATE",
    module: "usuarios",
    entity: "User",
    entityId: target.id,
    description: `Senha redefinida para: ${target.email}`,
  });
}