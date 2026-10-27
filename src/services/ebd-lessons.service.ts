import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/services/audit.service";
import {
  EBD_SCORE_RULES,
  clamp,
  entryTotal,
  scorePercent,
} from "@/modules/ebd/scoring";
import type { EbdScope } from "@/services/ebd.service";

export type EbdQuarterView = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: "ABERTO" | "FECHADO";
  notes: string | null;
  lessonCount: number;
  attendanceCount: number;
};

export type EbdLessonView = {
  id: string;
  quarterId: string;
  quarterName: string;
  quarterStart: string;
  quarterEnd: string;
  classId: string;
  className: string;
  number: number;
  title: string;
  notes: string | null;
  date: string | null;
  attendanceCount: number;
};

export type EbdAttendanceView = {
  id: string;
  date: string;
  lessonId: string;
  lessonNumber: number;
  lessonTitle: string;
  classId: string;
  className: string;
  quarterId: string;
  quarterName: string;
  notes: string | null;
  presentCount: number;
  studentCount: number;
  totalScore: number;
  averageScore: number;
};

export type EbdAttendanceEntryView = {
  studentId: string;
  studentName: string;
  studentCode: string;
  present: boolean;
  lessonScore: number;
  participationScore: number;
  bibleScore: number;
  offeringScore: number;
  total: number;
};

export type EbdAttendanceDetail = EbdAttendanceView & {
  entries: EbdAttendanceEntryView[];
};

export type EbdAttendanceEntryInput = {
  studentId: string;
  present: boolean;
  lessonScore?: number;
  participationScore?: number;
  bibleScore?: number;
  offeringScore?: number;
};

function congregationFilter(scope: EbdScope): Prisma.EbdClassWhereInput {
  const filter: Prisma.EbdClassWhereInput = {};

  if (scope.congregationIds !== null) {
    filter.congregationId = {
      in: scope.congregationIds.length > 0 ? scope.congregationIds : ["__none__"],
    };
  }

  if (scope.classIds !== null && scope.classIds !== undefined) {
    filter.id = {
      in: scope.classIds.length > 0 ? scope.classIds : ["__none__"],
    };
  }

  return filter;
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
/* Trimestres                                                                  */
/* -------------------------------------------------------------------------- */

export async function listQuarters(scope: EbdScope): Promise<EbdQuarterView[]> {
  const restricted =
    scope.classIds !== null && scope.classIds !== undefined;

  const rows = await prisma.ebdQuarter.findMany({
    where: {
      churchId: scope.churchId,
      ...(restricted
        ? {
            OR: [
              { lessons: { some: { class: congregationFilter(scope) } } },
              { attendances: { some: { class: congregationFilter(scope) } } },
            ],
          }
        : {}),
    },
    include: {
      _count: {
        select: {
          lessons: { where: { class: congregationFilter(scope) } },
          attendances: { where: { class: congregationFilter(scope) } },
        },
      },
    },
    orderBy: [{ startDate: "desc" }],
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    startDate: toIso(row.startDate) ?? "",
    endDate: toIso(row.endDate) ?? "",
    status: row.status,
    notes: row.notes,
    lessonCount: row._count.lessons,
    attendanceCount: row._count.attendances,
  }));
}

export async function createQuarter(
  scope: EbdScope,
  input: { name: string; startDate: string; endDate: string; notes?: string | null },
  actorUserId: string
): Promise<{ id: string }> {
  const name = input.name?.trim();
  if (!name) throw new Error("Informe o nome do trimestre.");
  const startDate = parseDate(input.startDate);
  const endDate = parseDate(input.endDate);
  if (!startDate) throw new Error("Informe a data de início do trimestre.");
  if (!endDate) throw new Error("Informe a data de término do trimestre.");
  if (endDate < startDate) {
    throw new Error("A data de término deve ser depois do início.");
  }

  const created = await prisma.ebdQuarter.create({
    data: {
      churchId: scope.churchId,
      name,
      startDate,
      endDate,
      notes: input.notes?.trim() || null,
      status: "ABERTO",
    },
  });

  await auditLog({
    userId: actorUserId,
    churchId: scope.churchId,
    action: "CREATE",
    module: "ebd",
    entity: "EbdQuarter",
    entityId: created.id,
    description: `Trimestre da EBD criado: ${name}`,
    newValues: { startDate: input.startDate, endDate: input.endDate },
  });

  return { id: created.id };
}

export async function updateQuarter(
  scope: EbdScope,
  id: string,
  input: {
    name: string;
    startDate: string;
    endDate: string;
    status?: "ABERTO" | "FECHADO";
    notes?: string | null;
  },
  actorUserId: string
): Promise<void> {
  const existing = await prisma.ebdQuarter.findFirst({
    where: { id, churchId: scope.churchId },
  });
  if (!existing) throw new Error("Trimestre não encontrado.");

  const name = input.name?.trim();
  if (!name) throw new Error("Informe o nome do trimestre.");
  const startDate = parseDate(input.startDate);
  const endDate = parseDate(input.endDate);
  if (!startDate) throw new Error("Informe a data de início do trimestre.");
  if (!endDate) throw new Error("Informe a data de término do trimestre.");
  if (endDate < startDate) {
    throw new Error("A data de término deve ser depois do início.");
  }

  await prisma.ebdQuarter.update({
    where: { id },
    data: {
      name,
      startDate,
      endDate,
      status: input.status ?? existing.status,
      notes: input.notes?.trim() || null,
    },
  });

  await auditLog({
    userId: actorUserId,
    churchId: scope.churchId,
    action: "UPDATE",
    module: "ebd",
    entity: "EbdQuarter",
    entityId: id,
    description: `Trimestre da EBD atualizado: ${name}`,
  });
}

export async function deleteQuarter(
  scope: EbdScope,
  id: string,
  actorUserId: string
): Promise<void> {
  const existing = await prisma.ebdQuarter.findFirst({
    where: { id, churchId: scope.churchId },
    include: { _count: { select: { lessons: true, attendances: true } } },
  });
  if (!existing) throw new Error("Trimestre não encontrado.");

  await prisma.ebdQuarter.delete({ where: { id } });

  await auditLog({
    userId: actorUserId,
    churchId: scope.churchId,
    action: "DELETE",
    module: "ebd",
    entity: "EbdQuarter",
    entityId: id,
    description: `Trimestre da EBD excluído: ${existing.name} (${existing._count.lessons} lição(ões), ${existing._count.attendances} chamada(s))`,
  });
}

/* -------------------------------------------------------------------------- */
/* Lições                                                                      */
/* -------------------------------------------------------------------------- */

export async function listLessons(
  scope: EbdScope,
  filters?: { quarterId?: string; classId?: string; search?: string }
): Promise<EbdLessonView[]> {
  const where: Prisma.EbdLessonWhereInput = {
    quarter: { churchId: scope.churchId },
    class: congregationFilter(scope),
  };

  if (filters?.quarterId) where.quarterId = filters.quarterId;
  if (filters?.classId) where.classId = filters.classId;

  const search = filters?.search?.trim();
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { notes: { contains: search, mode: "insensitive" } },
    ];
  }

  const rows = await prisma.ebdLesson.findMany({
    where,
    include: {
      quarter: {
        select: { id: true, name: true, startDate: true, endDate: true },
      },
      class: { select: { id: true, name: true } },
      _count: { select: { attendances: true } },
    },
    orderBy: [{ quarter: { startDate: "desc" } }, { number: "asc" }],
  });

  return rows.map((row) => ({
    id: row.id,
    quarterId: row.quarterId,
    quarterName: row.quarter.name,
    quarterStart: toIso(row.quarter.startDate) ?? "",
    quarterEnd: toIso(row.quarter.endDate) ?? "",
    classId: row.classId,
    className: row.class.name,
    number: row.number,
    title: row.title,
    notes: row.notes,
    date: toIso(row.date),
    attendanceCount: row._count.attendances,
  }));
}

async function assertClassInScope(scope: EbdScope, classId: string) {
  const ebdClass = await prisma.ebdClass.findFirst({
    where: { id: classId, churchId: scope.churchId, ...congregationFilter(scope) },
    select: { id: true, name: true },
  });
  if (!ebdClass) throw new Error("Classe não encontrada.");
  return ebdClass;
}

async function assertQuarterInScope(scope: EbdScope, quarterId: string) {
  const quarter = await prisma.ebdQuarter.findFirst({
    where: { id: quarterId, churchId: scope.churchId },
    select: { id: true, name: true },
  });
  if (!quarter) throw new Error("Trimestre não encontrado.");
  return quarter;
}

export async function createLesson(
  scope: EbdScope,
  input: {
    quarterId: string;
    classId: string;
    number: number;
    title: string;
    notes?: string | null;
    date?: string | null;
  },
  actorUserId: string
): Promise<{ id: string }> {
  const quarter = await assertQuarterInScope(scope, input.quarterId);
  const ebdClass = await assertClassInScope(scope, input.classId);

  const number = Math.round(Number(input.number));
  if (!Number.isFinite(number) || number <= 0) {
    throw new Error("Informe o número da lição.");
  }
  const title = input.title?.trim();
  if (!title) throw new Error("Informe o título da lição.");

  const duplicated = await prisma.ebdLesson.findFirst({
    where: { quarterId: input.quarterId, classId: input.classId, number },
    select: { id: true },
  });
  if (duplicated) {
    throw new Error(
      `A lição ${number} já está cadastrada para a classe ${ebdClass.name} neste trimestre.`
    );
  }

  const created = await prisma.ebdLesson.create({
    data: {
      quarterId: input.quarterId,
      classId: input.classId,
      number,
      title,
      notes: input.notes?.trim() || null,
      date: parseDate(input.date),
    },
  });

  await auditLog({
    userId: actorUserId,
    churchId: scope.churchId,
    action: "CREATE",
    module: "ebd",
    entity: "EbdLesson",
    entityId: created.id,
    description: `Lição ${number} cadastrada: ${title} — ${ebdClass.name} (${quarter.name})`,
  });

  return { id: created.id };
}

export async function updateLesson(
  scope: EbdScope,
  id: string,
  input: {
    quarterId: string;
    classId: string;
    number: number;
    title: string;
    notes?: string | null;
    date?: string | null;
  },
  actorUserId: string
): Promise<void> {
  const existing = await prisma.ebdLesson.findFirst({
    where: { id, quarter: { churchId: scope.churchId }, class: congregationFilter(scope) },
  });
  if (!existing) throw new Error("Lição não encontrada.");

  await assertQuarterInScope(scope, input.quarterId);
  const ebdClass = await assertClassInScope(scope, input.classId);

  const number = Math.round(Number(input.number));
  if (!Number.isFinite(number) || number <= 0) {
    throw new Error("Informe o número da lição.");
  }
  const title = input.title?.trim();
  if (!title) throw new Error("Informe o título da lição.");

  const duplicated = await prisma.ebdLesson.findFirst({
    where: {
      quarterId: input.quarterId,
      classId: input.classId,
      number,
      id: { not: id },
    },
    select: { id: true },
  });
  if (duplicated) {
    throw new Error(
      `A lição ${number} já está cadastrada para a classe ${ebdClass.name} neste trimestre.`
    );
  }

  await prisma.ebdLesson.update({
    where: { id },
    data: {
      quarterId: input.quarterId,
      classId: input.classId,
      number,
      title,
      notes: input.notes?.trim() || null,
      date: parseDate(input.date),
    },
  });

  await auditLog({
    userId: actorUserId,
    churchId: scope.churchId,
    action: "UPDATE",
    module: "ebd",
    entity: "EbdLesson",
    entityId: id,
    description: `Lição atualizada: ${number} — ${title}`,
  });
}

export async function deleteLesson(
  scope: EbdScope,
  id: string,
  actorUserId: string
): Promise<void> {
  const existing = await prisma.ebdLesson.findFirst({
    where: { id, quarter: { churchId: scope.churchId }, class: congregationFilter(scope) },
    include: { _count: { select: { attendances: true } } },
  });
  if (!existing) throw new Error("Lição não encontrada.");

  await prisma.ebdLesson.delete({ where: { id } });

  await auditLog({
    userId: actorUserId,
    churchId: scope.churchId,
    action: "DELETE",
    module: "ebd",
    entity: "EbdLesson",
    entityId: id,
    description: `Lição excluída: ${existing.number} — ${existing.title} (${existing._count.attendances} chamada(s))`,
  });
}

/* -------------------------------------------------------------------------- */
/* Chamadas                                                                    */
/* -------------------------------------------------------------------------- */

function serializeAttendance(row: {
  id: string;
  date: Date;
  lessonId: string;
  classId: string;
  quarterId: string;
  notes: string | null;
  lesson: { number: number; title: string };
  class: { name: string };
  quarter: { name: string };
  entries: Array<{
    studentId: string;
    present: boolean;
    lessonScore: number;
    participationScore: number;
    bibleScore: number;
    offeringScore: number;
  }>;
}): EbdAttendanceView {
  const totals = row.entries.map((entry) => entryTotal(entry));
  const totalScore = totals.reduce((sum, value) => sum + value, 0);
  const presentCount = row.entries.filter((entry) => entry.present).length;

  return {
    id: row.id,
    date: toIso(row.date) ?? "",
    lessonId: row.lessonId,
    lessonNumber: row.lesson.number,
    lessonTitle: row.lesson.title,
    classId: row.classId,
    className: row.class.name,
    quarterId: row.quarterId,
    quarterName: row.quarter.name,
    notes: row.notes,
    presentCount,
    studentCount: row.entries.length,
    totalScore,
    averageScore:
      row.entries.length > 0 ? Math.round((totalScore / row.entries.length) * 10) / 10 : 0,
  };
}

const attendanceInclude = {
  lesson: { select: { number: true, title: true } },
  class: { select: { name: true } },
  quarter: { select: { name: true } },
  entries: {
    select: {
      studentId: true,
      present: true,
      lessonScore: true,
      participationScore: true,
      bibleScore: true,
      offeringScore: true,
    },
  },
} satisfies Prisma.EbdAttendanceInclude;

export async function listAttendances(
  scope: EbdScope,
  filters?: {
    quarterId?: string;
    classId?: string;
    lessonId?: string;
    from?: string;
    to?: string;
  }
): Promise<EbdAttendanceView[]> {
  const where: Prisma.EbdAttendanceWhereInput = {
    churchId: scope.churchId,
    class: congregationFilter(scope),
  };

  if (filters?.quarterId) where.quarterId = filters.quarterId;
  if (filters?.classId) where.classId = filters.classId;
  if (filters?.lessonId) where.lessonId = filters.lessonId;

  const from = parseDate(filters?.from);
  const to = parseDate(filters?.to);
  if (from || to) {
    where.date = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: new Date(to.getTime() + 12 * 60 * 60 * 1000) } : {}),
    };
  }

  const rows = await prisma.ebdAttendance.findMany({
    where,
    include: attendanceInclude,
    orderBy: [{ date: "desc" }],
  });

  return rows.map(serializeAttendance);
}

export async function getAttendance(
  scope: EbdScope,
  id: string
): Promise<EbdAttendanceDetail | null> {
  const row = await prisma.ebdAttendance.findFirst({
    where: { id, churchId: scope.churchId, class: congregationFilter(scope) },
    include: {
      ...attendanceInclude,
      entries: {
        include: {
          student: { include: { member: { select: { name: true, code: true } } } },
        },
      },
    },
  });
  if (!row) return null;

  const base = serializeAttendance(row);

  return {
    ...base,
    entries: row.entries
      .map((entry) => ({
        studentId: entry.studentId,
        studentName: entry.student.member.name,
        studentCode: entry.student.member.code,
        present: entry.present,
        lessonScore: entry.lessonScore,
        participationScore: entry.participationScore,
        bibleScore: entry.bibleScore,
        offeringScore: entry.offeringScore,
        total: entryTotal(entry),
      }))
      .sort((a, b) => a.studentName.localeCompare(b.studentName)),
  };
}

/** Alunos ativos da classe de uma lição, com os pontos padrão para a chamada. */
export async function getAttendanceRoster(
  scope: EbdScope,
  lessonId: string
): Promise<{
  lesson: EbdLessonView;
  students: Array<{
    studentId: string;
    name: string;
    code: string;
    present: boolean;
    lessonScore: number;
    participationScore: number;
    bibleScore: number;
    offeringScore: number;
    total: number;
  }>;
}> {
  const lesson = await prisma.ebdLesson.findFirst({
    where: {
      id: lessonId,
      quarter: { churchId: scope.churchId },
      class: congregationFilter(scope),
    },
    include: {
      quarter: { select: { id: true, name: true, startDate: true, endDate: true } },
      class: { select: { id: true, name: true } },
      _count: { select: { attendances: true } },
    },
  });
  if (!lesson) throw new Error("Lição não encontrada.");

  const students = await prisma.ebdStudent.findMany({
    where: { classId: lesson.classId, active: true },
    include: { member: { select: { name: true, code: true } } },
    orderBy: { member: { name: "asc" } },
  });

  return {
    lesson: {
      id: lesson.id,
      quarterId: lesson.quarterId,
      quarterName: lesson.quarter.name,
      quarterStart: toIso(lesson.quarter.startDate) ?? "",
      quarterEnd: toIso(lesson.quarter.endDate) ?? "",
      classId: lesson.classId,
      className: lesson.class.name,
      number: lesson.number,
      title: lesson.title,
      notes: lesson.notes,
      date: toIso(lesson.date),
      attendanceCount: lesson._count.attendances,
    },
    students: students.map((student) => ({
      studentId: student.id,
      name: student.member.name,
      code: student.member.code,
      present: false,
      lessonScore: 0,
      participationScore: 0,
      bibleScore: 0,
      offeringScore: 0,
      total: 0,
    })),
  };
}

function sanitizeEntries(
  entries: EbdAttendanceEntryInput[]
): EbdAttendanceEntryInput[] {
  const seen = new Set<string>();
  return entries
    .filter((entry) => {
      if (!entry.studentId || seen.has(entry.studentId)) return false;
      seen.add(entry.studentId);
      return true;
    })
    .map((entry) => ({
      studentId: entry.studentId,
      present: Boolean(entry.present),
      lessonScore: entry.present ? clamp(entry.lessonScore, EBD_SCORE_RULES.lesson) : 0,
      participationScore: entry.present
        ? clamp(entry.participationScore, EBD_SCORE_RULES.participation)
        : 0,
      bibleScore: entry.present ? clamp(entry.bibleScore, EBD_SCORE_RULES.bible) : 0,
      offeringScore: entry.present
        ? clamp(entry.offeringScore, EBD_SCORE_RULES.offering)
        : 0,
    }));
}

async function assertStudentsInClass(
  classId: string,
  entries: EbdAttendanceEntryInput[]
): Promise<void> {
  const ids = entries.map((entry) => entry.studentId);
  const rows = await prisma.ebdStudent.findMany({
    where: { id: { in: ids }, classId },
    select: { id: true },
  });
  if (rows.length !== ids.length) {
    throw new Error("Um dos alunos não pertence à classe desta lição.");
  }
}

export async function createAttendance(
  scope: EbdScope,
  input: {
    lessonId: string;
    date: string;
    notes?: string | null;
    entries: EbdAttendanceEntryInput[];
  },
  actorUserId: string
): Promise<{ id: string }> {
  const lesson = await prisma.ebdLesson.findFirst({
    where: {
      id: input.lessonId,
      quarter: { churchId: scope.churchId },
      class: congregationFilter(scope),
    },
    include: { class: { select: { id: true, name: true } } },
  });
  if (!lesson) throw new Error("Lição não encontrada.");

  const date = parseDate(input.date);
  if (!date) throw new Error("Informe a data da chamada.");

  const entries = sanitizeEntries(input.entries);
  if (entries.length === 0) {
    throw new Error("A chamada precisa ter pelo menos um aluno.");
  }
  await assertStudentsInClass(lesson.classId, entries);

  const created = await prisma.ebdAttendance.create({
    data: {
      churchId: scope.churchId,
      lessonId: lesson.id,
      quarterId: lesson.quarterId,
      classId: lesson.classId,
      date,
      notes: input.notes?.trim() || null,
      createdById: actorUserId,
      entries: {
        create: entries.map((entry) => ({
          studentId: entry.studentId,
          present: entry.present,
          lessonScore: entry.lessonScore,
          participationScore: entry.participationScore,
          bibleScore: entry.bibleScore,
          offeringScore: entry.offeringScore,
        })),
      },
    },
  });

  await auditLog({
    userId: actorUserId,
    churchId: scope.churchId,
    action: "CREATE",
    module: "ebd",
    entity: "EbdAttendance",
    entityId: created.id,
    description: `Chamada registrada: lição ${lesson.number} — ${lesson.class.name} (${input.date})`,
    newValues: {
      present: entries.filter((entry) => entry.present).length,
      students: entries.length,
    },
  });

  return { id: created.id };
}

export async function updateAttendance(
  scope: EbdScope,
  id: string,
  input: {
    date: string;
    notes?: string | null;
    entries: EbdAttendanceEntryInput[];
  },
  actorUserId: string
): Promise<void> {
  const existing = await prisma.ebdAttendance.findFirst({
    where: { id, churchId: scope.churchId, class: congregationFilter(scope) },
    include: { lesson: { select: { number: true } }, class: { select: { name: true } } },
  });
  if (!existing) throw new Error("Chamada não encontrada.");

  const date = parseDate(input.date);
  if (!date) throw new Error("Informe a data da chamada.");

  const entries = sanitizeEntries(input.entries);
  if (entries.length === 0) {
    throw new Error("A chamada precisa ter pelo menos um aluno.");
  }
  await assertStudentsInClass(existing.classId, entries);

  await prisma.$transaction(async (tx) => {
    await tx.ebdAttendanceEntry.deleteMany({ where: { attendanceId: id } });
    await tx.ebdAttendance.update({
      where: { id },
      data: {
        date,
        notes: input.notes?.trim() || null,
        entries: {
          create: entries.map((entry) => ({
            studentId: entry.studentId,
            present: entry.present,
            lessonScore: entry.lessonScore,
            participationScore: entry.participationScore,
            bibleScore: entry.bibleScore,
            offeringScore: entry.offeringScore,
          })),
        },
      },
    });
  });

  await auditLog({
    userId: actorUserId,
    churchId: scope.churchId,
    action: "UPDATE",
    module: "ebd",
    entity: "EbdAttendance",
    entityId: id,
    description: `Chamada editada: lição ${existing.lesson.number} — ${existing.class.name}`,
    newValues: {
      present: entries.filter((entry) => entry.present).length,
      students: entries.length,
    },
  });
}

export async function deleteAttendance(
  scope: EbdScope,
  id: string,
  actorUserId: string
): Promise<void> {
  const existing = await prisma.ebdAttendance.findFirst({
    where: { id, churchId: scope.churchId, class: congregationFilter(scope) },
    include: { lesson: { select: { number: true } }, class: { select: { name: true } } },
  });
  if (!existing) throw new Error("Chamada não encontrada.");

  await prisma.ebdAttendance.delete({ where: { id } });

  await auditLog({
    userId: actorUserId,
    churchId: scope.churchId,
    action: "DELETE",
    module: "ebd",
    entity: "EbdAttendance",
    entityId: id,
    description: `Chamada excluída: lição ${existing.lesson.number} — ${existing.class.name}`,
  });
}

/* -------------------------------------------------------------------------- */
/* Relatórios                                                                  */
/* -------------------------------------------------------------------------- */

export type EbdPerformanceRow = {
  studentId: string;
  name: string;
  code: string;
  className: string;
  lessons: number;
  presences: number;
  totalScore: number;
  maxScore: number;
  averageScore: number;
  percent: number;
};

export type EbdPerformanceReport = {
  quarterId: string | null;
  quarterName: string;
  classId: string | null;
  className: string;
  lessons: number;
  rows: EbdPerformanceRow[];
};

export async function getPerformanceReport(
  scope: EbdScope,
  filters: { quarterId?: string; classId?: string }
): Promise<EbdPerformanceReport> {
  const attendanceWhere: Prisma.EbdAttendanceWhereInput = {
    churchId: scope.churchId,
    class: congregationFilter(scope),
  };
  if (filters.quarterId) attendanceWhere.quarterId = filters.quarterId;
  if (filters.classId) attendanceWhere.classId = filters.classId;

  const attendances = await prisma.ebdAttendance.findMany({
    where: attendanceWhere,
    select: {
      id: true,
      classId: true,
      quarter: { select: { id: true, name: true } },
      class: { select: { name: true } },
      entries: {
        select: {
          studentId: true,
          present: true,
          lessonScore: true,
          participationScore: true,
          bibleScore: true,
          offeringScore: true,
          student: { include: { member: { select: { name: true, code: true } } } },
        },
      },
    },
  });

  const lessonCount = attendances.length;
  const byStudent = new Map<string, EbdPerformanceRow>();

  for (const attendance of attendances) {
    for (const entry of attendance.entries) {
      const key = entry.studentId;
      const current =
        byStudent.get(key) ??
        ({
          studentId: entry.studentId,
          name: entry.student.member.name,
          code: entry.student.member.code,
          className: attendance.class.name,
          lessons: 0,
          presences: 0,
          totalScore: 0,
          maxScore: 0,
          averageScore: 0,
          percent: 0,
        } satisfies EbdPerformanceRow);

      current.lessons += 1;
      if (entry.present) current.presences += 1;
      current.totalScore += entryTotal(entry);
      byStudent.set(key, current);
    }
  }

  const rows = Array.from(byStudent.values())
    .map((row) => {
      const maxScore = row.lessons * 10;
      return {
        ...row,
        maxScore,
        averageScore:
          row.lessons > 0 ? Math.round((row.totalScore / row.lessons) * 10) / 10 : 0,
        percent: scorePercent(row.totalScore, row.lessons),
      };
    })
    .sort((a, b) => b.totalScore - a.totalScore || a.name.localeCompare(b.name));

  const quarter = attendances[0]?.quarter ?? null;
  const className = attendances[0]?.class.name ?? "Todas as classes";

  return {
    quarterId: filters.quarterId ?? null,
    quarterName: quarter?.name ?? "Todos os trimestres",
    classId: filters.classId ?? null,
    className: filters.classId ? className : "Todas as classes",
    lessons: lessonCount,
    rows,
  };
}

export type EbdRankingRow = {
  position: number;
  studentId: string;
  name: string;
  code: string;
  className: string;
  presences: number;
  totalScore: number;
  averageScore: number;
};

export async function getRanking(
  scope: EbdScope,
  filters: { quarterId?: string; classId?: string; limit?: number }
): Promise<{
  quarterName: string;
  className: string;
  rows: EbdRankingRow[];
}> {
  const report = await getPerformanceReport(scope, filters);
  const rows = report.rows
    .slice()
    .sort((a, b) => b.totalScore - a.totalScore || a.name.localeCompare(b.name))
    .map((row, index) => ({
      position: index + 1,
      studentId: row.studentId,
      name: row.name,
      code: row.code,
      className: row.className,
      presences: row.presences,
      totalScore: row.totalScore,
      averageScore: row.averageScore,
    }));

  return {
    quarterName: report.quarterName,
    className: report.className,
    rows: filters.limit ? rows.slice(0, filters.limit) : rows,
  };
}

export type EbdBirthdayRow = {
  studentId: string;
  name: string;
  code: string;
  className: string;
  birthDate: string;
  day: number;
  age: number;
  phone: string | null;
};

export async function getBirthdays(
  scope: EbdScope,
  filters: { month?: number; classId?: string }
): Promise<{ month: number; rows: EbdBirthdayRow[] }> {
  const month = Math.min(Math.max(filters.month ?? new Date().getMonth() + 1, 1), 12);

  const students = await prisma.ebdStudent.findMany({
    where: {
      churchId: scope.churchId,
      active: true,
      class: congregationFilter(scope),
      ...(filters.classId ? { classId: filters.classId } : {}),
    },
    include: {
      member: { select: { name: true, code: true, birthDate: true, phone: true } },
      class: { select: { name: true } },
    },
  });

  const today = new Date();
  const rows = students
    .filter((student) => {
      const birth = student.member.birthDate;
      return birth && birth.getUTCMonth() + 1 === month;
    })
    .map((student) => {
      const birth = student.member.birthDate!;
      const day = birth.getUTCDate();
      let age = today.getUTCFullYear() - birth.getUTCFullYear();
      const beforeBirthday =
        today.getUTCMonth() + 1 < month ||
        (today.getUTCMonth() + 1 === month && today.getUTCDate() < day);
      if (beforeBirthday) age -= 1;

      return {
        studentId: student.id,
        name: student.member.name,
        code: student.member.code,
        className: student.class.name,
        birthDate: birth.toISOString().slice(0, 10),
        day,
        age: Math.max(age, 0),
        phone: student.member.phone,
      };
    })
    .sort((a, b) => a.day - b.day || a.name.localeCompare(b.name));

  return { month, rows };
}

export type EbdAttendanceReportRow = {
  studentId: string;
  name: string;
  code: string;
  className: string;
  phone: string | null;
  lessons: number;
  presences: number;
  absences: number;
  percent: number;
  lastAbsence: string | null;
  consecutiveAbsences: number;
};

export type EbdAttendanceReport = {
  quarterId: string | null;
  quarterName: string;
  classId: string | null;
  className: string;
  lessons: number;
  averagePercent: number;
  rows: EbdAttendanceReportRow[];
};

export async function getAttendanceReport(
  scope: EbdScope,
  filters: { quarterId?: string; classId?: string }
): Promise<EbdAttendanceReport> {
  const where: Prisma.EbdAttendanceWhereInput = {
    churchId: scope.churchId,
    class: congregationFilter(scope),
  };
  if (filters.quarterId) where.quarterId = filters.quarterId;
  if (filters.classId) where.classId = filters.classId;

  const [attendances, students] = await Promise.all([
    prisma.ebdAttendance.findMany({
      where,
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      select: {
        date: true,
        classId: true,
        quarter: { select: { name: true } },
        class: { select: { name: true } },
        entries: {
          select: {
            studentId: true,
            present: true,
            student: {
              select: {
                member: {
                  select: { name: true, code: true, phone: true, whatsapp: true },
                },
              },
            },
          },
        },
      },
    }),
    prisma.ebdStudent.findMany({
      where: {
        churchId: scope.churchId,
        class: congregationFilter(scope),
        ...(filters.classId ? { classId: filters.classId } : {}),
      },
      select: {
        id: true,
        active: true,
        classId: true,
        member: {
          select: { name: true, code: true, phone: true, whatsapp: true },
        },
        class: { select: { name: true } },
      },
    }),
  ]);

  /** Quantidade de chamadas por classe e data da última chamada de cada classe. */
  const classLessons = new Map<string, number>();
  const classLastDate = new Map<string, string>();
  /** Presenças por aluno, em ordem cronológica. */
  const studentFlags = new Map<string, boolean[]>();
  const studentAbsences = new Map<string, string[]>();

  for (const attendance of attendances) {
    const day = attendance.date.toISOString().slice(0, 10);
    classLessons.set(attendance.classId, (classLessons.get(attendance.classId) ?? 0) + 1);
    classLastDate.set(attendance.classId, day);

    for (const entry of attendance.entries) {
      const flags = studentFlags.get(entry.studentId) ?? [];
      flags.push(entry.present);
      studentFlags.set(entry.studentId, flags);

      if (!entry.present) {
        const dates = studentAbsences.get(entry.studentId) ?? [];
        dates.push(day);
        studentAbsences.set(entry.studentId, dates);
      }
    }
  }

  /** Alunos ativos + quem já teve chamada registrada no período. */
  const known = new Set<string>();
  const rows: EbdAttendanceReportRow[] = [];

  for (const student of students) {
    const flags = studentFlags.get(student.id);
    if (!student.active && !flags) continue;

    known.add(student.id);
    const lessons = flags?.length ?? classLessons.get(student.classId) ?? 0;
    const presences = flags?.filter(Boolean).length ?? 0;
    const absenceDates =
      studentAbsences.get(student.id) ??
      (lessons > 0 ? [classLastDate.get(student.classId) ?? ""].filter(Boolean) : []);

    let consecutiveAbsences = 0;
    if (flags) {
      for (let index = flags.length - 1; index >= 0 && !flags[index]; index -= 1) {
        consecutiveAbsences += 1;
      }
    } else {
      consecutiveAbsences = lessons;
    }

    rows.push({
      studentId: student.id,
      name: student.member.name,
      code: student.member.code,
      className: student.class.name,
      phone: student.member.phone ?? student.member.whatsapp ?? null,
      lessons,
      presences,
      absences: lessons - presences,
      percent: lessons > 0 ? Math.round((presences / lessons) * 100) : 0,
      lastAbsence:
        absenceDates.length > 0 ? absenceDates[absenceDates.length - 1] : null,
      consecutiveAbsences,
    });
  }

  // Alunos que têm chamada no período mas não estão mais na listagem da classe.
  for (const attendance of attendances) {
    for (const entry of attendance.entries) {
      if (known.has(entry.studentId)) continue;
      known.add(entry.studentId);

      const flags = studentFlags.get(entry.studentId) ?? [];
      const presences = flags.filter(Boolean).length;
      const absenceDates = studentAbsences.get(entry.studentId) ?? [];
      let consecutiveAbsences = 0;
      for (let index = flags.length - 1; index >= 0 && !flags[index]; index -= 1) {
        consecutiveAbsences += 1;
      }

      rows.push({
        studentId: entry.studentId,
        name: entry.student.member.name,
        code: entry.student.member.code,
        className: attendance.class.name,
        phone: entry.student.member.phone ?? entry.student.member.whatsapp ?? null,
        lessons: flags.length,
        presences,
        absences: flags.length - presences,
        percent:
          flags.length > 0 ? Math.round((presences / flags.length) * 100) : 0,
        lastAbsence:
          absenceDates.length > 0 ? absenceDates[absenceDates.length - 1] : null,
        consecutiveAbsences,
      });
    }
  }

  rows.sort(
    (a, b) =>
      a.percent - b.percent ||
      b.absences - a.absences ||
      a.name.localeCompare(b.name)
  );

  const averagePercent =
    rows.length > 0
      ? Math.round(rows.reduce((sum, row) => sum + row.percent, 0) / rows.length)
      : 0;

  return {
    quarterId: filters.quarterId ?? null,
    quarterName: attendances[0]?.quarter.name ?? "Todos os trimestres",
    classId: filters.classId ?? null,
    className: filters.classId
      ? attendances[0]?.class.name ?? "Classe"
      : "Todas as classes",
    lessons: attendances.length,
    averagePercent,
    rows,
  };
}
