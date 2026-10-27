"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Search, Trash2, Users } from "lucide-react";
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
  createEbdClass,
  deleteEbdClass,
  updateEbdClass,
} from "@/app/actions/ebd";
import type { EbdClassView } from "@/services/ebd.service";
import { EmptyState, Field, StatusPill } from "@/components/ebd/ebd-ui";

type Props = {
  classes: EbdClassView[];
  congregations: Array<{ id: string; name: string }>;
  canManage: boolean;
};

type FormState = {
  name: string;
  congregationId: string;
  ageRange: string;
  maxStudents: string;
  status: "ATIVO" | "INATIVO";
  description: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  congregationId: "",
  ageRange: "",
  maxStudents: "30",
  status: "ATIVO",
  description: "",
};

export function ClassesManager({ classes, congregations, canManage }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EbdClassView | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleting, setDeleting] = useState<EbdClassView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("TODAS");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return classes.filter((item) => {
      if (status !== "TODAS" && item.status !== status) return false;
      if (!term) return true;
      return (
        item.name.toLowerCase().includes(term) ||
        item.congregationName.toLowerCase().includes(term) ||
        (item.ageRange ?? "").toLowerCase().includes(term)
      );
    });
  }, [classes, search, status]);

  function openCreate() {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      congregationId: congregations[0]?.id ?? "",
    });
    setError(null);
    setOpen(true);
  }

  function openEdit(item: EbdClassView) {
    setEditing(item);
    setForm({
      name: item.name,
      congregationId: item.congregationId,
      ageRange: item.ageRange ?? "",
      maxStudents: String(item.maxStudents),
      status: item.status,
      description: item.description ?? "",
    });
    setError(null);
    setOpen(true);
  }

  async function submit() {
    setBusy(true);
    setError(null);
    const payload = {
      name: form.name,
      congregationId: form.congregationId,
      ageRange: form.ageRange,
      maxStudents: Number(form.maxStudents),
      status: form.status,
      description: form.description,
    };
    const result = editing
      ? await updateEbdClass(editing.id, payload)
      : await createEbdClass(payload);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    setError(null);
    const result = await deleteEbdClass(deleting.id);
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
              placeholder="Buscar classe..."
              className="pl-8"
            />
          </div>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className={`${SELECT_INPUT_CLASS} sm:max-w-40`}
          >
            <option value="TODAS">Todos os status</option>
            <option value="ATIVO">Ativas</option>
            <option value="INATIVO">Inativas</option>
          </select>
        </div>
        {canManage ? (
          <Button onClick={openCreate} className="shrink-0">
            <Plus className="mr-1.5 size-4" />
            Nova classe
          </Button>
        ) : null}
      </div>

      {error && !open && !deleting ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState message="Nenhuma classe encontrada. Cadastre a primeira classe da EBD." />
      ) : (
        <div className="ebd-table-shell">
          <table className="ebd-table min-w-[620px] lg:min-w-[860px]">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Classe</th>
                <th className="px-3 py-2 font-medium">Congregação</th>
                <th className="hidden px-3 py-2 font-medium lg:table-cell">Faixa etária</th>
                <th className="px-3 py-2 font-medium">Alunos</th>
                <th className="hidden px-3 py-2 font-medium xl:table-cell">Professores</th>
                <th className="hidden px-3 py-2 font-medium lg:table-cell">Lições</th>
                <th className="px-3 py-2 font-medium">Status</th>
                {canManage ? <th className="px-3 py-2 font-medium text-right">Ações</th> : null}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const full = item.activeStudentCount >= item.maxStudents;
                return (
                  <tr key={item.id} className="border-t align-top">
                    <td className="px-3 py-2">
                      <p className="font-medium">{item.name}</p>
                      {item.description ? (
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{item.congregationName}</td>
                    <td className="hidden px-3 py-2 text-muted-foreground lg:table-cell">
                      {item.ageRange || "—"}
                    </td>
                    <td className="px-3 py-2">
                      <span className={full ? "font-medium text-amber-600" : ""}>
                        {item.activeStudentCount}/{item.maxStudents}
                      </span>
                      {item.studentCount !== item.activeStudentCount ? (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({item.studentCount} no total)
                        </span>
                      ) : null}
                    </td>
                    <td className="hidden px-3 py-2 text-muted-foreground xl:table-cell">
                      {item.teachers.length > 0
                        ? item.teachers.map((teacher) => teacher.name).join(", ")
                        : "—"}
                    </td>
                    <td className="hidden px-3 py-2 text-muted-foreground lg:table-cell">
                      {item.lessonCount}
                    </td>
                    <td className="px-3 py-2">
                      <StatusPill active={item.status === "ATIVO"} />
                    </td>
                    {canManage ? (
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Editar"
                            onClick={() => openEdit(item)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Excluir"
                            onClick={() => {
                              setError(null);
                              setDeleting(item);
                            }}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Users className="size-3.5" />
        A capacidade máxima da classe é validada ao matricular ou reativar alunos.
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar classe" : "Nova classe"}</DialogTitle>
            <DialogDescription>
              Defina a congregação, a faixa etária e o limite de alunos da turma.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome da classe" className="sm:col-span-2">
              <Input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Ex.: Adultos, Juvenis, Infantil"
              />
            </Field>
            <Field label="Congregação">
              <select
                value={form.congregationId}
                onChange={(event) =>
                  setForm({ ...form, congregationId: event.target.value })
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
            <Field label="Faixa etária">
              <Input
                value={form.ageRange}
                onChange={(event) => setForm({ ...form, ageRange: event.target.value })}
                placeholder="Ex.: 18 a 35 anos"
              />
            </Field>
            <Field label="Máximo de alunos">
              <Input
                type="number"
                min={1}
                max={500}
                value={form.maxStudents}
                onChange={(event) =>
                  setForm({ ...form, maxStudents: event.target.value })
                }
              />
            </Field>
            <Field label="Status">
              <select
                value={form.status}
                onChange={(event) =>
                  setForm({ ...form, status: event.target.value as FormState["status"] })
                }
                className={SELECT_INPUT_CLASS}
              >
                <option value="ATIVO">Ativa</option>
                <option value="INATIVO">Inativa</option>
              </select>
            </Field>
            <Field label="Observações" className="sm:col-span-2">
              <Input
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                placeholder="Informações complementares (opcional)"
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
            <Button onClick={submit} disabled={busy}>
              {busy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
              {editing ? "Salvar alterações" : "Criar classe"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleting)} onOpenChange={(value) => !value && setDeleting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir classe</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a classe <strong>{deleting?.name}</strong>?
              Essa ação não pode ser desfeita.
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
