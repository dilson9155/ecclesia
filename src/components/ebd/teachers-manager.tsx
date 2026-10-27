"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Power, Search, Trash2, UserPlus } from "lucide-react";
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
  createEbdTeacher,
  deleteEbdTeacher,
  setEbdTeacherActive,
  updateEbdTeacher,
} from "@/app/actions/ebd";
import type { EbdClassView, EbdMemberOption, EbdTeacherView } from "@/services/ebd.service";
import { EmptyState, Field, StatusPill } from "@/components/ebd/ebd-ui";

type Props = {
  teachers: EbdTeacherView[];
  classes: EbdClassView[];
  members: EbdMemberOption[];
  canManage: boolean;
};

export function TeachersManager({ teachers, classes, members, canManage }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ATIVO");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EbdTeacherView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<EbdTeacherView | null>(null);

  const [memberSearch, setMemberSearch] = useState("");
  const [form, setForm] = useState<{
    memberId: string;
    classIds: string[];
    active: boolean;
    notes: string;
  }>({ memberId: "", classIds: [], active: true, notes: "" });

  const availableMembers = useMemo(() => {
    const term = memberSearch.trim().toLowerCase();
    return members
      .filter((member) => !member.isTeacher)
      .filter((member) => {
        if (!term) return true;
        return (
          member.name.toLowerCase().includes(term) ||
          member.code.toLowerCase().includes(term) ||
          member.congregationName.toLowerCase().includes(term)
        );
      });
  }, [members, memberSearch]);

  const activeClasses = useMemo(
    () => classes.filter((item) => item.status === "ATIVO"),
    [classes]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return teachers.filter((teacher) => {
      if (classFilter && !teacher.classes.some((item) => item.id === classFilter)) {
        return false;
      }
      if (statusFilter !== "TODOS" && teacher.active !== (statusFilter === "ATIVO")) {
        return false;
      }
      if (!term) return true;
      return (
        teacher.name.toLowerCase().includes(term) ||
        teacher.code.toLowerCase().includes(term) ||
        teacher.classes.some((item) => item.name.toLowerCase().includes(term))
      );
    });
  }, [teachers, search, classFilter, statusFilter]);

  function openCreate() {
    setEditing(null);
    setForm({ memberId: "", classIds: [], active: true, notes: "" });
    setMemberSearch("");
    setError(null);
    setOpen(true);
  }

  function openEdit(teacher: EbdTeacherView) {
    setEditing(teacher);
    setForm({
      memberId: teacher.memberId,
      classIds: teacher.classes.map((item) => item.id),
      active: teacher.active,
      notes: teacher.notes ?? "",
    });
    setError(null);
    setOpen(true);
  }

  function toggleClass(classId: string) {
    setForm((current) => ({
      ...current,
      classIds: current.classIds.includes(classId)
        ? current.classIds.filter((id) => id !== classId)
        : [...current.classIds, classId],
    }));
  }

  async function submit() {
    setBusy(true);
    setError(null);
    const result = editing
      ? await updateEbdTeacher(editing.id, {
          classIds: form.classIds,
          active: form.active,
          notes: form.notes || null,
        })
      : await createEbdTeacher({
          memberId: form.memberId,
          classIds: form.classIds,
          notes: form.notes || null,
        });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  async function toggleActive(teacher: EbdTeacherView) {
    setBusy(true);
    setError(null);
    const result = await setEbdTeacherActive(teacher.id, !teacher.active);
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
    const result = await deleteEbdTeacher(deleting.id);
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
      <div className="ebd-panel flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <div className="relative sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar professor..."
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
        {canManage ? (
          <Button onClick={openCreate} className="shrink-0">
            <UserPlus className="mr-1.5 size-4" />
            Novo professor
          </Button>
        ) : null}
      </div>

      {error && !open && !deleting ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState message="Nenhum professor encontrado para os filtros selecionados." />
      ) : (
        <div className="ebd-table-shell">
          <table className="ebd-table min-w-[520px] lg:min-w-[780px]">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Professor</th>
                <th className="px-3 py-2 font-medium">Classes com autonomia</th>
                <th className="hidden px-3 py-2 font-medium lg:table-cell">Telefone</th>
                <th className="px-3 py-2 font-medium">Status</th>
                {canManage ? <th className="px-3 py-2 text-right font-medium">Ações</th> : null}
              </tr>
            </thead>
            <tbody>
              {filtered.map((teacher) => (
                <tr key={teacher.id} className="border-t">
                  <td className="px-3 py-2">
                    <p className="font-medium">{teacher.name}</p>
                    <p className="text-xs text-muted-foreground">Matrícula {teacher.code}</p>
                  </td>
                  <td className="px-3 py-2">
                    {teacher.classes.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {teacher.classes.map((item) => (
                          <span
                            key={item.id}
                            className="rounded-full border bg-muted/40 px-2 py-0.5 text-xs"
                          >
                            {item.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="hidden px-3 py-2 text-muted-foreground lg:table-cell">
                    {teacher.phone || "—"}
                  </td>
                  <td className="px-3 py-2">
                    <StatusPill active={teacher.active} />
                  </td>
                  {canManage ? (
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title={teacher.active ? "Inativar professor" : "Ativar professor"}
                          onClick={() => toggleActive(teacher)}
                          disabled={busy}
                        >
                          <Power
                            className={`size-4 ${
                              teacher.active ? "text-emerald-600" : "text-slate-400"
                            }`}
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Editar"
                          onClick={() => openEdit(teacher)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Excluir"
                          onClick={() => {
                            setError(null);
                            setDeleting(teacher);
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar professor" : "Novo professor"}</DialogTitle>
            <DialogDescription>
              Selecione o membro e as classes em que ele(a) tem autonomia para lecionar.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            {!editing ? (
              <>
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
                      ? "Todos os membros ativos já estão cadastrados como professores."
                      : undefined
                  }
                >
                  <select
                    value={form.memberId}
                    onChange={(event) =>
                      setForm({ ...form, memberId: event.target.value })
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
              </>
            ) : (
              <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                <p className="font-medium">{editing.name}</p>
                <p className="text-xs text-muted-foreground">
                  Matrícula {editing.code}
                </p>
              </div>
            )}

            <Field
              label="Classes com autonomia"
              hint="Marque todas as classes em que este professor pode lecionar."
            >
              {activeClasses.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma classe ativa cadastrada. Cadastre uma classe antes.
                </p>
              ) : (
                <div className="grid max-h-52 gap-2 overflow-y-auto rounded-lg border p-2 sm:grid-cols-2">
                  {activeClasses.map((item) => (
                    <label
                      key={item.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
                    >
                      <input
                        type="checkbox"
                        className="size-4 rounded border-input accent-primary"
                        checked={form.classIds.includes(item.id)}
                        onChange={() => toggleClass(item.id)}
                      />
                      <span className="min-w-0">
                        <span className="block truncate">{item.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {item.congregationName}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </Field>

            {editing ? (
              <Field label="Situação">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-input accent-primary"
                    checked={form.active}
                    onChange={(event) =>
                      setForm({ ...form, active: event.target.checked })
                    }
                  />
                  Professor ativo na EBD
                </label>
              </Field>
            ) : null}

            <Field label="Observações">
              <Input
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
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
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button
              onClick={submit}
              disabled={busy || (!editing && (!form.memberId || form.classIds.length === 0))}
            >
              {busy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
              {editing ? "Salvar alterações" : "Cadastrar professor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleting)} onOpenChange={(value) => !value && setDeleting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir professor</DialogTitle>
            <DialogDescription>
              Remover <strong>{deleting?.name}</strong> do cadastro de professores da
              EBD? O cadastro de membro é mantido.
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
    </div>
  );
}
