import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/services/audit.service";

export type EbdScope = {
  churchId: string;
  /** null = todas as congregações da igreja. */
  congregationIds: string[] | null;
};

export type EbdClassView = {
  id: string;
  name: string;
  description: string | null;
  ageRange: string | null;
  maxStudents: number;
  status: "ATIVO" | "INATIVO";
  congregationId: string;
  congregationName: string;
  studentCount: number;
  activeStudentCount: number;
  lessonCount: number;
  teachers: Array<{ id: string; name: string; active: boolean }>;
};

export type EbdStudentView = {
  id: string;
  memberId: string;
  name: string;
  code: string;
  cpf: string | null;
  birthDate: string | null;
  phone: string | null;
  classId: string;
  className: string;
  congregationName: string;
  active: boolean;
  enrolledAt: string;
  notes: string | null;
};

export type EbdTeacherView = {
  id: string;
  memberId: string;
  name: string;
  code: string;
  phone: string | null;
  active: boolean;
  notes: string | null;
  classes: Array<{ id: string; name: string }>;
};

export type EbdMemberOption = {
  id: string;
  name: string;
  code: string;
  congregationId: string;
  congregationName: string;
  birthDate: string | null;
  phone: string | null;
  isStudent: boolean;
  isTeacher: boolean;
};

export type EbdOverview = {
  activeClasses: number;
  totalClasses: number;
  activeStudents: number;
  totalStudents: number;
  activeTeachers: number;
  totalTeachers: number;
  openQuarters: number;
  totalLessons: number;
  totalAttendances: number;
  attendanceRate: number;
};

function congregationFilter(scope: EbdScope): Prisma.EbdClassWhereInput {
  if (scope.congregationIds === null) return {};
  return {
    congregationId: {
      in: scope.congregationIds.length > 0 ? scope.congregationIds : ["__none__"],
    },
  };
}

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T12:00:00-03:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/* -------------------------------------------------------------------------- */
/* Classes                                                                     */
/* -------------------------------------------------------------------------- */

export async function listClasses(
  scope: EbdScope,
  filters?: { status?: string; search?: string }
): Promise<EbdClassView[]> {
  const where: Prisma.EbdClassWhereInput = {
    churchId: scope.churchId,
    ...congregationFilter(scope),
  };

  const status = filters?.status?.trim();
  if (status === "ATIVO" || status === "INATIVO") where.status = status;

  const search = filters?.search?.trim();
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { ageRange: { contains: search, mode: "insensitive" } },
    ];
  }

  const rows = await prisma.ebdClass.findMany({
    where,
    include: {
      congregation: { select: { id: true, name: true } },
      students: { select: { id: true, active: true } },
      teachers: {
        select: {
          teacher: {
            select: { id: true, active: true, member: { select: { name: true } } },
          },
        },
      },
      _count: { select: { lessons: true } },
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    ageRange: row.ageRange,
    maxStudents: row.maxStudents,
    status: row.status,
    congregationId: row.congregationId,
    congregationName: row.congregation.name,
    studentCount: row.students.length,
    activeStudentCount: row.students.filter((student) => student.active).length,
    lessonCount: row._count.lessons,
    teachers: row.teachers
      .map((link) => ({
        id: link.teacher.id,
        name: link.teacher.member.name,
        active: link.teacher.active,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  }));
}

export type EbdClassInput = {
  name: string;
  congregationId: string;
  description?: string | null;
  ageRange?: string | null;
  maxStudents: number;
  status?: "ATIVO" | "INATIVO";
};

function validateClassInput(input: EbdClassInput) {
  const name = input.name?.trim();
  if (!name) throw new Error("Informe o nome da classe.");
  if (!input.congregationId) throw new Error("Selecione a congregação da classe.");
  const maxStudents = Math.round(Number(input.maxStudents));
  if (!Number.isFinite(maxStudents) || maxStudents <= 0) {
    throw new Error("Informe o número máximo de alunos da classe.");
  }
  if (maxStudents > 500) {
    throw new Error("O número máximo de alunos deve ser de até 500.");
  }
  return {
    name,
    congregationId: input.congregationId,
    description: input.description?.trim() || null,
    ageRange: input.ageRange?.trim() || null,
    maxStudents,
    status: input.status ?? "ATIVO",
  };
}

export async function createClass(
  scope: EbdScope,
  input: EbdClassInput,
  actorUserId: string
): Promise<{ id: string }> {
  const data = validateClassInput(input);

  const congregation = await prisma.congregation.findUnique({
    where: { id: data.congregationId },
    select: { id: true, churchId: true, name: true },
  });
  if (!congregation || congregation.churchId !== scope.churchId) {
    throw new Error("Congregação não encontrada.");
  }
  if (
    scope.congregationIds !== null &&
    !scope.congregationIds.includes(congregation.id)
  ) {
    throw new Error("Essa congregação não pertence ao seu escopo de acesso.");
  }

  const duplicated = await prisma.ebdClass.findFirst({
    where: { congregationId: data.congregationId, name: data.name },
    select: { id: true },
  });
  if (duplicated) {
    throw new Error("Já existe uma classe com esse nome nessa congregação.");
  }

  const created = await prisma.ebdClass.create({
    data: { churchId: scope.churchId, ...data },
  });

  await auditLog({
    userId: actorUserId,
    churchId: scope.churchId,
    action: "CREATE",
    module: "ebd",
    entity: "EbdClass",
    entityId: created.id,
    description: `Classe da EBD criada: ${created.name} (${congregation.name})`,
    newValues: { name: created.name, maxStudents: created.maxStudents },
  });

  return { id: created.id };
}

export async function updateClass(
  scope: EbdScope,
  id: string,
  input: EbdClassInput,
  actorUserId: string
): Promise<void> {
  const existing = await prisma.ebdClass.findFirst({
    where: { id, churchId: scope.churchId, ...congregationFilter(scope) },
  });
  if (!existing) throw new Error("Classe não encontrada.");

  const data = validateClassInput(input);

  const activeStudents = await prisma.ebdStudent.count({
    where: { classId: id, active: true },
  });
  if (data.maxStudents < activeStudents) {
    throw new Error(
      `A classe possui ${activeStudents} aluno(s) ativo(s). A capacidade não pode ser menor que isso.`
    );
  }

  const duplicated = await prisma.ebdClass.findFirst({
    where: {
      congregationId: data.congregationId,
      name: data.name,
      id: { not: id },
    },
    select: { id: true },
  });
  if (duplicated) {
    throw new Error("Já existe uma classe com esse nome nessa congregação.");
  }

  await prisma.ebdClass.update({ where: { id }, data });

  await auditLog({
    userId: actorUserId,
    churchId: scope.churchId,
    action: "UPDATE",
    module: "ebd",
    entity: "EbdClass",
    entityId: id,
    description: `Classe da EBD atualizada: ${data.name}`,
    oldValues: { name: existing.name, maxStudents: existing.maxStudents },
    newValues: { name: data.name, maxStudents: data.maxStudents },
  });
}

export async function deleteClass(
  scope: EbdScope,
  id: string,
  actorUserId: string
): Promise<void> {
  const existing = await prisma.ebdClass.findFirst({
    where: { id, churchId: scope.churchId, ...congregationFilter(scope) },
    include: { _count: { select: { students: true, lessons: true } } },
  });
  if (!existing) throw new Error("Classe não encontrada.");
  if (existing._count.students > 0) {
    throw new Error(
      "Não é possível excluir uma classe com alunos vinculados. Transfira ou remova os alunos antes."
    );
  }
  if (existing._count.lessons > 0) {
    throw new Error(
      "Não é possível excluir uma classe com lições cadastradas. Exclua as lições antes."
    );
  }

  await prisma.ebdClass.delete({ where: { id } });

  await auditLog({
    userId: actorUserId,
    churchId: scope.churchId,
    action: "DELETE",
    module: "ebd",
    entity: "EbdClass",
    entityId: id,
    description: `Classe da EBD excluída: ${existing.name}`,
  });
}

/* -------------------------------------------------------------------------- */
/* Alunos                                                                      */
/* -------------------------------------------------------------------------- */

export async function listStudents(
  scope: EbdScope,
  filters?: { classId?: string; status?: string; search?: string }
): Promise<EbdStudentView[]> {
  const where: Prisma.EbdStudentWhereInput = {
    churchId: scope.churchId,
    class: congregationFilter(scope),
  };

  if (filters?.classId) where.classId = filters.classId;
  if (filters?.status === "ATIVO") where.active = true;
  if (filters?.status === "INATIVO") where.active = false;

  const search = filters?.search?.trim();
  if (search) {
    where.member = {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { cpf: { contains: search } },
      ],
    };
  }

  const rows = await prisma.ebdStudent.findMany({
    where,
    include: {
      member: {
        select: {
          id: true,
          name: true,
          code: true,
          cpf: true,
          birthDate: true,
          phone: true,
        },
      },
      class: {
        select: {
          id: true,
          name: true,
          congregation: { select: { name: true } },
        },
      },
    },
    orderBy: [{ active: "desc" }, { member: { name: "asc" } }],
  });

  return rows.map((row) => ({
    id: row.id,
    memberId: row.memberId,
    name: row.member.name,
    code: row.member.code,
    cpf: row.member.cpf,
    birthDate: toIso(row.member.birthDate),
    phone: row.member.phone,
    classId: row.classId,
    className: row.class.name,
    congregationName: row.class.congregation.name,
    active: row.active,
    enrolledAt: row.enrolledAt.toISOString(),
    notes: row.notes,
  }));
}

async function assertClassAvailable(
  scope: EbdScope,
  classId: string,
  ignoreStudentId?: string
) {
  const ebdClass = await prisma.ebdClass.findFirst({
    where: { id: classId, churchId: scope.churchId, ...congregationFilter(scope) },
    select: { id: true, name: true, maxStudents: true, status: true },
  });
  if (!ebdClass) throw new Error("Classe não encontrada.");
  if (ebdClass.status !== "ATIVO") {
    throw new Error("Essa classe está inativa e não pode receber alunos.");
  }

  const enrolled = await prisma.ebdStudent.count({
    where: {
      classId,
      active: true,
      ...(ignoreStudentId ? { id: { not: ignoreStudentId } } : {}),
    },
  });
  if (enrolled >= ebdClass.maxStudents) {
    throw new Error(
      `A classe ${ebdClass.name} já atingiu o limite de ${ebdClass.maxStudents} aluno(s).`
    );
  }
  return ebdClass;
}

async function assertMemberInScope(scope: EbdScope, memberId: string) {
  const member = await prisma.member.findFirst({
    where: {
      id: memberId,
      churchId: scope.churchId,
      ...(scope.congregationIds === null
        ? {}
        : {
            congregationId: {
              in:
                scope.congregationIds.length > 0
                  ? scope.congregationIds
                  : ["__none__"],
            },
          }),
    },
    select: { id: true, name: true },
  });
  if (!member) throw new Error("Membro não encontrado.");
  return member;
}

export async function enrollStudent(
  scope: EbdScope,
  input: { memberId: string; classId: string; notes?: string | null },
  actorUserId: string
): Promise<{ id: string }> {
  const member = await assertMemberInScope(scope, input.memberId);
  const ebdClass = await assertClassAvailable(scope, input.classId);

  const existing = await prisma.ebdStudent.findUnique({
    where: { memberId: input.memberId },
    select: { id: true },
  });
  if (existing) {
    throw new Error(`${member.name} já está cadastrado(a) como aluno da EBD.`);
  }

  const created = await prisma.ebdStudent.create({
    data: {
      churchId: scope.churchId,
      memberId: input.memberId,
      classId: input.classId,
      active: true,
      notes: input.notes?.trim() || null,
    },
  });

  await auditLog({
    userId: actorUserId,
    churchId: scope.churchId,
    action: "CREATE",
    module: "ebd",
    entity: "EbdStudent",
    entityId: created.id,
    description: `Aluno matriculado na EBD: ${member.name} — ${ebdClass.name}`,
  });

  return { id: created.id };
}

export type EbdNewStudentInput = {
  name: string;
  congregationId: string;
  classId: string;
  birthDate?: string | null;
  phone?: string | null;
  notes?: string | null;
};

/**
 * Cadastra um novo membro e já o matricula como aluno da EBD.
 * Usado pelo card "Adicionar aluno" quando a pessoa ainda não está no sistema.
 */
export async function enrollNewStudent(
  scope: EbdScope,
  input: EbdNewStudentInput,
  actorUserId: string
): Promise<{ id: string; memberId: string }> {
  const name = input.name?.trim();
  if (!name) throw new Error("Informe o nome do aluno.");
  if (!input.congregationId) throw new Error("Selecione a congregação.");

  const congregation = await prisma.congregation.findUnique({
    where: { id: input.congregationId },
    select: { id: true, churchId: true, sedeId: true, name: true },
  });
  if (!congregation || congregation.churchId !== scope.churchId) {
    throw new Error("Congregação não encontrada.");
  }
  if (
    scope.congregationIds !== null &&
    !scope.congregationIds.includes(congregation.id)
  ) {
    throw new Error("Essa congregação não pertence ao seu escopo de acesso.");
  }

  const ebdClass = await assertClassAvailable(scope, input.classId);
  if (ebdClass) {
    const classCongregation = await prisma.ebdClass.findUnique({
      where: { id: input.classId },
      select: { congregationId: true },
    });
    if (classCongregation && classCongregation.congregationId !== congregation.id) {
      throw new Error("A classe selecionada pertence a outra congregação.");
    }
  }

  const created = await prisma.$transaction(async (tx) => {
    const aggregate = await tx.member.aggregate({
      where: { congregationId: congregation.id },
      _max: { code: true },
    });
    const nextCode = aggregate._max.code
      ? String(Number(aggregate._max.code) + 1).padStart(4, "0")
      : "0001";

    const member = await tx.member.create({
      data: {
        churchId: scope.churchId,
        sedeId: congregation.sedeId,
        congregationId: congregation.id,
        code: nextCode,
        name,
        birthDate: parseDate(input.birthDate),
        phone: input.phone?.trim() || null,
      },
    });

    const student = await tx.ebdStudent.create({
      data: {
        churchId: scope.churchId,
        memberId: member.id,
        classId: input.classId,
        active: true,
        notes: input.notes?.trim() || null,
      },
    });

    return { student, member };
  });

  await auditLog({
    userId: actorUserId,
    churchId: scope.churchId,
    action: "CREATE",
    module: "ebd",
    entity: "EbdStudent",
    entityId: created.student.id,
    description: `Novo aluno criado e matriculado na EBD: ${created.member.name} — ${ebdClass.name}`,
  });

  return { id: created.student.id, memberId: created.member.id };
}

export async function updateStudent(
  scope: EbdScope,
  id: string,
  input: { classId: string; active: boolean; notes?: string | null },
  actorUserId: string
): Promise<void> {
  const existing = await prisma.ebdStudent.findFirst({
    where: { id, churchId: scope.churchId, class: congregationFilter(scope) },
    include: { member: { select: { name: true } } },
  });
  if (!existing) throw new Error("Aluno não encontrado.");

  if (input.classId !== existing.classId) {
    await assertClassAvailable(scope, input.classId, id);
  } else if (input.active && !existing.active) {
    await assertClassAvailable(scope, input.classId, id);
  }

  await prisma.ebdStudent.update({
    where: { id },
    data: {
      classId: input.classId,
      active: input.active,
      notes: input.notes?.trim() || null,
    },
  });

  await auditLog({
    userId: actorUserId,
    churchId: scope.churchId,
    action: "UPDATE",
    module: "ebd",
    entity: "EbdStudent",
    entityId: id,
    description: `Aluno da EBD atualizado: ${existing.member.name}`,
    oldValues: { classId: existing.classId, active: existing.active },
    newValues: { classId: input.classId, active: input.active },
  });
}

export async function setStudentActive(
  scope: EbdScope,
  id: string,
  active: boolean,
  actorUserId: string
): Promise<void> {
  const existing = await prisma.ebdStudent.findFirst({
    where: { id, churchId: scope.churchId, class: congregationFilter(scope) },
    include: { member: { select: { name: true } } },
  });
  if (!existing) throw new Error("Aluno não encontrado.");

  if (active && !existing.active) {
    await assertClassAvailable(scope, existing.classId, id);
  }

  await prisma.ebdStudent.update({ where: { id }, data: { active } });

  await auditLog({
    userId: actorUserId,
    churchId: scope.churchId,
    action: "UPDATE",
    module: "ebd",
    entity: "EbdStudent",
    entityId: id,
    description: `Aluno ${active ? "ativado" : "inativado"} na EBD: ${existing.member.name}`,
    newValues: { active },
  });
}

export async function deleteStudent(
  scope: EbdScope,
  id: string,
  actorUserId: string
): Promise<void> {
  const existing = await prisma.ebdStudent.findFirst({
    where: { id, churchId: scope.churchId, class: congregationFilter(scope) },
    include: { member: { select: { name: true } } },
  });
  if (!existing) throw new Error("Aluno não encontrado.");

  await prisma.ebdStudent.delete({ where: { id } });

  await auditLog({
    userId: actorUserId,
    churchId: scope.churchId,
    action: "DELETE",
    module: "ebd",
    entity: "EbdStudent",
    entityId: id,
    description: `Aluno removido da EBD: ${existing.member.name}`,
  });
}

/* -------------------------------------------------------------------------- */
/* Professores                                                                 */
/* -------------------------------------------------------------------------- */

export async function listTeachers(
  scope: EbdScope,
  filters?: { status?: string; search?: string; classId?: string }
): Promise<EbdTeacherView[]> {
  const where: Prisma.EbdTeacherWhereInput = { churchId: scope.churchId };

  if (filters?.status === "ATIVO") where.active = true;
  if (filters?.status === "INATIVO") where.active = false;

  if (filters?.classId) {
    where.classes = { some: { classId: filters.classId } };
  }

  const search = filters?.search?.trim();
  if (search) {
    where.member = {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  const rows = await prisma.ebdTeacher.findMany({
    where,
    include: {
      member: { select: { id: true, name: true, code: true, phone: true } },
      classes: {
        select: {
          class: {
            select: {
              id: true,
              name: true,
              congregationId: true,
              congregation: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: [{ active: "desc" }, { member: { name: "asc" } }],
  });

  const allowed =
    scope.congregationIds === null ? null : new Set(scope.congregationIds);

  return rows.map((row) => ({
    id: row.id,
    memberId: row.memberId,
    name: row.member.name,
    code: row.member.code,
    phone: row.member.phone,
    active: row.active,
    notes: row.notes,
    classes: row.classes
      .filter((link) => !allowed || allowed.has(link.class.congregationId))
      .map((link) => ({ id: link.class.id, name: link.class.name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  }));
}

async function assertClassesInScope(scope: EbdScope, classIds: string[]) {
  const unique = Array.from(new Set(classIds.filter(Boolean)));
  if (unique.length === 0) {
    throw new Error("Selecione pelo menos uma classe para o professor.");
  }
  const classes = await prisma.ebdClass.findMany({
    where: { id: { in: unique }, churchId: scope.churchId, ...congregationFilter(scope) },
    select: { id: true, name: true },
  });
  if (classes.length !== unique.length) {
    throw new Error("Uma das classes selecionadas não está disponível.");
  }
  return classes;
}

export async function createTeacher(
  scope: EbdScope,
  input: { memberId: string; classIds: string[]; notes?: string | null },
  actorUserId: string
): Promise<{ id: string }> {
  const member = await assertMemberInScope(scope, input.memberId);
  const classes = await assertClassesInScope(scope, input.classIds);

  const existing = await prisma.ebdTeacher.findUnique({
    where: { memberId: input.memberId },
    select: { id: true },
  });
  if (existing) {
    throw new Error(`${member.name} já está cadastrado(a) como professor(a) da EBD.`);
  }

  const created = await prisma.ebdTeacher.create({
    data: {
      churchId: scope.churchId,
      memberId: input.memberId,
      active: true,
      notes: input.notes?.trim() || null,
      classes: { create: classes.map((item) => ({ classId: item.id })) },
    },
  });

  await auditLog({
    userId: actorUserId,
    churchId: scope.churchId,
    action: "CREATE",
    module: "ebd",
    entity: "EbdTeacher",
    entityId: created.id,
    description: `Professor(a) da EBD cadastrado(a): ${member.name} — ${classes
      .map((item) => item.name)
      .join(", ")}`,
  });

  return { id: created.id };
}

export async function updateTeacher(
  scope: EbdScope,
  id: string,
  input: { classIds: string[]; active: boolean; notes?: string | null },
  actorUserId: string
): Promise<void> {
  const existing = await prisma.ebdTeacher.findFirst({
    where: { id, churchId: scope.churchId },
    include: { member: { select: { name: true } } },
  });
  if (!existing) throw new Error("Professor não encontrado.");

  const classes = await assertClassesInScope(scope, input.classIds);

  await prisma.$transaction(async (tx) => {
    await tx.ebdTeacherClass.deleteMany({ where: { teacherId: id } });
    await tx.ebdTeacher.update({
      where: { id },
      data: {
        active: input.active,
        notes: input.notes?.trim() || null,
        classes: { create: classes.map((item) => ({ classId: item.id })) },
      },
    });
  });

  await auditLog({
    userId: actorUserId,
    churchId: scope.churchId,
    action: "UPDATE",
    module: "ebd",
    entity: "EbdTeacher",
    entityId: id,
    description: `Professor(a) da EBD atualizado(a): ${existing.member.name}`,
    newValues: {
      classes: classes.map((item) => item.name),
      active: input.active,
    },
  });
}

export async function setTeacherActive(
  scope: EbdScope,
  id: string,
  active: boolean,
  actorUserId: string
): Promise<void> {
  const existing = await prisma.ebdTeacher.findFirst({
    where: { id, churchId: scope.churchId },
    include: { member: { select: { name: true } } },
  });
  if (!existing) throw new Error("Professor não encontrado.");

  await prisma.ebdTeacher.update({ where: { id }, data: { active } });

  await auditLog({
    userId: actorUserId,
    churchId: scope.churchId,
    action: "UPDATE",
    module: "ebd",
    entity: "EbdTeacher",
    entityId: id,
    description: `Professor(a) ${active ? "ativado" : "inativado"} na EBD: ${existing.member.name}`,
    newValues: { active },
  });
}

export async function deleteTeacher(
  scope: EbdScope,
  id: string,
  actorUserId: string
): Promise<void> {
  const existing = await prisma.ebdTeacher.findFirst({
    where: { id, churchId: scope.churchId },
    include: { member: { select: { name: true } } },
  });
  if (!existing) throw new Error("Professor não encontrado.");

  await prisma.ebdTeacher.delete({ where: { id } });

  await auditLog({
    userId: actorUserId,
    churchId: scope.churchId,
    action: "DELETE",
    module: "ebd",
    entity: "EbdTeacher",
    entityId: id,
    description: `Professor(a) removido(a) da EBD: ${existing.member.name}`,
  });
}

/* -------------------------------------------------------------------------- */
/* Opções de membros                                                           */
/* -------------------------------------------------------------------------- */

export async function listMemberOptions(
  scope: EbdScope,
  search?: string
): Promise<EbdMemberOption[]> {
  const where: Prisma.MemberWhereInput = {
    churchId: scope.churchId,
    situation: "ATIVO",
    ...(scope.congregationIds === null
      ? {}
      : {
          congregationId: {
            in:
              scope.congregationIds.length > 0
                ? scope.congregationIds
                : ["__none__"],
          },
        }),
  };

  const term = search?.trim();
  if (term) {
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { code: { contains: term, mode: "insensitive" } },
      { cpf: { contains: term } },
    ];
  }

  const rows = await prisma.member.findMany({
    where,
    select: {
      id: true,
      name: true,
      code: true,
      birthDate: true,
      phone: true,
      congregationId: true,
      congregation: { select: { name: true } },
      ebdStudent: { select: { id: true } },
      ebdTeacher: { select: { id: true } },
    },
    orderBy: { name: "asc" },
    take: 400,
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    code: row.code,
    congregationId: row.congregationId,
    congregationName: row.congregation.name,
    birthDate: toIso(row.birthDate),
    phone: row.phone,
    isStudent: Boolean(row.ebdStudent),
    isTeacher: Boolean(row.ebdTeacher),
  }));
}

/* -------------------------------------------------------------------------- */
/* Visão geral                                                                 */
/* -------------------------------------------------------------------------- */

export async function getEbdOverview(scope: EbdScope): Promise<EbdOverview> {
  const [classes, students, teachers, quarters, lessons, attendances, entries] =
    await Promise.all([
      prisma.ebdClass.findMany({
        where: { churchId: scope.churchId, ...congregationFilter(scope) },
        select: { status: true },
      }),
      prisma.ebdStudent.findMany({
        where: { churchId: scope.churchId, class: congregationFilter(scope) },
        select: { active: true },
      }),
      prisma.ebdTeacher.findMany({
        where: { churchId: scope.churchId },
        select: { active: true },
      }),
      prisma.ebdQuarter.findMany({
        where: { churchId: scope.churchId },
        select: { status: true },
      }),
      prisma.ebdLesson.count({
        where: { class: congregationFilter(scope), quarter: { churchId: scope.churchId } },
      }),
      prisma.ebdAttendance.count({
        where: { churchId: scope.churchId, class: congregationFilter(scope) },
      }),
      prisma.ebdAttendanceEntry.findMany({
        where: {
          attendance: { churchId: scope.churchId, class: congregationFilter(scope) },
        },
        select: { present: true },
      }),
    ]);

  const totalEntries = entries.length;
  const presentEntries = entries.filter((entry) => entry.present).length;

  return {
    activeClasses: classes.filter((row) => row.status === "ATIVO").length,
    totalClasses: classes.length,
    activeStudents: students.filter((row) => row.active).length,
    totalStudents: students.length,
    activeTeachers: teachers.filter((row) => row.active).length,
    totalTeachers: teachers.length,
    openQuarters: quarters.filter((row) => row.status === "ABERTO").length,
    totalLessons: lessons,
    totalAttendances: attendances,
    attendanceRate:
      totalEntries > 0 ? Math.round((presentEntries / totalEntries) * 100) : 0,
  };
}
