"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  Power,
  UserRound,
} from "lucide-react";
import {
  createEbdTeacherUserAction,
  createUserAction,
  updateUserAction,
  toggleUserActiveAction,
  resetUserPasswordAction,
} from "@/app/actions/users";
import type {
  UserListItem,
  ManagerData,
} from "@/services/users.service";
import { ROLE_LABELS } from "@/modules/users/roles";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Props = {
  users: UserListItem[];
  managerData: ManagerData;
  canManage: boolean;
  currentUserId: string;
};

type FormState = {
  name: string;
  email: string;
  roleId: string;
  sedeId: string;
  congregationId: string;
  password: string;
  passwordConfirm: string;
  active: boolean;
  ebdClassIds: string[];
};

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  roleId: "",
  sedeId: "",
  congregationId: "",
  password: "",
  passwordConfirm: "",
  active: true,
  ebdClassIds: [],
};

type TeacherFormState = {
  teacherId: string;
  email: string;
  password: string;
  passwordConfirm: string;
  active: boolean;
  classIds: string[];
};

const EMPTY_TEACHER_FORM: TeacherFormState = {
  teacherId: "",
  email: "",
  password: "",
  passwordConfirm: "",
  active: true,
  classIds: [],
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function UsuariosManager({
  users,
  managerData,
  canManage,
  currentUserId,
}: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UserListItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<UserListItem | null>(null);
  const [resetPassword, setResetPassword] = useState("");

  const [teacherDialogOpen, setTeacherDialogOpen] = useState(false);
  const [teacherForm, setTeacherForm] =
    useState<TeacherFormState>(EMPTY_TEACHER_FORM);

  const isCreate = editing === null;
  const isSelfEdit = editing !== null && editing.id === currentUserId;
  const isEbdTeacherEdit = editing?.ebdTeacher != null;

  const availableTeachers = useMemo(
    () => managerData.ebdTeachers.filter((t) => t.active && !t.hasUser),
    [managerData.ebdTeachers]
  );

  const selectedTeacher = useMemo(
    () =>
      managerData.ebdTeachers.find((t) => t.id === teacherForm.teacherId) ??
      null,
    [managerData.ebdTeachers, teacherForm.teacherId]
  );

  const teacherClassOptions = useMemo(() => {
    if (selectedTeacher) {
      return managerData.ebdClasses.filter(
        (c) => c.congregationId === selectedTeacher.congregationId
      );
    }
    return [];
  }, [managerData.ebdClasses, selectedTeacher]);

  const editClassOptions = useMemo(() => {
    if (!editing?.congregationId) return [];
    return managerData.ebdClasses.filter(
      (c) => c.congregationId === editing.congregationId
    );
  }, [managerData.ebdClasses, editing]);

  const filteredCongregations = useMemo(
    () =>
      managerData.congregations.filter(
        (c) => !form.sedeId || c.sedeId === form.sedeId
      ),
    [managerData.congregations, form.sedeId]
  );

  function openCreate() {
    const defaultRole = managerData.roles[0];
    const defaultSede = managerData.sedes[0]?.value ?? "";
    setEditing(null);
    setError(null);
    setForm({
      ...EMPTY_FORM,
      roleId: defaultRole?.id ?? "",
      sedeId: defaultSede,
    });
    setDialogOpen(true);
  }

  function openEdit(row: UserListItem) {
    setEditing(row);
    setError(null);
    const selectedRoleId = row.ebdTeacher
      ? managerData.professorRoleId ?? ""
      : row.roleIds.find((id) => managerData.roles.some((r) => r.id === id)) ??
        managerData.roles[0]?.id ??
        "";
    const selectedSede =
      row.sedeId ??
      managerData.sedes.find((s) =>
        managerData.congregations.some(
          (c) => c.value === row.congregationId && c.sedeId === s.value
        )
      )?.value ??
      managerData.sedes[0]?.value ??
      "";
    setForm({
      name: row.name,
      email: row.email,
      roleId: selectedRoleId,
      sedeId: selectedSede,
      congregationId: row.congregationId ?? "",
      password: "",
      passwordConfirm: "",
      active: row.active,
      ebdClassIds: row.ebdTeacher?.classes.map((c) => c.id) ?? [],
    });
    setDialogOpen(true);
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit() {
    setBusy(true);
    setError(null);

    if (!form.name.trim()) {
      setError("Informe o nome do usuário.");
      setBusy(false);
      return;
    }
    if (form.password !== form.passwordConfirm) {
      setError("A senha e a confirmação não conferem.");
      setBusy(false);
      return;
    }
    if (isCreate && form.password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres.");
      setBusy(false);
      return;
    }

    const base = {
      name: form.name.trim(),
      email: form.email.trim(),
    };

    if (isCreate) {
      const result = await createUserAction({
        ...base,
        password: form.password,
        roleId: form.roleId,
        sedeId: form.sedeId || null,
        congregationId: form.congregationId || null,
        active: form.active,
      });
      setBusy(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
    } else {
      const result = await updateUserAction(editing!.id, {
        ...base,
        roleId: isSelfEdit ? undefined : form.roleId || undefined,
        sedeId: isSelfEdit ? undefined : form.sedeId || null,
        congregationId: isSelfEdit ? undefined : form.congregationId || null,
        active: isSelfEdit ? undefined : form.active,
        password: form.password || undefined,
        ebdClassIds: isEbdTeacherEdit ? form.ebdClassIds : undefined,
      });
      setBusy(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
    }

    setDialogOpen(false);
    router.refresh();
  }

  async function handleToggle(row: UserListItem) {
    setBusy(true);
    setError(null);
    const result = await toggleUserActiveAction(row.id);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleResetPassword() {
    if (!resetTarget) return;
    setBusy(true);
    setError(null);
    if (resetPassword.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres.");
      setBusy(false);
      return;
    }
    const result = await resetUserPasswordAction(resetTarget.id, resetPassword);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setResetTarget(null);
    setResetPassword("");
    router.refresh();
  }

  function openTeacherCreate() {
    setError(null);
    setTeacherForm(EMPTY_TEACHER_FORM);
    setTeacherDialogOpen(true);
  }

  function selectTeacher(teacherId: string) {
    const teacher =
      managerData.ebdTeachers.find((t) => t.id === teacherId) ?? null;
    setTeacherForm((current) => ({
      ...current,
      teacherId,
      email: teacher?.email ?? "",
      classIds: teacher?.classes.map((c) => c.id) ?? [],
    }));
  }

  function toggleTeacherClass(classId: string) {
    setTeacherForm((current) => ({
      ...current,
      classIds: current.classIds.includes(classId)
        ? current.classIds.filter((id) => id !== classId)
        : [...current.classIds, classId],
    }));
  }

  function toggleFormClass(classId: string) {
    setForm((current) => ({
      ...current,
      ebdClassIds: current.ebdClassIds.includes(classId)
        ? current.ebdClassIds.filter((id) => id !== classId)
        : [...current.ebdClassIds, classId],
    }));
  }

  async function handleTeacherSubmit() {
    setBusy(true);
    setError(null);

    if (!teacherForm.teacherId) {
      setError("Selecione o professor da EBD.");
      setBusy(false);
      return;
    }
    if (!teacherForm.email.trim()) {
      setError("Informe o e-mail de acesso do professor.");
      setBusy(false);
      return;
    }
    if (teacherForm.password !== teacherForm.passwordConfirm) {
      setError("A senha e a confirmação não conferem.");
      setBusy(false);
      return;
    }
    if (teacherForm.password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres.");
      setBusy(false);
      return;
    }
    if (teacherForm.classIds.length === 0) {
      setError("Selecione pelo menos uma classe para o professor.");
      setBusy(false);
      return;
    }

    const result = await createEbdTeacherUserAction({
      teacherId: teacherForm.teacherId,
      email: teacherForm.email.trim(),
      password: teacherForm.password,
      classIds: teacherForm.classIds,
      active: teacherForm.active,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setTeacherDialogOpen(false);
    setTeacherForm(EMPTY_TEACHER_FORM);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Usuários
          </h1>
          <p className="text-sm text-muted-foreground">
            Acessos ao sistema com e-mail, senha e permissões por sede e
            congregação. Professores da EBD acessam somente o módulo EBD e as
            classes vinculadas.
          </p>
        </div>
        {canManage && (
          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              variant="outline"
              onClick={openTeacherCreate}
              className="w-full sm:w-auto"
            >
              <GraduationCap className="mr-2 h-4 w-4" />
              Novo professor EBD
            </Button>
            <Button onClick={openCreate} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Novo usuário
            </Button>
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="space-y-2 md:hidden">
        {users.length === 0 ? (
          <div className="rounded-lg border bg-card px-3 py-8 text-center text-sm text-muted-foreground">
            Nenhum usuário cadastrado.
          </div>
        ) : (
          users.map((row) => (
            <div
              key={row.id}
              className="rounded-lg border bg-card p-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
                    <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
                    {row.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {row.email}
                  </p>
                </div>
                <Badge
                  variant={row.active ? "default" : "secondary"}
                  className="shrink-0"
                >
                  {row.active ? "Ativo" : "Inativo"}
                </Badge>
              </div>

              <div className="mt-2 flex flex-wrap gap-1">
                {row.roles.map((r) => (
                  <Badge key={r} variant="outline">
                    {ROLE_LABELS[r] ?? r}
                  </Badge>
                ))}
                {row.ebdTeacher && (
                  <Badge variant="secondary">
                    EBD:{" "}
                    {row.ebdTeacher.classes.length > 0
                      ? row.ebdTeacher.classes.map((c) => c.name).join(", ")
                      : "sem classe"}
                  </Badge>
                )}
                {row.id === currentUserId && (
                  <Badge variant="secondary">Você</Badge>
                )}
              </div>

              <dl className="mt-2 grid grid-cols-2 gap-1 text-xs">
                <div>
                  <dt className="text-muted-foreground">Sede</dt>
                  <dd className="truncate font-medium">{row.sedeName ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Congregação</dt>
                  <dd className="truncate font-medium">
                    {row.congregationName ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Último acesso</dt>
                  <dd className="font-medium">{formatDate(row.lastLoginAt)}</dd>
                </div>
              </dl>

              {canManage && (
                <div className="mt-3 flex flex-wrap items-center justify-end gap-1 border-t pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    disabled={busy}
                    onClick={() => setResetTarget(row)}
                  >
                    <KeyRound className="mr-1 h-3.5 w-3.5" />
                    Senha
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    disabled={busy}
                    onClick={() => openEdit(row)}
                  >
                    <Pencil className="mr-1 h-3.5 w-3.5" />
                    Editar
                  </Button>
                  {row.id !== currentUserId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      disabled={busy}
                      onClick={() => handleToggle(row)}
                    >
                      <Power
                        className={`mr-1 h-3.5 w-3.5 ${row.active ? "text-destructive" : "text-emerald-600"}`}
                      />
                      {row.active ? "Desativar" : "Ativar"}
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="hidden rounded-md border md:block">
        <Table className="border-separate border-spacing-0">
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Sede</TableHead>
              <TableHead>Congregação</TableHead>
              <TableHead>Último acesso</TableHead>
              <TableHead>Situação</TableHead>
              {canManage && (
                <TableHead className="sticky right-0 bg-muted text-right shadow-[-6px_0_12px_-8px_rgba(0,0,0,0.35)]">
                  Ações
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canManage ? 8 : 7}
                  className="h-24 text-center text-muted-foreground"
                >
                  Nenhum usuário cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              users.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <UserRound className="h-4 w-4 text-muted-foreground" />
                      {row.name}
                      {row.id === currentUserId && (
                        <Badge variant="secondary">Você</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{row.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {row.roles.map((r) => (
                        <Badge key={r} variant="outline">
                          {ROLE_LABELS[r] ?? r}
                        </Badge>
                      ))}
                      {row.ebdTeacher && (
                        <Badge variant="secondary">
                          EBD:{" "}
                          {row.ebdTeacher.classes.length > 0
                            ? row.ebdTeacher.classes
                                .map((c) => c.name)
                                .join(", ")
                            : "sem classe"}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{row.sedeName ?? "—"}</TableCell>
                  <TableCell>{row.congregationName ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(row.lastLoginAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.active ? "default" : "secondary"}>
                      {row.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  {canManage && (
                    <TableCell className="sticky right-0 bg-background text-right shadow-[-6px_0_12px_-8px_rgba(0,0,0,0.35)]">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          disabled={busy}
                          onClick={() => setResetTarget(row)}
                        >
                          <KeyRound className="mr-1 h-3.5 w-3.5" />
                          Senha
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={busy}
                          onClick={() => openEdit(row)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {row.id !== currentUserId && (
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={busy}
                            title={
                              row.active ? "Desativar acesso" : "Ativar acesso"
                            }
                            onClick={() => handleToggle(row)}
                          >
                            <Power
                              className={`h-4 w-4 ${row.active ? "text-destructive" : "text-emerald-600"}`}
                            />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isCreate ? "Novo usuário" : `Editar usuário`}
            </DialogTitle>
            <DialogDescription>
              {isCreate
                ? "Cadastre o e-mail, a senha e a permissão de acesso."
                : "Atualize os dados de acesso. Para manter a senha atual, deixe os campos de senha em branco."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="nome">Nome completo</Label>
              <Input
                id="nome"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="Ex.: Maria da Silva"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="usuario@igreja.com.br"
              />
            </div>

            <div className="space-y-1">
              <Label>Papel / perfil de acesso</Label>
              {isEbdTeacherEdit ? (
                <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                  <p className="font-medium">Professor da EBD</p>
                  <p className="text-xs text-muted-foreground">
                    Acesso restrito ao módulo EBD e às classes selecionadas
                    abaixo.
                  </p>
                </div>
              ) : (
                <Select
                  value={form.roleId}
                  disabled={isSelfEdit}
                  onValueChange={(v) => setField("roleId", v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o papel" />
                  </SelectTrigger>
                  <SelectContent>
                    {managerData.roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-1">
              <Label>Sede</Label>
              <Select
                value={form.sedeId}
                disabled={isSelfEdit || isEbdTeacherEdit || managerData.sedes.length === 0}
                onValueChange={(v) =>
                  setForm((f) => {
                    const next = { ...f, sedeId: v };
                    const stillValid = managerData.congregations.some(
                      (c) => c.value === f.congregationId && c.sedeId === v
                    );
                    if (!stillValid) next.congregationId = "";
                    return next;
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione a sede" />
                </SelectTrigger>
                <SelectContent>
                  {managerData.sedes.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {managerData.sedes.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhuma sede disponível no seu escopo.
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label>
                Congregação{" "}
                <span className="font-normal text-muted-foreground">
                  (opcional)
                </span>
              </Label>
              <Select
                value={form.congregationId || "none"}
                disabled={
                  isSelfEdit ||
                  isEbdTeacherEdit ||
                  filteredCongregations.length === 0
                }
                onValueChange={(v) =>
                  setField(
                    "congregationId",
                    v === "none" ? "" : v
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todas as congregações da sede" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Todas as congregações da sede</SelectItem>
                  {filteredCongregations.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Ao escolher uma congregação, o acesso fica restrito a ela.
              </p>
            </div>

            {isEbdTeacherEdit && (
              <div className="space-y-1">
                <Label>Classes da EBD</Label>
                <p className="text-xs text-muted-foreground">
                  O professor verá somente estas classes dentro do módulo EBD.
                </p>
                {editClassOptions.length === 0 ? (
                  <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                    Nenhuma classe da EBD cadastrada para esta congregação.
                  </p>
                ) : (
                  <div className="grid max-h-44 gap-2 overflow-y-auto rounded-lg border p-2 sm:grid-cols-2">
                    {editClassOptions.map((item) => (
                      <label
                        key={item.id}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
                      >
                        <input
                          type="checkbox"
                          className="size-4 rounded border-input accent-primary"
                          checked={form.ebdClassIds.includes(item.id)}
                          onChange={() => toggleFormClass(item.id)}
                        />
                        <span className="min-w-0 truncate">{item.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="senha">
                  {isCreate ? "Senha" : "Nova senha"}
                </Label>
                <Input
                  id="senha"
                  type="password"
                  value={form.password}
                  onChange={(e) => setField("password", e.target.value)}
                  placeholder={isCreate ? "Mínimo 6 caracteres" : "Deixe em branco para manter"}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="senha2">Confirmar senha</Label>
                <Input
                  id="senha2"
                  type="password"
                  value={form.passwordConfirm}
                  onChange={(e) => setField("passwordConfirm", e.target.value)}
                  placeholder="Repita a senha"
                />
              </div>
            </div>

            {!isCreate && !isSelfEdit && (
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Acesso ativo</p>
                  <p className="text-xs text-muted-foreground">
                    Usuário pode entrar no sistema
                  </p>
                </div>
                <Switch
                  checked={form.active}
                  onCheckedChange={(v) => setField("active", v)}
                />
              </div>
            )}

            <p className="text-sm text-destructive">{error}</p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={teacherDialogOpen} onOpenChange={setTeacherDialogOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo professor EBD</DialogTitle>
            <DialogDescription>
              Crie o acesso de um professor já cadastrado na EBD. Ele poderá
              entrar somente no módulo EBD e ver apenas as classes selecionadas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {availableTeachers.length === 0 ? (
              <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                Todos os professores ativos da EBD já possuem acesso ao sistema.
                Para cadastrar um novo professor, use o módulo EBD → Professores.
              </p>
            ) : (
              <>
                <div className="space-y-1">
                  <Label>Professor da EBD</Label>
                  <Select
                    value={teacherForm.teacherId}
                    onValueChange={selectTeacher}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione o professor" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTeachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.name} · {teacher.congregationName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedTeacher && (
                  <>
                    <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                      <p className="font-medium">{selectedTeacher.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Matrícula {selectedTeacher.code} ·{" "}
                        {selectedTeacher.congregationName}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <Label>Classes da EBD</Label>
                      <p className="text-xs text-muted-foreground">
                        O professor verá somente estas classes dentro do módulo
                        EBD.
                      </p>
                      {teacherClassOptions.length === 0 ? (
                        <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                          Nenhuma classe da EBD cadastrada para esta congregação.
                        </p>
                      ) : (
                        <div className="grid max-h-44 gap-2 overflow-y-auto rounded-lg border p-2 sm:grid-cols-2">
                          {teacherClassOptions.map((item) => (
                            <label
                              key={item.id}
                              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
                            >
                              <input
                                type="checkbox"
                                className="size-4 rounded border-input accent-primary"
                                checked={teacherForm.classIds.includes(item.id)}
                                onChange={() => toggleTeacherClass(item.id)}
                              />
                              <span className="min-w-0 truncate">
                                {item.name}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="ebd-email">E-mail de acesso</Label>
                      <Input
                        id="ebd-email"
                        type="email"
                        value={teacherForm.email}
                        onChange={(e) =>
                          setTeacherForm((current) => ({
                            ...current,
                            email: e.target.value,
                          }))
                        }
                        placeholder="professor@igreja.com.br"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor="ebd-senha">Senha</Label>
                        <Input
                          id="ebd-senha"
                          type="password"
                          value={teacherForm.password}
                          onChange={(e) =>
                            setTeacherForm((current) => ({
                              ...current,
                              password: e.target.value,
                            }))
                          }
                          placeholder="Mínimo 6 caracteres"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="ebd-senha2">Confirmar senha</Label>
                        <Input
                          id="ebd-senha2"
                          type="password"
                          value={teacherForm.passwordConfirm}
                          onChange={(e) =>
                            setTeacherForm((current) => ({
                              ...current,
                              passwordConfirm: e.target.value,
                            }))
                          }
                          placeholder="Repita a senha"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-md border px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">Acesso ativo</p>
                        <p className="text-xs text-muted-foreground">
                          O professor pode entrar no sistema
                        </p>
                      </div>
                      <Switch
                        checked={teacherForm.active}
                        onCheckedChange={(v) =>
                          setTeacherForm((current) => ({
                            ...current,
                            active: v,
                          }))
                        }
                      />
                    </div>
                  </>
                )}
              </>
            )}

            <p className="text-sm text-destructive">{error}</p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTeacherDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleTeacherSubmit}
              disabled={busy || availableTeachers.length === 0}
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar acesso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(resetTarget)}
        onOpenChange={(v) => {
          if (!v) {
            setResetTarget(null);
            setResetPassword("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redefinir senha</DialogTitle>
            <DialogDescription>
              Defina uma nova senha para{" "}
              <span className="font-medium">
                {resetTarget?.name ?? ""} ({resetTarget?.email ?? ""})
              </span>
              . O usuário deverá usar esta senha no próximo login.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <Label htmlFor="nova-senha">Nova senha</Label>
            <Input
              id="nova-senha"
              type="password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
            <p className="text-sm text-destructive">{error}</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setResetTarget(null);
                setResetPassword("");
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleResetPassword} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Definir nova senha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}