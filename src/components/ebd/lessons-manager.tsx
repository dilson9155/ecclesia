"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
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
  createEbdLesson,
  createEbdQuarter,
  deleteEbdLesson,
  deleteEbdQuarter,
  updateEbdLesson,
  updateEbdQuarter,
} from "@/app/actions/ebd";
import type {
  EbdLessonView,
  EbdQuarterView,
} from "@/services/ebd-lessons.service";
import type { EbdClassView } from "@/services/ebd.service";
import { EmptyState, Field, StatusPill } from "@/components/ebd/ebd-ui";

type Props = {
  quarters: EbdQuarterView[];
  lessons: EbdLessonView[];
  classes: EbdClassView[];
  canManage: boolean;
  canAttendance: boolean;
};

type QuarterForm = {
  name: string;
  startDate: string;
  endDate: string;
  status: "ABERTO" | "FECHADO";
  notes: string;
};

type LessonForm = {
  quarterId: string;
  classId: string;
  number: string;
  title: string;
  notes: string;
  date: string;
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

function defaultQuarter(): QuarterForm {
  const now = new Date();
  const year = now.getFullYear();
  const quarter = Math.floor(now.getMonth() / 3) + 1;
  const startMonth = (quarter - 1) * 3;
  const start = new Date(Date.UTC(year, startMonth, 1));
  const end = new Date(Date.UTC(year, startMonth + 3, 0));
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  return {
    name: `${quarter}º Trimestre de ${year}`,
    startDate: iso(start),
    endDate: iso(end),
    status: "ABERTO",
    notes: "",
  };
}

export function LessonsManager({ quarters, lessons, classes, canManage, canAttendance }: Props) {
  const router = useRouter();
  const [quarterFilter, setQuarterFilter] = useState(quarters[0]?.id ?? "");
  const [classFilter, setClassFilter] = useState("");
  const [search, setSearch] = useState("");

  const [quarterOpen, setQuarterOpen] = useState(false);
  const [quarterEditing, setQuarterEditing] = useState<EbdQuarterView | null>(null);
  const [quarterForm, setQuarterForm] = useState<QuarterForm>(defaultQuarter());
  const [quarterDeleting, setQuarterDeleting] = useState<EbdQuarterView | null>(null);

  const [lessonOpen, setLessonOpen] = useState(false);
  const [lessonEditing, setLessonEditing] = useState<EbdLessonView | null>(null);
  const [lessonForm, setLessonForm] = useState<LessonForm>({
    quarterId: "",
    classId: "",
    number: "",
    title: "",
    notes: "",
    date: todayIso(),
  });
  const [lessonDeleting, setLessonDeleting] = useState<EbdLessonView | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeClasses = useMemo(
    () => classes.filter((item) => item.status === "ATIVO"),
    [classes]
  );

  const selectedQuarter = quarters.find((item) => item.id === quarterFilter) ?? null;

  const filteredLessons = useMemo(() => {
    const term = search.trim().toLowerCase();
    return lessons.filter((lesson) => {
      if (quarterFilter && lesson.quarterId !== quarterFilter) return false;
      if (classFilter && lesson.classId !== classFilter) return false;
      if (!term) return true;
      return (
        lesson.title.toLowerCase().includes(term) ||
        String(lesson.number).includes(term) ||
        (lesson.notes ?? "").toLowerCase().includes(term)
      );
    });
  }, [lessons, quarterFilter, classFilter, search]);

  function openQuarterCreate() {
    setQuarterEditing(null);
    setQuarterForm(defaultQuarter());
    setError(null);
    setQuarterOpen(true);
  }

  function openQuarterEdit(quarter: EbdQuarterView) {
    setQuarterEditing(quarter);
    setQuarterForm({
      name: quarter.name,
      startDate: quarter.startDate,
      endDate: quarter.endDate,
      status: quarter.status,
      notes: quarter.notes ?? "",
    });
    setError(null);
    setQuarterOpen(true);
  }

  async function submitQuarter() {
    setBusy(true);
    setError(null);
    const payload = {
      name: quarterForm.name,
      startDate: quarterForm.startDate,
      endDate: quarterForm.endDate,
      status: quarterForm.status,
      notes: quarterForm.notes || null,
    };
    const result = quarterEditing
      ? await updateEbdQuarter(quarterEditing.id, payload)
      : await createEbdQuarter(payload);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setQuarterOpen(false);
    router.refresh();
  }

  async function confirmQuarterDelete() {
    if (!quarterDeleting) return;
    setBusy(true);
    setError(null);
    const result = await deleteEbdQuarter(quarterDeleting.id);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setQuarterDeleting(null);
    if (quarterDeleting.id === quarterFilter) setQuarterFilter("");
    router.refresh();
  }

  function openLessonCreate() {
    setLessonEditing(null);
    setLessonForm({
      quarterId: quarterFilter || quarters[0]?.id || "",
      classId: classFilter || "",
      number: "",
      title: "",
      notes: "",
      date: todayIso(),
    });
    setError(null);
    setLessonOpen(true);
  }

  function openLessonEdit(lesson: EbdLessonView) {
    setLessonEditing(lesson);
    setLessonForm({
      quarterId: lesson.quarterId,
      classId: lesson.classId,
      number: String(lesson.number),
      title: lesson.title,
      notes: lesson.notes ?? "",
      date: lesson.date ?? "",
    });
    setError(null);
    setLessonOpen(true);
  }

  async function submitLesson() {
    setBusy(true);
    setError(null);
    const payload = {
      quarterId: lessonForm.quarterId,
      classId: lessonForm.classId,
      number: Number(lessonForm.number),
      title: lessonForm.title,
      notes: lessonForm.notes || null,
      date: lessonForm.date || null,
    };
    const result = lessonEditing
      ? await updateEbdLesson(lessonEditing.id, payload)
      : await createEbdLesson(payload);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setLessonOpen(false);
    router.refresh();
  }

  async function confirmLessonDelete() {
    if (!lessonDeleting) return;
    setBusy(true);
    setError(null);
    const result = await deleteEbdLesson(lessonDeleting.id);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setLessonDeleting(null);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {/* Trimestres */}
      <section className="space-y-3 rounded-xl border bg-card p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-end">
            <Field label="Trimestre" className="sm:max-w-sm">
              <select
                value={quarterFilter}
                onChange={(event) => setQuarterFilter(event.target.value)}
                className={SELECT_INPUT_CLASS}
              >
                <option value="">Todos os trimestres</option>
                {quarters.map((quarter) => (
                  <option key={quarter.id} value={quarter.id}>
                    {quarter.name}
                  </option>
                ))}
              </select>
            </Field>
            {selectedQuarter ? (
              <div className="flex flex-wrap items-center gap-2 pb-0.5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2 py-1">
                  <CalendarDays className="size-3.5" />
                  {formatDate(selectedQuarter.startDate)} a{" "}
                  {formatDate(selectedQuarter.endDate)}
                </span>
                <StatusPill
                  active={selectedQuarter.status === "ABERTO"}
                  activeLabel="Aberto"
                  inactiveLabel="Fechado"
                />
                <span className="inline-flex items-center gap-1">
                  <BookOpen className="size-3.5" />
                  {selectedQuarter.lessonCount} lição(ões)
                </span>
                <span className="inline-flex items-center gap-1">
                  <ClipboardList className="size-3.5" />
                  {selectedQuarter.attendanceCount} chamada(s)
                </span>
              </div>
            ) : null}
          </div>

          {canManage ? (
            <div className="flex shrink-0 gap-2">
              {selectedQuarter ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openQuarterEdit(selectedQuarter)}
                  >
                    <Pencil className="mr-1.5 size-4" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setError(null);
                      setQuarterDeleting(selectedQuarter);
                    }}
                  >
                    <Trash2 className="mr-1.5 size-4 text-destructive" />
                    Excluir
                  </Button>
                </>
              ) : null}
              <Button size="sm" onClick={openQuarterCreate}>
                <Plus className="mr-1.5 size-4" />
                Novo trimestre
              </Button>
            </div>
          ) : null}
        </div>

        {quarters.length === 0 ? (
          <p className="rounded-md border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
            Nenhum trimestre cadastrado. Crie um trimestre com a data de início e
            término para começar a cadastrar as lições.
          </p>
        ) : null}
      </section>

      {/* Lições */}
      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row">
            <div className="relative sm:max-w-xs">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar lição por título, número..."
                className="pl-8"
              />
            </div>
            <select
              value={classFilter}
              onChange={(event) => setClassFilter(event.target.value)}
              className={`${SELECT_INPUT_CLASS} sm:max-w-56`}
            >
              <option value="">Todas as classes</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          {canManage ? (
            <Button
              onClick={openLessonCreate}
              className="shrink-0"
              disabled={quarters.length === 0 || activeClasses.length === 0}
            >
              <Plus className="mr-1.5 size-4" />
              Nova lição
            </Button>
          ) : null}
        </div>

        {error && !quarterOpen && !lessonOpen && !quarterDeleting && !lessonDeleting ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {filteredLessons.length === 0 ? (
          <EmptyState message="Nenhuma lição encontrada. Cadastre a primeira lição do trimestre." />
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Nº</th>
                  <th className="px-3 py-2 font-medium">Lição</th>
                  <th className="px-3 py-2 font-medium">Classe</th>
                  <th className="px-3 py-2 font-medium">Trimestre</th>
                  <th className="px-3 py-2 font-medium">Data</th>
                  <th className="px-3 py-2 font-medium">Chamadas</th>
                  <th className="px-3 py-2 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredLessons.map((lesson) => (
                  <tr key={lesson.id} className="border-t align-top">
                    <td className="px-3 py-2 font-semibold">{lesson.number}</td>
                    <td className="px-3 py-2">
                      <p className="font-medium">{lesson.title}</p>
                      {lesson.notes ? (
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {lesson.notes}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">{lesson.className}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {lesson.quarterName}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {formatDate(lesson.date)}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {lesson.attendanceCount}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        {canAttendance ? (
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/ebd/chamadas?lesson=${lesson.id}`}>
                              <ClipboardList className="mr-1.5 size-4" />
                              Chamada
                            </Link>
                          </Button>
                        ) : null}
                        {canManage ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="Editar"
                              onClick={() => openLessonEdit(lesson)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="Excluir"
                              onClick={() => {
                                setError(null);
                                setLessonDeleting(lesson);
                              }}
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Dialog trimestre */}
      <Dialog open={quarterOpen} onOpenChange={setQuarterOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {quarterEditing ? "Editar trimestre" : "Novo trimestre"}
            </DialogTitle>
            <DialogDescription>
              Informe o período do trimestre. As lições serão vinculadas a ele.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome do trimestre" className="sm:col-span-2">
              <Input
                value={quarterForm.name}
                onChange={(event) =>
                  setQuarterForm({ ...quarterForm, name: event.target.value })
                }
                placeholder="Ex.: 4º Trimestre de 2026"
              />
            </Field>
            <Field label="Data de início">
              <Input
                type="date"
                value={quarterForm.startDate}
                onChange={(event) =>
                  setQuarterForm({ ...quarterForm, startDate: event.target.value })
                }
              />
            </Field>
            <Field label="Data de término">
              <Input
                type="date"
                value={quarterForm.endDate}
                onChange={(event) =>
                  setQuarterForm({ ...quarterForm, endDate: event.target.value })
                }
              />
            </Field>
            {quarterEditing ? (
              <Field label="Situação">
                <select
                  value={quarterForm.status}
                  onChange={(event) =>
                    setQuarterForm({
                      ...quarterForm,
                      status: event.target.value as QuarterForm["status"],
                    })
                  }
                  className={SELECT_INPUT_CLASS}
                >
                  <option value="ABERTO">Aberto</option>
                  <option value="FECHADO">Fechado</option>
                </select>
              </Field>
            ) : null}
            <Field label="Observações" className={quarterEditing ? "" : "sm:col-span-2"}>
              <Input
                value={quarterForm.notes}
                onChange={(event) =>
                  setQuarterForm({ ...quarterForm, notes: event.target.value })
                }
                placeholder="Opcional"
              />
            </Field>
          </div>
          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuarterOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={submitQuarter} disabled={busy}>
              {busy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
              {quarterEditing ? "Salvar alterações" : "Criar trimestre"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog lição */}
      <Dialog open={lessonOpen} onOpenChange={setLessonOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{lessonEditing ? "Editar lição" : "Nova lição"}</DialogTitle>
            <DialogDescription>
              A lição é identificada pelo número dentro da classe e do trimestre.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Trimestre">
              <select
                value={lessonForm.quarterId}
                onChange={(event) =>
                  setLessonForm({ ...lessonForm, quarterId: event.target.value })
                }
                className={SELECT_INPUT_CLASS}
              >
                <option value="">Selecione</option>
                {quarters.map((quarter) => (
                  <option key={quarter.id} value={quarter.id}>
                    {quarter.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Classe">
              <select
                value={lessonForm.classId}
                onChange={(event) =>
                  setLessonForm({ ...lessonForm, classId: event.target.value })
                }
                className={SELECT_INPUT_CLASS}
              >
                <option value="">Selecione</option>
                {activeClasses.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Número da lição">
              <Input
                type="number"
                min={1}
                value={lessonForm.number}
                onChange={(event) =>
                  setLessonForm({ ...lessonForm, number: event.target.value })
                }
                placeholder="Ex.: 1"
              />
            </Field>
            <Field label="Data da lição">
              <Input
                type="date"
                value={lessonForm.date}
                onChange={(event) =>
                  setLessonForm({ ...lessonForm, date: event.target.value })
                }
              />
            </Field>
            <Field label="Título" className="sm:col-span-2">
              <Input
                value={lessonForm.title}
                onChange={(event) =>
                  setLessonForm({ ...lessonForm, title: event.target.value })
                }
                placeholder="Título da lição"
              />
            </Field>
            <Field label="Observação" className="sm:col-span-2">
              <Input
                value={lessonForm.notes}
                onChange={(event) =>
                  setLessonForm({ ...lessonForm, notes: event.target.value })
                }
                placeholder="Texto bíblico, objetivos, materiais..."
              />
            </Field>
          </div>
          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setLessonOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button
              onClick={submitLesson}
              disabled={
                busy ||
                !lessonForm.quarterId ||
                !lessonForm.classId ||
                !lessonForm.number ||
                !lessonForm.title.trim()
              }
            >
              {busy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
              {lessonEditing ? "Salvar alterações" : "Cadastrar lição"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Excluir trimestre */}
      <Dialog
        open={Boolean(quarterDeleting)}
        onOpenChange={(value) => !value && setQuarterDeleting(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir trimestre</DialogTitle>
            <DialogDescription>
              Excluir <strong>{quarterDeleting?.name}</strong> também remove todas as
              lições e chamadas vinculadas. Essa ação não pode ser desfeita.
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
              onClick={() => setQuarterDeleting(null)}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmQuarterDelete} disabled={busy}>
              {busy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Excluir lição */}
      <Dialog
        open={Boolean(lessonDeleting)}
        onOpenChange={(value) => !value && setLessonDeleting(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir lição</DialogTitle>
            <DialogDescription>
              Excluir a lição <strong>{lessonDeleting?.number} — {lessonDeleting?.title}</strong>?
              As chamadas registradas para ela também serão removidas.
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
              onClick={() => setLessonDeleting(null)}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmLessonDelete} disabled={busy}>
              {busy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
