"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Loader2,
  Minus,
  Pencil,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  Users,
  X,
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
import { cn } from "@/lib/utils";
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

const SCORE_FIELDS = [
  { key: "lessonScore", label: "Lição", max: EBD_SCORE_RULES.lesson },
  {
    key: "participationScore",
    label: "Participação",
    max: EBD_SCORE_RULES.participation,
  },
  { key: "bibleScore", label: "Bíblia", max: EBD_SCORE_RULES.bible },
  { key: "offeringScore", label: "Oferta", max: EBD_SCORE_RULES.offering },
] as const;

const MONTHS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function formatDate(value: string | null) {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

function dateInfo(value: string | null) {
  if (!value) {
    return { day: "--", month: "---", weekday: "", full: "—" };
  }
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  const dt = new Date(Date.UTC(year, month - 1, day, 12));
  return {
    day: String(day).padStart(2, "0"),
    month: MONTHS[month - 1] ?? "",
    weekday: WEEKDAYS[dt.getUTCDay()] ?? "",
    full: formatDate(value),
  };
}

function todayIso() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function attendanceRate(present: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((present / total) * 100);
}

function rateBarClass(percent: number) {
  if (percent >= 80) return "bg-emerald-500";
  if (percent >= 50) return "bg-amber-500";
  return "bg-rose-500";
}

function rateBadgeClass(percent: number) {
  if (percent >= 80) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300";
  }
  if (percent >= 50) {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300";
  }
  return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300";
}

function SummaryCard({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  hint: string;
  tone: "primary" | "emerald" | "amber" | "violet";
}) {
  const tones = {
    primary:
      "bg-primary/10 text-primary ring-primary/15 dark:bg-primary/15 dark:text-primary",
    emerald:
      "bg-emerald-500/10 text-emerald-600 ring-emerald-500/15 dark:text-emerald-400",
    amber:
      "bg-amber-500/10 text-amber-600 ring-amber-500/15 dark:text-amber-400",
    violet:
      "bg-violet-500/10 text-violet-600 ring-violet-500/15 dark:text-violet-400",
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold leading-none tracking-tight">
            {value}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
        </div>
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 [&_svg]:size-5",
            tones[tone]
          )}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function ScoreStepper({
  label,
  value,
  max,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-0.5 rounded-xl border bg-background px-1.5 py-1 transition",
        disabled && "opacity-40",
        !disabled && value > 0 && "border-primary/30 bg-primary/5"
      )}
    >
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="flex items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground"
          aria-label={`Diminuir ${label}`}
          disabled={disabled || value <= 0}
          onClick={() => onChange(Math.max(0, value - 1))}
        >
          <Minus />
        </Button>
        <span className="w-4 text-center text-sm font-semibold tabular-nums">
          {value}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground"
          aria-label={`Aumentar ${label}`}
          disabled={disabled || value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          <Plus />
        </Button>
      </div>
    </div>
  );
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

  const hasFilters = Boolean(
    search || quarterFilter || classFilter || fromFilter || toFilter
  );

  const summary = useMemo(() => {
    const calls = filtered.length;
    const students = filtered.reduce((sum, item) => sum + item.studentCount, 0);
    const present = filtered.reduce((sum, item) => sum + item.presentCount, 0);
    const points = filtered.reduce((sum, item) => sum + item.totalScore, 0);
    return {
      calls,
      students,
      present,
      points,
      rate: attendanceRate(present, students),
      average: students > 0 ? points / students : 0,
    };
  }, [filtered]);

  const totalScore = useMemo(
    () => entries.reduce((sum, entry) => sum + entryTotal(entry), 0),
    [entries]
  );
  const presentCount = useMemo(
    () => entries.filter((entry) => entry.present).length,
    [entries]
  );
  const attendancePercent = attendanceRate(presentCount, entries.length);
  const maxPossibleScore = entries.length * EBD_MAX_SCORE;

  const startCreate = useCallback(async (nextLessonId: string) => {
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
  }, []);

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

  function clearFilters() {
    setSearch("");
    setQuarterFilter("");
    setClassFilter("");
    setFromFilter("");
    setToFilter("");
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
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={<ClipboardList />}
          label="Chamadas"
          value={summary.calls}
          hint="registros no período filtrado"
          tone="primary"
        />
        <SummaryCard
          icon={<Users />}
          label="Presenças"
          value={`${summary.present}/${summary.students}`}
          hint={`${summary.rate}% de frequência média`}
          tone="emerald"
        />
        <SummaryCard
          icon={<TrendingUp />}
          label="Pontuação"
          value={summary.points}
          hint="pontos somados no período"
          tone="violet"
        />
        <SummaryCard
          icon={<Clock3 />}
          label="Média por aluno"
          value={summary.students > 0 ? summary.average.toFixed(1) : "—"}
          hint={`de ${EBD_MAX_SCORE} pontos possíveis`}
          tone="amber"
        />
      </div>

      <div className="rounded-2xl border bg-card p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div className="relative sm:col-span-2 lg:col-span-1 xl:col-span-2">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar lição ou classe..."
                className="h-9 pl-8"
              />
            </div>
            <select
              value={quarterFilter}
              onChange={(event) => setQuarterFilter(event.target.value)}
              className={`${SELECT_INPUT_CLASS} h-9`}
              aria-label="Filtrar por trimestre"
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
              className={`${SELECT_INPUT_CLASS} h-9`}
              aria-label="Filtrar por classe"
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
              className="h-9"
              title="Data inicial"
              aria-label="Data inicial"
            />
            <Input
              type="date"
              value={toFilter}
              onChange={(event) => setToFilter(event.target.value)}
              className="h-9"
              title="Data final"
              aria-label="Data final"
            />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {hasFilters ? (
              <Button variant="ghost" onClick={clearFilters}>
                <X className="mr-1.5 size-4" />
                Limpar filtros
              </Button>
            ) : null}
            {canManage ? (
              <Button
                onClick={() => {
                  const first = availableLessons[0];
                  if (first) void startCreate(first.id);
                  else setError("Cadastre uma lição antes de registrar a chamada.");
                }}
                disabled={lessons.length === 0}
                title={
                  lessons.length === 0
                    ? "Cadastre uma lição do trimestre para registrar chamadas."
                    : undefined
                }
              >
                <Plus className="mr-1.5 size-4" />
                Nova chamada
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {error && !formOpen && !deleting ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card/50 px-6 py-14">
          <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <ClipboardList className="size-6" />
            </div>
            <div>
              <p className="font-medium">Nenhuma chamada encontrada</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {lessons.length === 0
                  ? "Cadastre uma lição do trimestre para registrar a primeira chamada."
                  : "Ajuste os filtros ou registre a primeira chamada de uma lição."}
              </p>
            </div>
            {hasFilters ? (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Limpar filtros
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {filtered.map((attendance) => {
            const info = dateInfo(attendance.date);
            const percent = attendanceRate(
              attendance.presentCount,
              attendance.studentCount
            );
            return (
              <article
                key={attendance.id}
                className="group relative overflow-hidden rounded-2xl border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/10">
                      <span className="text-[10px] font-semibold uppercase leading-none">
                        {info.month}
                      </span>
                      <span className="mt-0.5 text-lg font-bold leading-none tabular-nums">
                        {info.day}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs capitalize text-muted-foreground">
                        {info.weekday} · {attendance.quarterName}
                      </p>
                      <h3 className="mt-0.5 line-clamp-2 font-semibold leading-snug">
                        {attendance.lessonNumber}. {attendance.lessonTitle}
                      </h3>
                      <p className="truncate text-xs text-muted-foreground">
                        {attendance.className}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums",
                      rateBadgeClass(percent)
                    )}
                  >
                    {percent}%
                  </span>
                </div>

                {attendance.notes ? (
                  <p className="mt-3 line-clamp-1 rounded-lg bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground">
                    {attendance.notes}
                  </p>
                ) : null}

                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Presenças</span>
                    <span className="font-medium tabular-nums">
                      {attendance.presentCount}/{attendance.studentCount}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full", rateBarClass(percent))}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t pt-3">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <TrendingUp className="size-3.5" />
                      <strong className="font-semibold text-foreground tabular-nums">
                        {attendance.totalScore}
                      </strong>
                      pts
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3.5" />
                      média{" "}
                      <strong className="font-semibold text-foreground tabular-nums">
                        {attendance.averageScore.toFixed(1)}
                      </strong>
                    </span>
                  </div>
                  {canManage ? (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Editar chamada"
                        aria-label="Editar chamada"
                        onClick={() => startEdit(attendance.id)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Excluir chamada"
                        aria-label="Excluir chamada"
                        onClick={() => {
                          setError(null);
                          setDeleting(attendance);
                        }}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
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
        <DialogContent className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
          <DialogHeader className="shrink-0 border-b bg-muted/30 px-5 py-4">
            <DialogTitle className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ClipboardList className="size-4" />
              </span>
              {editingId ? "Editar chamada" : "Registrar chamada"}
            </DialogTitle>
            <DialogDescription className="line-clamp-2">
              {lessonLabel || "Selecione a lição para carregar os alunos."}
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-sm text-muted-foreground">
              <Loader2 className="size-6 animate-spin text-primary" />
              Carregando alunos...
            </div>
          ) : (
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
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

              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/60 px-3 py-2 dark:border-emerald-500/20 dark:bg-emerald-500/5">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-emerald-700/80 dark:text-emerald-300/80">
                    Presentes
                  </p>
                  <p className="mt-0.5 text-xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                    {presentCount}
                    <span className="text-sm font-normal text-muted-foreground">
                      /{entries.length}
                    </span>
                  </p>
                </div>
                <div className="rounded-xl border bg-card px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Ausentes
                  </p>
                  <p className="mt-0.5 text-xl font-semibold tabular-nums">
                    {entries.length - presentCount}
                    <span className="text-sm font-normal text-muted-foreground">
                      /{entries.length}
                    </span>
                  </p>
                </div>
                <div className="rounded-xl border bg-card px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Pontuação
                  </p>
                  <p className="mt-0.5 text-xl font-semibold tabular-nums">
                    {totalScore}
                    <span className="text-sm font-normal text-muted-foreground">
                      /{maxPossibleScore}
                    </span>
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Frequência da turma</span>
                  <span className="font-medium tabular-nums">
                    {attendancePercent}%
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      rateBarClass(attendancePercent)
                    )}
                    style={{ width: `${attendancePercent}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-muted/30 px-3 py-2">
                <span className="text-sm text-muted-foreground">
                  Marque presença e ajuste a pontuação de cada aluno.
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
                <div className="space-y-2">
                  {entries.map((entry) => {
                    const total = entryTotal(entry);
                    return (
                      <div
                        key={entry.studentId}
                        className={cn(
                          "rounded-xl border px-3 py-2.5 transition",
                          entry.present
                            ? "border-emerald-200/80 bg-emerald-50/40 dark:border-emerald-500/20 dark:bg-emerald-500/5"
                            : "bg-card"
                        )}
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <div
                              className={cn(
                                "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                                entry.present
                                  ? "bg-emerald-500 text-white shadow-sm"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {entry.present ? (
                                <Check className="size-4" />
                              ) : (
                                initials(entry.name)
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {entry.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Matrícula {entry.code}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            {SCORE_FIELDS.map((field) => (
                              <ScoreStepper
                                key={field.key}
                                label={field.label}
                                max={field.max}
                                value={entry[field.key]}
                                disabled={!entry.present}
                                onChange={(value) =>
                                  updateEntry(entry.studentId, {
                                    [field.key]: value,
                                  } as Partial<Entry>)
                                }
                              />
                            ))}

                            <div className="flex items-center gap-2 pl-1">
                              <span
                                className={cn(
                                  "inline-flex h-8 min-w-14 items-center justify-center rounded-lg border px-2 text-sm font-semibold tabular-nums",
                                  total > 0
                                    ? "border-primary/20 bg-primary/5 text-primary"
                                    : "text-muted-foreground"
                                )}
                                title={`${total} de ${EBD_MAX_SCORE} pontos`}
                              >
                                {total}/{EBD_MAX_SCORE}
                              </span>
                              <button
                                type="button"
                                onClick={() => togglePresence(entry)}
                                aria-pressed={entry.present}
                                className={cn(
                                  "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition",
                                  entry.present
                                    ? "border-emerald-500/30 bg-emerald-500 text-white shadow-sm hover:bg-emerald-600"
                                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                                )}
                              >
                                {entry.present ? (
                                  <CheckCircle2 className="size-4" />
                                ) : (
                                  <X className="size-4" />
                                )}
                                {entry.present ? "Presente" : "Ausente"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {error ? (
            <p className="mx-5 mb-2 shrink-0 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter className="shrink-0 border-t bg-muted/20 px-5 py-3">
            <Button
              variant="outline"
              onClick={() => setFormOpen(false)}
              disabled={busy}
            >
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
      <Dialog
        open={Boolean(deleting)}
        onOpenChange={(value) => !value && setDeleting(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir chamada</DialogTitle>
            <DialogDescription>
              Excluir a chamada da lição{" "}
              <strong>
                {deleting?.lessonNumber}. {deleting?.lessonTitle}
              </strong>{" "}
              de {formatDate(deleting?.date ?? null)}? Essa ação não pode ser
              desfeita.
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleting(null)}
              disabled={busy}
            >
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
        <CalendarDays className="size-3.5" />
        O histórico permite editar ou excluir chamadas já registradas.
      </p>
    </div>
  );
}
