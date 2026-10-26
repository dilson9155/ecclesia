"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/rbac";
import { scopeFromUser, scopedCongregationIdsOrNull } from "@/lib/scope";
import {
  createClass,
  createTeacher,
  deleteClass,
  deleteStudent,
  deleteTeacher,
  enrollNewStudent,
  enrollStudent,
  setStudentActive,
  setTeacherActive,
  updateClass,
  updateStudent,
  updateTeacher,
  type EbdClassInput,
  type EbdNewStudentInput,
  type EbdScope,
} from "@/services/ebd.service";
import {
  createAttendance,
  createLesson,
  createQuarter,
  deleteAttendance,
  deleteLesson,
  deleteQuarter,
  getAttendance,
  getAttendanceRoster,
  updateAttendance,
  updateLesson,
  updateQuarter,
  type EbdAttendanceDetail,
  type EbdAttendanceEntryInput,
  type EbdLessonView,
} from "@/services/ebd-lessons.service";

type ActionResult = { ok: true } | { ok: false; error: string };

async function ebdScope(permission: string): Promise<
  { ok: true; scope: EbdScope; userId: string } | { ok: false; error: string }
> {
  const user = await requirePermission(permission);
  if (!user.churchId) {
    return { ok: false, error: "Nenhuma igreja vinculada ao seu usuário." };
  }
  const congregationIds = await scopedCongregationIdsOrNull(scopeFromUser(user));
  return {
    ok: true,
    scope: { churchId: user.churchId, congregationIds },
    userId: user.id,
  };
}

function revalidateEbd() {
  revalidatePath("/ebd");
  revalidatePath("/ebd/alunos");
  revalidatePath("/ebd/professores");
  revalidatePath("/ebd/classes");
  revalidatePath("/ebd/licoes");
  revalidatePath("/ebd/chamadas");
  revalidatePath("/ebd/relatorios");
  revalidatePath("/membros");
}

async function run(
  permission: string,
  task: (scope: EbdScope, userId: string) => Promise<unknown>
): Promise<ActionResult> {
  const context = await ebdScope(permission);
  if (!context.ok) return { ok: false, error: context.error };
  try {
    await task(context.scope, context.userId);
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
  revalidateEbd();
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* Classes                                                                     */
/* -------------------------------------------------------------------------- */

export async function createEbdClass(input: EbdClassInput) {
  return run("ebd.manage", (scope, userId) => createClass(scope, input, userId));
}

export async function updateEbdClass(id: string, input: EbdClassInput) {
  return run("ebd.manage", (scope, userId) => updateClass(scope, id, input, userId));
}

export async function deleteEbdClass(id: string) {
  return run("ebd.manage", (scope, userId) => deleteClass(scope, id, userId));
}

/* -------------------------------------------------------------------------- */
/* Alunos                                                                      */
/* -------------------------------------------------------------------------- */

export async function enrollEbdStudent(input: {
  memberId: string;
  classId: string;
  notes?: string | null;
}) {
  return run("ebd.manage", (scope, userId) => enrollStudent(scope, input, userId));
}

export async function enrollNewEbdStudent(input: EbdNewStudentInput) {
  return run("ebd.manage", (scope, userId) => enrollNewStudent(scope, input, userId));
}

export async function updateEbdStudent(
  id: string,
  input: { classId: string; active: boolean; notes?: string | null }
) {
  return run("ebd.manage", (scope, userId) => updateStudent(scope, id, input, userId));
}

export async function setEbdStudentActive(id: string, active: boolean) {
  return run("ebd.manage", (scope, userId) =>
    setStudentActive(scope, id, active, userId)
  );
}

export async function deleteEbdStudent(id: string) {
  return run("ebd.manage", (scope, userId) => deleteStudent(scope, id, userId));
}

/* -------------------------------------------------------------------------- */
/* Professores                                                                 */
/* -------------------------------------------------------------------------- */

export async function createEbdTeacher(input: {
  memberId: string;
  classIds: string[];
  notes?: string | null;
}) {
  return run("ebd.manage", (scope, userId) => createTeacher(scope, input, userId));
}

export async function updateEbdTeacher(
  id: string,
  input: { classIds: string[]; active: boolean; notes?: string | null }
) {
  return run("ebd.manage", (scope, userId) => updateTeacher(scope, id, input, userId));
}

export async function setEbdTeacherActive(id: string, active: boolean) {
  return run("ebd.manage", (scope, userId) =>
    setTeacherActive(scope, id, active, userId)
  );
}

export async function deleteEbdTeacher(id: string) {
  return run("ebd.manage", (scope, userId) => deleteTeacher(scope, id, userId));
}

/* -------------------------------------------------------------------------- */
/* Trimestres e lições                                                         */
/* -------------------------------------------------------------------------- */

export async function createEbdQuarter(input: {
  name: string;
  startDate: string;
  endDate: string;
  notes?: string | null;
}) {
  return run("ebd.manage", (scope, userId) => createQuarter(scope, input, userId));
}

export async function updateEbdQuarter(
  id: string,
  input: {
    name: string;
    startDate: string;
    endDate: string;
    status?: "ABERTO" | "FECHADO";
    notes?: string | null;
  }
) {
  return run("ebd.manage", (scope, userId) => updateQuarter(scope, id, input, userId));
}

export async function deleteEbdQuarter(id: string) {
  return run("ebd.manage", (scope, userId) => deleteQuarter(scope, id, userId));
}

export async function createEbdLesson(input: {
  quarterId: string;
  classId: string;
  number: number;
  title: string;
  notes?: string | null;
  date?: string | null;
}) {
  return run("ebd.manage", (scope, userId) => createLesson(scope, input, userId));
}

export async function updateEbdLesson(
  id: string,
  input: {
    quarterId: string;
    classId: string;
    number: number;
    title: string;
    notes?: string | null;
    date?: string | null;
  }
) {
  return run("ebd.manage", (scope, userId) => updateLesson(scope, id, input, userId));
}

export async function deleteEbdLesson(id: string) {
  return run("ebd.manage", (scope, userId) => deleteLesson(scope, id, userId));
}

/* -------------------------------------------------------------------------- */
/* Chamadas                                                                    */
/* -------------------------------------------------------------------------- */

export async function createEbdAttendance(input: {
  lessonId: string;
  date: string;
  notes?: string | null;
  entries: EbdAttendanceEntryInput[];
}) {
  return run("ebd.attendance", (scope, userId) =>
    createAttendance(scope, input, userId)
  );
}

export async function updateEbdAttendance(
  id: string,
  input: { date: string; notes?: string | null; entries: EbdAttendanceEntryInput[] }
) {
  return run("ebd.attendance", (scope, userId) =>
    updateAttendance(scope, id, input, userId)
  );
}

export async function deleteEbdAttendance(id: string) {
  return run("ebd.attendance", (scope, userId) => deleteAttendance(scope, id, userId));
}

/* -------------------------------------------------------------------------- */
/* Leitura para o formulário de chamada                                         */
/* -------------------------------------------------------------------------- */

export type EbdRosterResult =
  | {
      ok: true;
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
    }
  | { ok: false; error: string };

export async function getEbdRoster(lessonId: string): Promise<EbdRosterResult> {
  const context = await ebdScope("ebd.attendance");
  if (!context.ok) return { ok: false, error: context.error };
  try {
    const roster = await getAttendanceRoster(context.scope, lessonId);
    return { ok: true, ...roster };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export type EbdAttendanceResult =
  | { ok: true; attendance: EbdAttendanceDetail }
  | { ok: false; error: string };

export async function getEbdAttendance(id: string): Promise<EbdAttendanceResult> {
  const context = await ebdScope("ebd.attendance");
  if (!context.ok) return { ok: false, error: context.error };
  try {
    const attendance = await getAttendance(context.scope, id);
    if (!attendance) return { ok: false, error: "Chamada não encontrada." };
    return { ok: true, attendance };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}
