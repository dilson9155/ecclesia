"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  Power,
  Search,
  Users,
} from "lucide-react";
import {
  createChurchAction,
  setChurchStatusAction,
  updateChurchBillingAction,
} from "@/app/actions/platform";
import type { ChurchListItem, PlanView } from "@/services/platform.service";
import {
  STRUCTURE_TYPE_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
  SUBSCRIPTION_STATUS_VARIANTS,
  formatBRL,
  memberRangeLabel,
} from "@/modules/platform/pricing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type StructureType = "SEDE_ONLY" | "SEDE_AND_CONGREGATIONS";

type FormState = {
  name: string;
  legalName: string;
  cnpj: string;
  email: string;
  phone: string;
  notes: string;
  structureType: StructureType;
  sedeMemberCount: string;
  congregationMemberCount: string;
  planId: string;
  sedeName: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  legalName: "",
  cnpj: "",
  email: "",
  phone: "",
  notes: "",
  structureType: "SEDE_AND_CONGREGATIONS",
  sedeMemberCount: "0",
  congregationMemberCount: "0",
  planId: "",
  sedeName: "Sede",
  adminName: "",
  adminEmail: "",
  adminPassword: "",
};

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function totalMembers(form: Pick<FormState, "structureType" | "sedeMemberCount" | "congregationMemberCount">): number {
  const sede = Number(form.sedeMemberCount) || 0;
  const congregations =
    form.structureType === "SEDE_ONLY"
      ? 0
      : Number(form.congregationMemberCount) || 0;
  return Math.max(0, sede) + Math.max(0, congregations);
}

function suggestPlan(
  plans: PlanView[],
  structureType: StructureType,
  total: number
): PlanView | undefined {
  return plans
    .filter(
      (plan) =>
        plan.active &&
        plan.structureType === structureType &&
        total >= plan.minMembers &&
        (plan.maxMembers === null || total <= plan.maxMembers)
    )
    .sort((a, b) => a.minMembers - b.minMembers)[0];
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("pt-BR");
}

export function ChurchesManager({
  churches,
  plans,
}: {
  churches: ChurchListItem[];
  plans: PlanView[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ChurchListItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return churches;
    return churches.filter((church) =>
      [church.name, church.legalName, church.cnpj, church.email]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term))
    );
  }, [churches, search]);

  const total = totalMembers(form);
  const suggested = useMemo(
    () => suggestPlan(plans, form.structureType, total),
    [plans, form.structureType, total]
  );
  const selectedPlan = plans.find((plan) => plan.id === form.planId);
  const plansForStructure = plans.filter(
    (plan) => plan.active && plan.structureType === form.structureType
  );

  function openCreate() {
    const initial = { ...EMPTY_FORM };
    const match = suggestPlan(plans, initial.structureType, 0);
    setEditing(null);
    setError(null);
    setForm({ ...initial, planId: match?.id ?? "" });
    setOpen(true);
  }

  function openEdit(church: ChurchListItem) {
    setEditing(church);
    setError(null);
    setForm({
      name: church.name,
      legalName: church.legalName ?? "",
      cnpj: church.cnpj ?? "",
      email: church.email ?? "",
      phone: church.phone ?? "",
      notes: church.notes ?? "",
      structureType: church.structureType,
      sedeMemberCount: String(church.sedeMemberCount),
      congregationMemberCount: String(church.congregationMemberCount),
      planId: church.subscription?.planId ?? "",
      sedeName: "Sede",
      adminName: "",
      adminEmail: "",
      adminPassword: "",
    });
    setOpen(true);
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function setBilling(
    patch: Partial<
      Pick<
        FormState,
        "structureType" | "sedeMemberCount" | "congregationMemberCount"
      >
    >
  ) {
    setForm((current) => {
      const next = { ...current, ...patch };
      if (next.structureType === "SEDE_ONLY") {
        next.congregationMemberCount = "0";
      }
      const match = suggestPlan(
        plans,
        next.structureType,
        totalMembers(next)
      );
      return { ...next, planId: match?.id ?? "" };
    });
  }

  async function handleSubmit() {
    setError(null);

    if (!form.name.trim()) {
      setError("Informe o nome da igreja.");
      return;
    }
    if (!selectedPlan) {
      setError(
        "Nenhum plano ativo atende a estrutura e a quantidade de membros informada. Ajuste os planos ou os dados da igreja."
      );
      return;
    }

    const billing = {
      name: form.name.trim(),
      legalName: form.legalName.trim() || null,
      cnpj: form.cnpj.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      notes: form.notes.trim() || null,
      structureType: form.structureType,
      sedeMemberCount: Number(form.sedeMemberCount) || 0,
      congregationMemberCount:
        form.structureType === "SEDE_ONLY"
          ? 0
          : Number(form.congregationMemberCount) || 0,
      planId: form.planId,
    };

    setBusy(true);
    const result = editing
      ? await updateChurchBillingAction(editing.id, billing)
      : await createChurchAction({
          ...billing,
          sedeName: form.sedeName.trim() || "Sede",
          adminName: form.adminName.trim() || null,
          adminEmail: form.adminEmail.trim() || null,
          adminPassword: form.adminPassword || null,
        });
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setOpen(false);
    router.refresh();
  }

  async function handleToggle(church: ChurchListItem) {
    const nextStatus = church.status === "ATIVO" ? "INATIVO" : "ATIVO";
    const confirmed = window.confirm(
      nextStatus === "ATIVO"
        ? `Reativar o acesso da igreja ${church.name}?`
        : `Inativar o acesso da igreja ${church.name}? Os usuários não conseguirão entrar até a reativação.`
    );
    if (!confirmed) return;

    setBusyId(church.id);
    const result = await setChurchStatusAction(church.id, nextStatus);
    setBusyId(null);
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Igrejas e assinaturas
          </h1>
          <p className="text-sm text-muted-foreground">
            Cadastre igrejas, defina a estrutura (sede ou sede + congregações) e
            o total de membros para calcular o plano.
          </p>
        </div>
        <Button onClick={openCreate} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Nova igreja
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nome, CNPJ ou e-mail"
          className="pl-9"
        />
      </div>

      <Card className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Igreja</TableHead>
              <TableHead>Estrutura</TableHead>
              <TableHead>Membros</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead className="sticky right-0 z-10 bg-card text-right shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.18)]">
                Ações
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((church) => (
              <TableRow key={church.id}>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{church.name}</p>
                    <Badge
                      variant={church.status === "ATIVO" ? "default" : "outline"}
                    >
                      {church.status === "ATIVO" ? "Ativa" : "Inativa"}
                    </Badge>
                    {church.subscription &&
                    church.subscription.status !== "ACTIVE" ? (
                      <Badge
                        variant={
                          SUBSCRIPTION_STATUS_VARIANTS[
                            church.subscription.status
                          ]
                        }
                      >
                        {SUBSCRIPTION_STATUS_LABELS[church.subscription.status]}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {church.cnpj ? `CNPJ ${church.cnpj}` : "Sem CNPJ"} • desde{" "}
                    {formatDate(church.createdAt)}
                  </p>
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {STRUCTURE_TYPE_LABELS[church.structureType]}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {church.counts.sedes} sede(s) •{" "}
                    {church.counts.congregations} congregação(ões)
                  </p>
                </TableCell>
                <TableCell>
                  <p className="text-sm font-medium">
                    {new Intl.NumberFormat("pt-BR").format(church.memberCount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Intl.NumberFormat("pt-BR").format(
                      church.sedeMemberCount
                    )}{" "}
                    sede +{" "}
                    {new Intl.NumberFormat("pt-BR").format(
                      church.congregationMemberCount
                    )}{" "}
                    cong.
                  </p>
                </TableCell>
                <TableCell>
                  {church.subscription ? (
                    <>
                      <p className="text-sm font-medium">
                        {church.subscription.planName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatBRL(church.subscription.price)}/mês
                      </p>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Sem plano
                    </span>
                  )}
                </TableCell>
                <TableCell className="sticky right-0 bg-card shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.18)]">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(church)}
                    >
                      <Pencil className="mr-1 h-4 w-4" />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busyId === church.id}
                      onClick={() => void handleToggle(church)}
                    >
                      {busyId === church.id ? (
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      ) : (
                        <Power className="mr-1 h-4 w-4" />
                      )}
                      {church.status === "ATIVO" ? "Inativar" : "Ativar"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Nenhuma igreja encontrada.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Card>

      <div className="space-y-3 lg:hidden">
        {filtered.map((church) => (
          <Card key={church.id}>
            <CardContent className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{church.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {church.cnpj ? `CNPJ ${church.cnpj}` : "Sem CNPJ"}
                  </p>
                </div>
                <Badge
                  variant={church.status === "ATIVO" ? "default" : "outline"}
                >
                  {church.status === "ATIVO" ? "Ativa" : "Inativa"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Estrutura</p>
                  <p>{STRUCTURE_TYPE_LABELS[church.structureType]}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Membros</p>
                  <p>
                    {new Intl.NumberFormat("pt-BR").format(church.memberCount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Plano</p>
                  <p>{church.subscription?.planName ?? "Sem plano"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor</p>
                  <p>
                    {church.subscription
                      ? `${formatBRL(church.subscription.price)}/mês`
                      : "—"}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => openEdit(church)}
                >
                  <Pencil className="mr-1 h-4 w-4" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  disabled={busyId === church.id}
                  onClick={() => void handleToggle(church)}
                >
                  {busyId === church.id ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Power className="mr-1 h-4 w-4" />
                  )}
                  {church.status === "ATIVO" ? "Inativar" : "Ativar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma igreja encontrada.
          </p>
        ) : null}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {editing ? "Editar igreja" : "Cadastrar igreja"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Atualize a estrutura, o total de membros e o plano da igreja."
                : "Defina a estrutura e o total de membros (sede + congregações) para calcular automaticamente o valor do plano."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="church-name">Nome da igreja *</Label>
                <Input
                  id="church-name"
                  value={form.name}
                  onChange={(event) => setField("name", event.target.value)}
                  placeholder="Igreja Batista Central"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="church-legal">Razão social</Label>
                <Input
                  id="church-legal"
                  value={form.legalName}
                  onChange={(event) => setField("legalName", event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="church-cnpj">CNPJ</Label>
                <Input
                  id="church-cnpj"
                  value={form.cnpj}
                  onChange={(event) => setField("cnpj", event.target.value)}
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="church-email">E-mail</Label>
                <Input
                  id="church-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setField("email", event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="church-phone">Telefone / WhatsApp</Label>
                <Input
                  id="church-phone"
                  value={form.phone}
                  onChange={(event) => setField("phone", event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Estrutura da igreja *</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    {
                      value: "SEDE_ONLY",
                      title: "Somente sede",
                      description: "Uma única unidade, sem congregações.",
                    },
                    {
                      value: "SEDE_AND_CONGREGATIONS",
                      title: "Sede + congregações",
                      description: "Sede com uma ou mais congregações.",
                    },
                  ] as const
                ).map((option) => {
                  const selected = form.structureType === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setBilling({ structureType: option.value })}
                      className={cn(
                        "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                        selected
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/40"
                        )}
                      >
                        {selected ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">
                          {option.title}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {option.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="sede-members">Membros da sede *</Label>
                <Input
                  id="sede-members"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={form.sedeMemberCount}
                  onChange={(event) =>
                    setBilling({ sedeMemberCount: onlyDigits(event.target.value) || "0" })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="congregation-members">
                  Membros das congregações
                </Label>
                <Input
                  id="congregation-members"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  disabled={form.structureType === "SEDE_ONLY"}
                  value={
                    form.structureType === "SEDE_ONLY"
                      ? "0"
                      : form.congregationMemberCount
                  }
                  onChange={(event) =>
                    setBilling({
                      congregationMemberCount: onlyDigits(event.target.value) || "0",
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {form.structureType === "SEDE_ONLY"
                    ? "Não se aplica ao plano somente sede."
                    : "Some os membros de todas as congregações."}
                </p>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/40 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-medium">
                    <Users className="h-4 w-4" />
                    Total de membros:{" "}
                    {new Intl.NumberFormat("pt-BR").format(total)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Sede + congregações define a faixa do plano.
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    Plano sugerido
                  </p>
                  <p className="text-sm font-semibold">
                    {suggested
                      ? `${suggested.name} — ${formatBRL(suggested.price)}/mês`
                      : "Nenhum plano compatível"}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Plano da assinatura *</Label>
                <Select
                  value={form.planId || undefined}
                  onValueChange={(value) => setField("planId", value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o plano" />
                  </SelectTrigger>
                  <SelectContent>
                    {plansForStructure.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} — {formatBRL(plan.price)}/mês (
                        {memberRangeLabel(plan.minMembers, plan.maxMembers)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Você pode escolher outro plano da mesma estrutura.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Valor mensal</Label>
                <div className="flex h-9 items-center rounded-md border bg-muted/30 px-3 text-sm font-semibold">
                  {selectedPlan ? `${formatBRL(selectedPlan.price)}/mês` : "—"}
                </div>
                {selectedPlan ? (
                  <p className="text-xs text-muted-foreground">
                    Faixa: {memberRangeLabel(selectedPlan.minMembers, selectedPlan.maxMembers)}
                  </p>
                ) : null}
              </div>
            </div>

            {!editing ? (
              <div className="space-y-3 rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Primeiro acesso da igreja</p>
                  <p className="text-xs text-muted-foreground">
                    Opcional. Cria um Super Administrador com acesso total à
                    igreja.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="admin-name">Nome do responsável</Label>
                    <Input
                      id="admin-name"
                      value={form.adminName}
                      onChange={(event) =>
                        setField("adminName", event.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="admin-email">E-mail de acesso</Label>
                    <Input
                      id="admin-email"
                      type="email"
                      value={form.adminEmail}
                      onChange={(event) =>
                        setField("adminEmail", event.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="admin-password">Senha inicial</Label>
                    <Input
                      id="admin-password"
                      type="password"
                      value={form.adminPassword}
                      onChange={(event) =>
                        setField("adminPassword", event.target.value)
                      }
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sede-name">Nome da sede</Label>
                    <Input
                      id="sede-name"
                      value={form.sedeName}
                      onChange={(event) =>
                        setField("sedeName", event.target.value)
                      }
                    />
                  </div>
                </div>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="church-notes">Observações</Label>
              <Textarea
                id="church-notes"
                value={form.notes}
                onChange={(event) => setField("notes", event.target.value)}
                rows={2}
                placeholder="Informações internas da plataforma"
              />
            </div>

            {error ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button onClick={() => void handleSubmit()} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editing ? "Salvar alterações" : "Cadastrar igreja"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
