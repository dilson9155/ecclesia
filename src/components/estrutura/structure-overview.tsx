"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Church,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  createRecord,
  removeRecord,
  updateRecord,
} from "@/app/actions/registration";
import {
  canEditSede,
  canManageCongregationsIn,
} from "@/modules/structure/policy";
import type {
  StructureCongregation,
  StructureOverviewData,
  StructureSede,
} from "@/modules/structure/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { SELECT_INPUT_CLASS } from "@/lib/styles";

const EMPTY_SEDE_FORM = {
  name: "",
  cnpj: "",
  phone: "",
  email: "",
  address: "",
  cep: "",
  district: "",
  city: "",
  state: "",
  status: "ATIVO",
};

const EMPTY_CONGREGATION_FORM = {
  code: "",
  name: "",
  sedeId: "",
  phone: "",
  email: "",
  address: "",
  cep: "",
  district: "",
  city: "",
  state: "",
  status: "ATIVO",
};

type SedeForm = typeof EMPTY_SEDE_FORM;
type CongregationForm = typeof EMPTY_CONGREGATION_FORM;

type SedeDialogState = {
  mode: "create" | "edit";
  sede?: StructureSede;
} | null;

type CongregationDialogState = {
  mode: "create" | "edit";
  sedeId: string;
  congregation?: StructureCongregation;
} | null;

type DeleteTarget = {
  resource: "sedes" | "congregacoes";
  id: string;
  label: string;
} | null;

function statusBadge(status: string) {
  return (
    <Badge variant={status === "ATIVO" ? "default" : "secondary"}>
      {status === "ATIVO" ? "Ativo" : "Inativo"}
    </Badge>
  );
}

function locationLabel(
  city: string | null,
  state: string | null,
  district: string | null
): string {
  const parts = [district, city, state].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Endereço não informado";
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <p
        className={
          typeof value === "string"
            ? "mt-1 truncate text-sm font-semibold tracking-tight"
            : "mt-1 text-xl font-semibold tracking-tight"
        }
        title={typeof value === "string" ? value : undefined}
      >
        {value}
      </p>
    </div>
  );
}

export function StructureOverview({
  data,
}: {
  data: StructureOverviewData;
}) {
  const router = useRouter();
  const scope = {
    sedeId: data.scopedSedeId,
    congregationId: data.scopedCongregationId,
    isSuperAdmin: data.isSuperAdmin,
  };

  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sedeDialog, setSedeDialog] = useState<SedeDialogState>(null);
  const [sedeForm, setSedeForm] = useState<SedeForm>(EMPTY_SEDE_FORM);

  const [congregationDialog, setCongregationDialog] =
    useState<CongregationDialogState>(null);
  const [congregationForm, setCongregationForm] =
    useState<CongregationForm>(EMPTY_CONGREGATION_FORM);

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);

  const filteredSedes = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return data.sedes;

    return data.sedes.flatMap((sede) => {
      const sedeMatches = [
        sede.name,
        sede.cnpj,
        sede.city,
        sede.state,
        sede.email,
      ].some((value) => value?.toLowerCase().includes(term));

      const congregations = sede.congregations.filter((congregation) =>
        [congregation.name, congregation.code, congregation.city, congregation.state]
          .some((value) => value?.toLowerCase().includes(term))
      );

      if (!sedeMatches && congregations.length === 0) return [];

      return [
        {
          ...sede,
          congregations: sedeMatches ? sede.congregations : congregations,
        },
      ];
    });
  }, [data.sedes, query]);

  function openSedeCreate() {
    setError(null);
    setSedeForm({ ...EMPTY_SEDE_FORM });
    setSedeDialog({ mode: "create" });
  }

  function openSedeEdit(sede: StructureSede) {
    setError(null);
    setSedeForm({
      name: sede.name,
      cnpj: sede.cnpj ?? "",
      phone: sede.phone ?? "",
      email: sede.email ?? "",
      address: sede.address ?? "",
      cep: sede.cep ?? "",
      district: sede.district ?? "",
      city: sede.city ?? "",
      state: sede.state ?? "",
      status: sede.status,
    });
    setSedeDialog({ mode: "edit", sede });
  }

  function openCongregationCreate(sedeId?: string) {
    setError(null);
    setCongregationForm({
      ...EMPTY_CONGREGATION_FORM,
      sedeId: sedeId ?? data.sedes[0]?.id ?? "",
    });
    setCongregationDialog({
      mode: "create",
      sedeId: sedeId ?? data.sedes[0]?.id ?? "",
    });
  }

  function openCongregationEdit(
    sedeId: string,
    congregation: StructureCongregation
  ) {
    setError(null);
    setCongregationForm({
      code: congregation.code,
      name: congregation.name,
      sedeId,
      phone: congregation.phone ?? "",
      email: congregation.email ?? "",
      address: congregation.address ?? "",
      cep: congregation.cep ?? "",
      district: congregation.district ?? "",
      city: congregation.city ?? "",
      state: congregation.state ?? "",
      status: congregation.status,
    });
    setCongregationDialog({
      mode: "edit",
      sedeId,
      congregation,
    });
  }

  async function handleSedeSubmit(event: FormEvent) {
    event.preventDefault();
    if (!sedeDialog) return;
    setBusy(true);
    setError(null);

    if (!sedeForm.name.trim()) {
      setError("Informe o nome da sede.");
      setBusy(false);
      return;
    }

    const result =
      sedeDialog.mode === "edit" && sedeDialog.sede
        ? await updateRecord("sedes", sedeDialog.sede.id, sedeForm)
        : await createRecord("sedes", sedeForm);

    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Não foi possível salvar a sede.");
      return;
    }
    setSedeDialog(null);
    router.refresh();
  }

  async function handleCongregationSubmit(event: FormEvent) {
    event.preventDefault();
    if (!congregationDialog) return;
    setBusy(true);
    setError(null);

    if (!congregationForm.name.trim()) {
      setError("Informe o nome da congregação.");
      setBusy(false);
      return;
    }
    if (!congregationForm.code.trim()) {
      setError("Informe o código da congregação.");
      setBusy(false);
      return;
    }
    if (!congregationForm.sedeId) {
      setError("Selecione a sede da congregação.");
      setBusy(false);
      return;
    }

    const result =
      congregationDialog.mode === "edit" &&
      congregationDialog.congregation
        ? await updateRecord(
            "congregacoes",
            congregationDialog.congregation.id,
            congregationForm
          )
        : await createRecord("congregacoes", congregationForm);

    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Não foi possível salvar a congregação.");
      return;
    }
    setCongregationDialog(null);
    router.refresh();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    setError(null);
    const result = await removeRecord(deleteTarget.resource, deleteTarget.id);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Não foi possível excluir.");
      return;
    }
    setDeleteTarget(null);
    router.refresh();
  }

  const singleSede = data.sedes[0];
  const canEditSingleSede = Boolean(
    singleSede && canEditSede(scope, singleSede.id)
  );

  const totals = [
    {
      label: "Sede",
      value: singleSede?.name ?? "Não cadastrada",
      icon: Building2,
    },
    { label: "Congregações", value: data.totals.congregations, icon: Church },
    { label: "Membros", value: data.totals.members, icon: Users },
    { label: "Usuários", value: data.totals.users, icon: UserCog },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Sede e congregações
          </h2>
          <p className="text-sm text-muted-foreground">
            Você está vendo <span className="font-medium">{data.scopeLabel}</span>.
            {data.canManageSedes
              ? " Mantenha os dados da sede da igreja e organize as congregações."
              : data.canManageCongregations
                ? " Gerencie as congregações da sua sede."
                : " Acesso somente leitura à sua congregação."}
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          {data.canManageSedes && data.sedes.length === 0 && (
            <Button onClick={openSedeCreate} className="flex-1 sm:flex-none">
              <Plus className="h-4 w-4" />
              Cadastrar sede
            </Button>
          )}
          {data.sedes.length > 0 && canEditSingleSede && (
            <Button
              variant="outline"
              onClick={() => openSedeEdit(singleSede)}
              className="flex-1 sm:flex-none"
            >
              <Pencil className="h-4 w-4" />
              Editar sede
            </Button>
          )}
          {data.canManageCongregations && data.sedes.length > 0 && (
            <Button
              variant="outline"
              onClick={() => openCongregationCreate()}
              className="flex-1 sm:flex-none"
            >
              <Plus className="h-4 w-4" />
              Nova congregação
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {totals.map((total) => (
          <Card key={total.label} size="sm">
            <CardContent className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">{total.label}</p>
                <p className="text-2xl font-semibold tracking-tight">
                  {total.value}
                </p>
              </div>
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <total.icon className="size-5" />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar sede ou congregação..."
          className="pl-9"
        />
      </div>

      {filteredSedes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Building2 className="size-6 text-muted-foreground" />
            </span>
            <div>
              <p className="font-medium">
                {data.sedes.length === 0
                  ? "Nenhuma sede cadastrada"
                  : "Nenhum resultado encontrado"}
              </p>
              <p className="text-sm text-muted-foreground">
                {data.sedes.length === 0
                  ? "Cadastre a primeira sede para começar a organizar a igreja."
                  : "Tente buscar por outro nome, código ou cidade."}
              </p>
            </div>
            {data.canManageSedes && data.sedes.length === 0 && (
              <Button onClick={openSedeCreate}>
                <Plus className="h-4 w-4" />
                Cadastrar sede
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSedes.map((sede) => {
            const canEdit = canEditSede(scope, sede.id);
            const canManageCongregations = canManageCongregationsIn(
              scope,
              sede.id
            );
            const sedeHasLinks =
              sede.congregationCount > 0 ||
              sede.memberCount > 0 ||
              sede.userCount > 0;

            return (
              <Card key={sede.id}>
                <CardHeader className="border-b">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Building2 className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <CardTitle className="truncate">
                            {sede.name}
                          </CardTitle>
                          {statusBadge(sede.status)}
                        </div>
                        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="size-3.5" />
                          {locationLabel(sede.city, sede.state, sede.district)}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {[sede.phone, sede.email].filter(Boolean).join(" · ") ||
                            "Sem contato cadastrado"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {canEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openSedeEdit(sede)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </Button>
                      )}
                      {data.canManageSedes && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={sedeHasLinks}
                          title={
                            sedeHasLinks
                              ? "Remova congregações, membros e usuários antes de excluir a sede."
                              : "Excluir sede"
                          }
                          onClick={() => {
                            setError(null);
                            setDeleteTarget({
                              resource: "sedes",
                              id: sede.id,
                              label: `a sede ${sede.name}`,
                            });
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
                    <Stat
                      label="Congregações"
                      value={sede.congregationCount}
                      icon={Church}
                    />
                    <Stat
                      label="Membros"
                      value={sede.memberCount}
                      icon={Users}
                    />
                    <Stat
                      label="Usuários"
                      value={sede.userCount}
                      icon={UserCog}
                    />
                  </div>

                  <div className="overflow-hidden rounded-lg border">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/20 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">Congregações</p>
                        <Badge variant="outline">
                          {sede.congregations.length}
                        </Badge>
                      </div>
                      {canManageCongregations && (
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() =>
                            openCongregationCreate(sede.id)
                          }
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Adicionar
                        </Button>
                      )}
                    </div>

                    {sede.congregations.length === 0 ? (
                      <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                        Nenhuma congregação cadastrada nesta sede.
                      </p>
                    ) : (
                      <div className="divide-y">
                        {sede.congregations.map((congregation) => (
                          <div
                            key={congregation.id}
                            className="flex flex-wrap items-center gap-3 px-3 py-2.5"
                          >
                            <Badge
                              variant="outline"
                              className="font-mono text-[11px]"
                            >
                              {congregation.code}
                            </Badge>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">
                                {congregation.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {locationLabel(
                                  congregation.city,
                                  congregation.state,
                                  null
                                )}{" "}
                                · {congregation.memberCount} membro(s)
                              </p>
                            </div>
                            {statusBadge(congregation.status)}
                            {canManageCongregations && (
                              <div className="flex items-center gap-0.5">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  title="Editar congregação"
                                  onClick={() =>
                                    openCongregationEdit(
                                      sede.id,
                                      congregation
                                    )
                                  }
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  title="Excluir congregação"
                                  onClick={() => {
                                    setError(null);
                                    setDeleteTarget({
                                      resource: "congregacoes",
                                      id: congregation.id,
                                      label: `a congregação ${congregation.name}`,
                                    });
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Sede */}
      <Dialog
        open={Boolean(sedeDialog)}
        onOpenChange={(open) => !open && setSedeDialog(null)}
      >
        <DialogContent className="max-h-[85dvh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {sedeDialog?.mode === "edit" ? "Editar sede" : "Cadastrar sede"}
            </DialogTitle>
            <DialogDescription>
              Dados da sede da igreja. As congregações ficam vinculadas a ela.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSedeSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="sede-name">Nome *</Label>
                <Input
                  id="sede-name"
                  value={sedeForm.name}
                  onChange={(event) =>
                    setSedeForm((form) => ({
                      ...form,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Ex.: Sede Centro"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sede-cnpj">CNPJ</Label>
                <Input
                  id="sede-cnpj"
                  value={sedeForm.cnpj}
                  onChange={(event) =>
                    setSedeForm((form) => ({
                      ...form,
                      cnpj: event.target.value,
                    }))
                  }
                  placeholder="Somente números"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sede-phone">Telefone</Label>
                <Input
                  id="sede-phone"
                  value={sedeForm.phone}
                  onChange={(event) =>
                    setSedeForm((form) => ({
                      ...form,
                      phone: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="sede-email">E-mail</Label>
                <Input
                  id="sede-email"
                  type="email"
                  value={sedeForm.email}
                  onChange={(event) =>
                    setSedeForm((form) => ({
                      ...form,
                      email: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="sede-address">Endereço</Label>
                <Input
                  id="sede-address"
                  value={sedeForm.address}
                  onChange={(event) =>
                    setSedeForm((form) => ({
                      ...form,
                      address: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sede-cep">CEP</Label>
                <Input
                  id="sede-cep"
                  value={sedeForm.cep}
                  onChange={(event) =>
                    setSedeForm((form) => ({
                      ...form,
                      cep: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sede-district">Bairro</Label>
                <Input
                  id="sede-district"
                  value={sedeForm.district}
                  onChange={(event) =>
                    setSedeForm((form) => ({
                      ...form,
                      district: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sede-city">Cidade</Label>
                <Input
                  id="sede-city"
                  value={sedeForm.city}
                  onChange={(event) =>
                    setSedeForm((form) => ({
                      ...form,
                      city: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sede-state">UF</Label>
                <Input
                  id="sede-state"
                  maxLength={2}
                  value={sedeForm.state}
                  onChange={(event) =>
                    setSedeForm((form) => ({
                      ...form,
                      state: event.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="SP"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sede-status">Situação</Label>
                <select
                  id="sede-status"
                  className={SELECT_INPUT_CLASS}
                  value={sedeForm.status}
                  onChange={(event) =>
                    setSedeForm((form) => ({
                      ...form,
                      status: event.target.value,
                    }))
                  }
                >
                  <option value="ATIVO">Ativo</option>
                  <option value="INATIVO">Inativo</option>
                </select>
              </div>
            </div>

            {error && (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSedeDialog(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Congregação */}
      <Dialog
        open={Boolean(congregationDialog)}
        onOpenChange={(open) => !open && setCongregationDialog(null)}
      >
        <DialogContent className="max-h-[85dvh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {congregationDialog?.mode === "edit"
                ? "Editar congregação"
                : "Nova congregação"}
            </DialogTitle>
            <DialogDescription>
              A congregação herda a igreja da sede e fica isolada das demais.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCongregationSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="cong-code">Código *</Label>
                <Input
                  id="cong-code"
                  value={congregationForm.code}
                  onChange={(event) =>
                    setCongregationForm((form) => ({
                      ...form,
                      code: event.target.value,
                    }))
                  }
                  placeholder="Ex.: 001"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cong-sede">Sede *</Label>
                <select
                  id="cong-sede"
                  className={SELECT_INPUT_CLASS}
                  value={congregationForm.sedeId}
                  onChange={(event) =>
                    setCongregationForm((form) => ({
                      ...form,
                      sedeId: event.target.value,
                    }))
                  }
                  disabled={
                    congregationDialog?.mode === "edit" ||
                    !data.canManageSedes
                  }
                  required
                >
                  <option value="">Selecione…</option>
                  {data.sedes.map((sede) => (
                    <option key={sede.id} value={sede.id}>
                      {sede.name}
                    </option>
                  ))}
                </select>
                {congregationDialog?.mode === "edit" && (
                  <p className="text-xs text-muted-foreground">
                    A congregação não pode ser transferida para outra sede.
                  </p>
                )}
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="cong-name">Nome *</Label>
                <Input
                  id="cong-name"
                  value={congregationForm.name}
                  onChange={(event) =>
                    setCongregationForm((form) => ({
                      ...form,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Ex.: Congregação Jardim das Flores"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cong-phone">Telefone</Label>
                <Input
                  id="cong-phone"
                  value={congregationForm.phone}
                  onChange={(event) =>
                    setCongregationForm((form) => ({
                      ...form,
                      phone: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cong-email">E-mail</Label>
                <Input
                  id="cong-email"
                  type="email"
                  value={congregationForm.email}
                  onChange={(event) =>
                    setCongregationForm((form) => ({
                      ...form,
                      email: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="cong-address">Endereço</Label>
                <Input
                  id="cong-address"
                  value={congregationForm.address}
                  onChange={(event) =>
                    setCongregationForm((form) => ({
                      ...form,
                      address: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cong-cep">CEP</Label>
                <Input
                  id="cong-cep"
                  value={congregationForm.cep}
                  onChange={(event) =>
                    setCongregationForm((form) => ({
                      ...form,
                      cep: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cong-district">Bairro</Label>
                <Input
                  id="cong-district"
                  value={congregationForm.district}
                  onChange={(event) =>
                    setCongregationForm((form) => ({
                      ...form,
                      district: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cong-city">Cidade</Label>
                <Input
                  id="cong-city"
                  value={congregationForm.city}
                  onChange={(event) =>
                    setCongregationForm((form) => ({
                      ...form,
                      city: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cong-state">UF</Label>
                <Input
                  id="cong-state"
                  maxLength={2}
                  value={congregationForm.state}
                  onChange={(event) =>
                    setCongregationForm((form) => ({
                      ...form,
                      state: event.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="SP"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cong-status">Situação</Label>
                <select
                  id="cong-status"
                  className={SELECT_INPUT_CLASS}
                  value={congregationForm.status}
                  onChange={(event) =>
                    setCongregationForm((form) => ({
                      ...form,
                      status: event.target.value,
                    }))
                  }
                >
                  <option value="ATIVO">Ativo</option>
                  <option value="INATIVO">Inativo</option>
                </select>
              </div>
            </div>

            {error && (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCongregationDialog(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Exclusão */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir registro</DialogTitle>
            <DialogDescription>
              Deseja realmente excluir {deleteTarget?.label}? Esta ação não
              pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
