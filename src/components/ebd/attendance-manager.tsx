"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ClipboardList,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SELECT_INPUT_CLASS } from "@/lib/styles";
import {
  createEbdAttendance,
  deleteEbdAttendance,
  getEbdAttendance,
  getEbdRoster,
  updateEbdAttendance,
} from "@/app/actions/ebd";
import {
  EBD_MAX_SCORE,
  EBD_SCORE_RULES,
  entryTotal,
} from "@/modules/ebd/scoring";
import type {
  EbdAttendanceView,
  EbdLessonView,
  EbdQuarterView,
} from "@/services/ebd-lessons.service";
import type { EbdClassView } from "@/services/ebd.service";
import { EmptyState, Field } from "@/components/ebd/ebd-ui";

type Entry = {
  studentId: string;
  name: string;
  code: string;
  present: boolean;
  lessonScore: number;
  participationScore: number;
  bibleScore: number;
  offeringScore: number;
};

type Props = {
  attendances: EbdAttendanceView[];
  lessons: EbdLessonView[];
  classes: EbdClassView[];
  quarters: EbdQuarterView[];
  initialLessonId: string | null;
  canManage: boolean;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

function todayIso() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function scoreOptions(max: number) {
  return Array.from({ length: max + 1 }, (_, index) => index);
}

export function AttendanceManager({
  attendances,
  lessons,
  classes,
  quarters,
  initialLessonId,
  canManage,
}: Props) {
  const router = useRouter();
  const [quarterFilter, setQuarterFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [fromFilter, setFromFilter] = useState("");
  const [toFilter, setToFilter] = useState("");
  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<EbdAttendanceView | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [lessonId, setLessonId] = useState("");
  const [lessonLabel, setLessonLabel] = useState("");
  const [date, setDate] = useState(todayIso());
  const [notes, setNotes] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return attendances.filter((item) => {
      if (quarterFilter && item.quarterId !== quarterFilter) return false;
      if (classFilter && item.classId !== classFilter) return false;
      if (fromFilter && item.date < fromFilter) return false;
      if (toFilter && item.date > toFilter) return false;
      if (!term) return true;
      return (
        item.lessonTitle.toLowerCase().includes(term) ||
        item.className.toLowerCase().includes(term) ||
        String(item.lessonNumber).includes(term)
      );
    });
  }, [attendances, quarterFilter, classFilter, fromFilter, toFilter, search]);

  const totalScore = useMemo(
    () => entries.reduce((sum, entry) => sum + entryTotal(entry), 0),
    [entries]
  );
  const presentCount = useMemo(
    () => entries.filter((entry) => entry.present).length,
    [entries]
  );

  const startCreate = useCallback(
    async (nextLessonId: string) => {
      setFormOpen(true);
      setLoading(true);
      setError(null);
      setEditingId(null);
      setLessonId(nextLessonId);
      setNotes("");
      setEntries([]);
      const result = await getEbdRoster(nextLessonId);
      setLoading(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setLessonLabel(
        `Lição ${result.lesson.number} — ${result.lesson.title} · ${result.lesson.className}`
      );
      setDate(result.lesson.date || todayIso());
      setEntries(
        result.students.map((student) => ({
          studentId: student.studentId,
          name: student.name,
          code: student.code,
          present: false,
          lessonScore: 0,
          participationScore: 0,
          bibleScore: 0,
          offeringScore: 0,
        }))
      );
    },
    []
  );

  const startEdit = useCallback(async (id: string) => {
    setFormOpen(true);
    setLoading(true);
    setError(null);
    setEditingId(id);
    setEntries([]);
    const result = await getEbdAttendance(id);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const attendance = result.attendance;
    setLessonId(attendance.lessonId);
    setLessonLabel(
      `Lição ${attendance.lessonNumber} — ${attendance.lessonTitle} · ${attendance.className}`
    );
    setDate(attendance.date);
    setNotes(attendance.notes ?? "");
    setEntries(
      attendance.entries.map((entry) => ({
        studentId: entry.studentId,
        name: entry.studentName,
        code: entry.studentCode,
        present: entry.present,
        lessonScore: entry.lessonScore,
        participationScore: entry.participationScore,
        bibleScore: entry.bibleScore,
        offeringScore: entry.offeringScore,
      }))
    );
  }, []);

  useEffect(() => {
    if (!initialLessonId) return;
    // Adia a abertura para depois da montagem, evitando setState síncrono no efeito.
    const timer = setTimeout(() => {
      void startCreate(initialLessonId);
    }, 0);
    return () => clearTimeout(timer);
  }, [initialLessonId, startCreate]);

  function updateEntry(studentId: string, patch: Partial<Entry>) {
    setEntries((current) =>
      current.map((entry) =>
        entry.studentId === studentId ? { ...entry, ...patch } : entry
      )
    );
  }

  function togglePresence(entry: Entry) {
    if (entry.present) {
      updateEntry(entry.studentId, {
        present: false,
        lessonScore: 0,
        participationScore: 0,
        bibleScore: 0,
        offeringScore: 0,
      });
    } else {
      updateEntry(entry.studentId, {
        present: true,
        lessonScore: EBD_SCORE_RULES.lesson,
        participationScore: EBD_SCORE_RULES.participation,
        bibleScore: EBD_SCORE_RULES.bible,
        offeringScore: EBD_SCORE_RULES.offering,
      });
    }
  }

  function markAll(present: boolean) {
    setEntries((current) =>
      current.map((entry) => ({
        ...entry,
        present,
        lessonScore: present ? EBD_SCORE_RULES.lesson : 0,
        participationScore: present ? EBD_SCORE_RULES.participation : 0,
        bibleScore: present ? EBD_SCORE_RULES.bible : 0,
        offeringScore: present ? EBD_SCORE_RULES.offering : 0,
      }))
    );
  }

  async function submit() {
    setBusy(true);
    setError(null);
    const payload = {
      date,
      notes: notes || null,
      entries: entries.map((entry) => ({
        studentId: entry.studentId,
        present: entry.present,
        lessonScore: entry.lessonScore,
        participationScore: entry.participationScore,
        bibleScore: entry.bibleScore,
        offeringScore: entry.offeringScore,
      })),
    };
    const result = editingId
      ? await updateEbdAttendance(editingId, payload)
      : await createEbdAttendance({ lessonId, ...payload });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setFormOpen(false);
    router.refresh();
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    setError(null);
    const result = await deleteEbdAttendance(deleting.id);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDeleting(null);
    router.refresh();
  }

  const availableLessons = lessons.filter((lesson) => {
    if (quarterFilter && lesson.quarterId !== quarterFilter) return false;
    if (classFilter && lesson.classId !== classFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap">
          <div className="relative sm:max-w-56">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar lição ou classe..."
              className="pl-8"
            />
          </div>
          <select
            value={quarterFilter}
            onChange={(event) => setQuarterFilter(event.target.value)}
            className={`${SELECT_INPUT_CLASS} sm:max-w-52`}
          >
            <option value="">Todos os trimestres</option>
            {quarters.map((quarter) => (
              <option key={quarter.id} value={quarter.id}>
                {quarter.name}
              </option>
            ))}
          </select>
          <select
            value={classFilter}
            onChange={(event) => setClassFilter(event.target.value)}
            className={`${SELECT_INPUT_CLASS} sm:max-w-44`}
          >
            <option value="">Todas as classes</option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <Input
            type="date"
            value={fromFilter}
            onChange={(event) => setFromFilter(event.target.value)}
            className="sm:max-w-40"
            title="Data inicial"
          />
          <Input
            type="date"
            value={toFilter}
            onChange={(event) => setToFilter(event.target.value)}
            className="sm:max-w-40"
            title="Data final"
          />
        </div>
        {canManage ? (
          <Button
            onClick={() => {
              const first = availableLessons[0];
              if (first) void startCreate(first.id);
              else setError("Cadastre uma lição antes de registrar a chamada.");
            }}
            className="shrink-0"
            disabled={lessons.length === 0}
          >
            <Plus className="mr-1.5 size-4" />
            Nova chamada
          </Button>
        ) : null}
      </div>

      {error && !formOpen && !deleting ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState message="Nenhuma chamada encontrada para os filtros selecionados." />
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Data</th>
                <th className="px-3 py-2 font-medium">Lição</th>
                <th className="px-3 py-2 font-medium">Classe</th>
                <th className="px-3 py-2 font-medium">Trimestre</th>
                <th className="px-3 py-2 font-medium">Presenças</th>
                <th className="px-3 py-2 font-medium">Pontos</th>
                <th className="px-3 py-2 font-medium">Média</th>
                {canManage ? <th className="px-3 py-2 text-right font-medium">Ações</th> : null}
              </tr>
            </thead>
            <tbody>
              {filtered.map((attendance) => (
                <tr key={attendance.id} className="border-t align-top">
                  <td className="px-3 py-2 whitespace-nowrap">{formatDate(attendance.date)}</td>
                  <td className="px-3 py-2">
                    <p className="font-medium">
                      {attendance.lessonNumber}. {attendance.lessonTitle}
                    </p>
                    {attendance.notes ? (
                      <p className="line-clamp-1 text-xs text-muted-foreground">
                        {attendance.notes}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">{attendance.className}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {attendance.quarterName}
                  </td>
                  <td className="px-3 py-2">
                    {attendance.presentCount}/{attendance.studentCount}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {attendance.totalScore}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {attendance.averageScore.toFixed(1)}
                  </td>
                  {canManage ? (
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Editar chamada"
                          onClick={() => startEdit(attendance.id)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Excluir chamada"
                          onClick={() => {
                            setError(null);
                            setDeleting(attendance);
                          }}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Pontuação máxima por lição: {EBD_MAX_SCORE} pontos (presença{" "}
        {EBD_SCORE_RULES.presence}, lição {EBD_SCORE_RULES.lesson}, participação{" "}
        {EBD_SCORE_RULES.participation}, bíblia {EBD_SCORE_RULES.bible}, oferta{" "}
        {EBD_SCORE_RULES.offering}).
      </p>

      {/* Formulário de chamada */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar chamada" : "Registrar chamada"}
            </DialogTitle>
            <DialogDescription>{lessonLabel}</DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Carregando alunos...
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Data da chamada">
                  <Input
                    type="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                  />
                </Field>
                <Field label="Observações">
                  <Input
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Opcional"
                  />
                </Field>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                <span>
                  {presentCount} presente(s) de {entries.length} · {totalScore} ponto(s)
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => markAll(true)}
                    disabled={entries.length === 0}
                  >
                    <CheckCircle2 className="mr-1.5 size-4" />
                    Marcar todos
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => markAll(false)}
                    disabled={entries.length === 0}
                  >
                    Limpar
                  </Button>
                </div>
              </div>

              {entries.length === 0 ? (
                <EmptyState message="Nenhum aluno ativo nesta classe. Matricule alunos antes de fazer a chamada." />
              ) : (
                <div className="max-h-[45vh] overflow-auto rounded-xl border">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead className="sticky top-0 z-10 bg-muted/80 text-left text-xs uppercase tracking-wide text-muted-foreground backdrop-blur">
                      <tr>
                        <th className="px-3 py-2 font-medium">Aluno</th>
                        <th className="px-3 py-2 text-center font-medium">Presença</th>
                        <th className="px-3 py-2 text-center font-medium">Lição</th>
                        <th className="px-3 py-2 text-center font-medium">Participação</th>
                        <th className="px-3 py-2 text-center font-medium">Bíblia</th>
                        <th className="px-3 py-2 text-center font-medium">Oferta</th>
                        <th className="px-3 py-2 text-center font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((entry) => (
                        <tr key={entry.studentId} className="border-t">
                          <td className="px-3 py-2">
                            <p className="font-medium">{entry.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Matrícula {entry.code}
                            </p>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              className="size-4 rounded border-input accent-primary"
                              checked={entry.present}
                              onChange={() => togglePresence(entry)}
                            />
                          </td>
                          {(
                            [
                              ["lessonScore", EBD_SCORE_RULES.lesson],
                              ["participationScore", EBD_SCORE_RULES.participation],
                              ["bibleScore", EBD_SCORE_RULES.bible],
                              ["offeringScore", EBD_SCORE_RULES.offering],
                            ] as const
                          ).map(([key, max]) => (
                            <td key={key} className="px-2 py-2 text-center">
                              <select
                                value={entry[key]}
                                disabled={!entry.present}
                                onChange={(event) =>
                                  updateEntry(entry.studentId, {
                                    [key]: Number(event.target.value),
                                  })
                                }
                                className="h-8 rounded-md border bg-background px-1.5 text-sm disabled:opacity-40"
                              >
                                {scoreOptions(max).map((value) => (
                                  <option key={value} value={value}>
                                    {value}
                                  </option>
                                ))}
                              </select>
                            </td>
                          ))}
                          <td className="px-3 py-2 text-center font-semibold">
                            {entryTotal(entry)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button
              onClick={submit}
              disabled={busy || loading || entries.length === 0 || !date}
            >
              {busy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
              {editingId ? "Salvar chamada" : "Registrar chamada"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Excluir chamada */}
      <Dialog open={Boolean(deleting)} onOpenChange={(value) => !value && setDeleting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir chamada</DialogTitle>
            <DialogDescription>
              Excluir a chamada da lição{" "}
              <strong>
                {deleting?.lessonNumber}. {deleting?.lessonTitle}
              </strong>{" "}
              de {formatDate(deleting?.date ?? null)}? Essa ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={busy}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={busy}>
              {busy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ClipboardList className="size-3.5" />
        O histórico permite editar ou excluir chamadas já registradas.
      </p>
    </div>
  );
}
