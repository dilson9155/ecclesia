"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRightLeft,
  Loader2,
  Pencil,
  Power,
  Search,
  Trash2,
  UserPlus,
  Users,
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
  deleteEbdStudent,
  enrollEbdStudent,
  enrollNewEbdStudent,
  setEbdStudentActive,
  updateEbdStudent,
} from "@/app/actions/ebd";
import type {
  EbdMemberOption,
  EbdStudentView,
} from "@/services/ebd.service";
import { EmptyState, Field, StatusPill } from "@/components/ebd/ebd-ui";

type ClassOption = {
  id: string;
  name: string;
  congregationId: string;
  status: "ATIVO" | "INATIVO";
  activeStudentCount: number;
  maxStudents: number;
};

type Props = {
  students: EbdStudentView[];
  classes: ClassOption[];
  members: EbdMemberOption[];
  congregations: Array<{ id: string; name: string }>;
  canManage: boolean;
};

type Mode = "existing" | "new";

function formatDate(value: string | null) {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

export function StudentsManager({
  students,
  classes,
  members,
  congregations,
  canManage,
}: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ATIVO");

  const [addOpen, setAddOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("existing");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [memberSearch, setMemberSearch] = useState("");
  const [existing, setExisting] = useState({ memberId: "", classId: "" });
  const [newStudent, setNewStudent] = useState({
    name: "",
    congregationId: congregations[0]?.id ?? "",
    classId: "",
    birthDate: "",
    phone: "",
    notes: "",
  });

  const [editing, setEditing] = useState<EbdStudentView | null>(null);
  const [editForm, setEditForm] = useState({
    classId: "",
    active: true,
    notes: "",
  });
  const [deleting, setDeleting] = useState<EbdStudentView | null>(null);

  const availableMembers = useMemo(() => {
    const term = memberSearch.trim().toLowerCase();
    return members
      .filter((member) => !member.isStudent)
      .filter((member) => {
        if (!term) return true;
        return (
          member.name.toLowerCase().includes(term) ||
          member.code.toLowerCase().includes(term) ||
          member.congregationName.toLowerCase().includes(term)
        );
      });
  }, [members, memberSearch]);

  const selectedMember = members.find((member) => member.id === existing.memberId);

  const classesForMember = useMemo(() => {
    const congregationId = selectedMember?.congregationId;
    if (!congregationId) return classes;
    const filtered = classes.filter(
      (item) => item.congregationId === congregationId
    );
    return filtered.length > 0 ? filtered : classes;
  }, [classes, selectedMember]);

  const classesForNew = useMemo(() => {
    if (!newStudent.congregationId) return classes;
    const filtered = classes.filter(
      (item) => item.congregationId === newStudent.congregationId
    );
    return filtered.length > 0 ? filtered : classes;
  }, [classes, newStudent.congregationId]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return students.filter((student) => {
      if (classFilter && student.classId !== classFilter) return false;
      if (statusFilter !== "TODOS" && student.active !== (statusFilter === "ATIVO")) {
        return false;
      }
      if (!term) return true;
      return (
        student.name.toLowerCase().includes(term) ||
        student.code.toLowerCase().includes(term) ||
        student.className.toLowerCase().includes(term)
      );
    });
  }, [students, search, classFilter, statusFilter]);

  function openAdd(nextMode: Mode) {
    setMode(nextMode);
    setError(null);
    setSuccess(null);
    setMemberSearch("");
    setExisting({ memberId: "", classId: "" });
    setNewStudent({
      name: "",
      congregationId: congregations[0]?.id ?? "",
      classId: "",
      birthDate: "",
      phone: "",
      notes: "",
    });
    setAddOpen(true);
  }

  async function submitAdd() {
    setBusy(true);
    setError(null);
    const result =
      mode === "existing"
        ? await enrollEbdStudent({
            memberId: existing.memberId,
            classId: existing.classId,
          })
        : await enrollNewEbdStudent({
            name: newStudent.name,
            congregationId: newStudent.congregationId,
            classId: newStudent.classId,
            birthDate: newStudent.birthDate || null,
            phone: newStudent.phone || null,
            notes: newStudent.notes || null,
          });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setAddOpen(false);
    setSuccess(
      mode === "existing"
        ? "Aluno vinculado à EBD com sucesso."
        : "Novo aluno cadastrado e matriculado na EBD."
    );
    router.refresh();
  }

  function openEdit(student: EbdStudentView) {
    setEditing(student);
    setError(null);
    setEditForm({
      classId: student.classId,
      active: student.active,
      notes: student.notes ?? "",
    });
  }

  async function submitEdit() {
    if (!editing) return;
    setBusy(true);
    setError(null);
    const result = await updateEbdStudent(editing.id, editForm);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setEditing(null);
    router.refresh();
  }

  async function toggleActive(student: EbdStudentView) {
    setBusy(true);
    setError(null);
    const result = await setEbdStudentActive(student.id, !student.active);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    setError(null);
    const result = await deleteEbdStudent(deleting.id);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDeleting(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {canManage ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => openAdd("existing")}
            className="group flex items-start gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/40"
          >
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UserPlus className="size-4" />
            </span>
            <span>
              <span className="block text-sm font-semibold">Adicionar aluno</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Vincule um membro já cadastrado e escolha a classe da EBD.
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => openAdd("new")}
            className="group flex items-start gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/40"
          >
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <Users className="size-4" />
            </span>
            <span>
              <span className="block text-sm font-semibold">Cadastrar novo aluno</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Crie o membro e já matricule na classe em um único passo.
              </span>
            </span>
          </button>
        </div>
      ) : null}

      {success ? (
        <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </p>
      ) : null}
      {error && !addOpen && !editing && !deleting ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar aluno por nome, matrícula..."
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
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className={`${SELECT_INPUT_CLASS} sm:max-w-40`}
        >
          <option value="ATIVO">Ativos</option>
          <option value="INATIVO">Inativos</option>
          <option value="TODOS">Todos</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="Nenhum aluno encontrado para os filtros selecionados." />
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Aluno</th>
                <th className="px-3 py-2 font-medium">Classe</th>
                <th className="px-3 py-2 font-medium">Congregação</th>
                <th className="px-3 py-2 font-medium">Nascimento</th>
                <th className="px-3 py-2 font-medium">Telefone</th>
                <th className="px-3 py-2 font-medium">Status</th>
                {canManage ? <th className="px-3 py-2 text-right font-medium">Ações</th> : null}
              </tr>
            </thead>
            <tbody>
              {filtered.map((student) => (
                <tr key={student.id} className="border-t">
                  <td className="px-3 py-2">
                    <p className="font-medium">{student.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Matrícula {student.code}
                    </p>
                  </td>
                  <td className="px-3 py-2">{student.className}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {student.congregationName}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {formatDate(student.birthDate)}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {student.phone || "—"}
                  </td>
                  <td className="px-3 py-2">
                    <StatusPill active={student.active} />
                  </td>
                  {canManage ? (
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title={student.active ? "Inativar aluno" : "Ativar aluno"}
                          onClick={() => toggleActive(student)}
                          disabled={busy}
                        >
                          <Power
                            className={`size-4 ${
                              student.active ? "text-emerald-600" : "text-slate-400"
                            }`}
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Editar / trocar de classe"
                          onClick={() => openEdit(student)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Remover da EBD"
                          onClick={() => {
                            setError(null);
                            setDeleting(student);
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

      {/* Adicionar aluno */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Adicionar aluno</DialogTitle>
            <DialogDescription>
              Vincule um membro existente ou cadastre uma nova pessoa já com a
              matrícula na EBD.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-1 rounded-lg border bg-muted/30 p-1">
            <button
              type="button"
              onClick={() => {
                setMode("existing");
                setError(null);
              }}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${
                mode === "existing"
                  ? "bg-background shadow-sm ring-1 ring-foreground/10"
                  : "text-muted-foreground"
              }`}
            >
              Membro cadastrado
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("new");
                setError(null);
              }}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${
                mode === "new"
                  ? "bg-background shadow-sm ring-1 ring-foreground/10"
                  : "text-muted-foreground"
              }`}
            >
              Novo membro
            </button>
          </div>

          {mode === "existing" ? (
            <div className="grid gap-3">
              <Field label="Buscar membro">
                <Input
                  value={memberSearch}
                  onChange={(event) => setMemberSearch(event.target.value)}
                  placeholder="Nome, matrícula ou congregação"
                />
              </Field>
              <Field
                label="Membro"
                hint={
                  availableMembers.length === 0
                    ? "Todos os membros ativos já estão matriculados na EBD."
                    : undefined
                }
              >
                <select
                  value={existing.memberId}
                  onChange={(event) =>
                    setExisting({ memberId: event.target.value, classId: "" })
                  }
                  className={SELECT_INPUT_CLASS}
                >
                  <option value="">Selecione o membro</option>
                  {availableMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} · {member.code} · {member.congregationName}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Classe">
                <select
                  value={existing.classId}
                  onChange={(event) =>
                    setExisting({ ...existing, classId: event.target.value })
                  }
                  className={SELECT_INPUT_CLASS}
                  disabled={!existing.memberId}
                >
                  <option value="">Selecione a classe</option>
                  {classesForMember.map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                      disabled={
                        item.status !== "ATIVO" ||
                        item.activeStudentCount >= item.maxStudents
                      }
                    >
                      {item.name} ({item.activeStudentCount}/{item.maxStudents})
                      {item.status !== "ATIVO" ? " — inativa" : ""}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome completo" className="sm:col-span-2">
                <Input
                  value={newStudent.name}
                  onChange={(event) =>
                    setNewStudent({ ...newStudent, name: event.target.value })
                  }
                  placeholder="Nome do novo aluno"
                />
              </Field>
              <Field label="Congregação">
                <select
                  value={newStudent.congregationId}
                  onChange={(event) =>
                    setNewStudent({
                      ...newStudent,
                      congregationId: event.target.value,
                      classId: "",
                    })
                  }
                  className={SELECT_INPUT_CLASS}
                >
                  <option value="">Selecione</option>
                  {congregations.map((congregation) => (
                    <option key={congregation.id} value={congregation.id}>
                      {congregation.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Classe">
                <select
                  value={newStudent.classId}
                  onChange={(event) =>
                    setNewStudent({ ...newStudent, classId: event.target.value })
                  }
                  className={SELECT_INPUT_CLASS}
                  disabled={!newStudent.congregationId}
                >
                  <option value="">Selecione a classe</option>
                  {classesForNew.map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                      disabled={
                        item.status !== "ATIVO" ||
                        item.activeStudentCount >= item.maxStudents
                      }
                    >
                      {item.name} ({item.activeStudentCount}/{item.maxStudents})
                      {item.status !== "ATIVO" ? " — inativa" : ""}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Nascimento">
                <Input
                  type="date"
                  value={newStudent.birthDate}
                  onChange={(event) =>
                    setNewStudent({ ...newStudent, birthDate: event.target.value })
                  }
                />
              </Field>
              <Field label="Telefone">
                <Input
                  value={newStudent.phone}
                  onChange={(event) =>
                    setNewStudent({ ...newStudent, phone: event.target.value })
                  }
                  placeholder="(00) 00000-0000"
                />
              </Field>
              <Field label="Observações" className="sm:col-span-2">
                <Input
                  value={newStudent.notes}
                  onChange={(event) =>
                    setNewStudent({ ...newStudent, notes: event.target.value })
                  }
                  placeholder="Opcional"
                />
              </Field>
            </div>
          )}

          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button
              onClick={submitAdd}
              disabled={
                busy ||
                (mode === "existing"
                  ? !existing.memberId || !existing.classId
                  : !newStudent.name.trim() ||
                    !newStudent.congregationId ||
                    !newStudent.classId)
              }
            >
              {busy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
              {mode === "existing" ? "Vincular aluno" : "Cadastrar aluno"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editar aluno */}
      <Dialog open={Boolean(editing)} onOpenChange={(value) => !value && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar aluno</DialogTitle>
            <DialogDescription>
              {editing ? `${editing.name} · matrícula ${editing.code}` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <Field label="Classe">
              <select
                value={editForm.classId}
                onChange={(event) =>
                  setEditForm({ ...editForm, classId: event.target.value })
                }
                className={SELECT_INPUT_CLASS}
              >
                {classes.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                    disabled={
                      item.id !== editForm.classId &&
                      (item.status !== "ATIVO" ||
                        item.activeStudentCount >= item.maxStudents)
                    }
                  >
                    {item.name} ({item.activeStudentCount}/{item.maxStudents})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Situação">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 rounded border-input accent-primary"
                  checked={editForm.active}
                  onChange={(event) =>
                    setEditForm({ ...editForm, active: event.target.checked })
                  }
                />
                Aluno ativo na EBD
              </label>
            </Field>
            <Field label="Observações">
              <Input
                value={editForm.notes}
                onChange={(event) =>
                  setEditForm({ ...editForm, notes: event.target.value })
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
            <Button variant="outline" onClick={() => setEditing(null)} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={submitEdit} disabled={busy}>
              {busy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Excluir aluno */}
      <Dialog open={Boolean(deleting)} onOpenChange={(value) => !value && setDeleting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remover aluno da EBD</DialogTitle>
            <DialogDescription>
              <strong>{deleting?.name}</strong> será removido(a) da EBD. O cadastro de
              membro é mantido, mas as pontuações deste aluno nas chamadas já
              registradas também serão removidas.
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
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ArrowRightLeft className="size-3.5" />
        Ao trocar de classe, a capacidade máxima da classe de destino é verificada.
      </p>
    </div>
  );
}
