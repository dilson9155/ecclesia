"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Tags } from "lucide-react";
import { updatePlanAction } from "@/app/actions/platform";
import type { PlanView } from "@/services/platform.service";
import {
  STRUCTURE_TYPE_DESCRIPTIONS,
  STRUCTURE_TYPE_LABELS,
  formatBRL,
  memberRangeLabel,
} from "@/modules/platform/pricing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type EditState = {
  name: string;
  description: string;
  price: string;
  minMembers: string;
  maxMembers: string;
  active: boolean;
};

export function PlansManager({ plans }: { plans: PlanView[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<PlanView | null>(null);
  const [form, setForm] = useState<EditState>({
    name: "",
    description: "",
    price: "",
    minMembers: "",
    maxMembers: "",
    active: true,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openEdit(plan: PlanView) {
    setEditing(plan);
    setError(null);
    setForm({
      name: plan.name,
      description: plan.description ?? "",
      price: plan.price.toFixed(2),
      minMembers: String(plan.minMembers),
      maxMembers: plan.maxMembers === null ? "" : String(plan.maxMembers),
      active: plan.active,
    });
  }

  async function handleSubmit() {
    if (!editing) return;
    setError(null);

    if (!form.name.trim()) {
      setError("Informe o nome do plano.");
      return;
    }
    const price = Number(form.price.replace(",", "."));
    if (!Number.isFinite(price) || price < 0) {
      setError("Informe um valor mensal válido.");
      return;
    }
    const minMembers = Number(form.minMembers);
    if (!Number.isFinite(minMembers) || minMembers < 0) {
      setError("Informe a faixa inicial de membros.");
      return;
    }
    const maxMembers =
      form.maxMembers.trim() === ""
        ? null
        : Number(form.maxMembers);
    if (maxMembers !== null && (!Number.isFinite(maxMembers) || maxMembers < minMembers)) {
      setError("A faixa final deve ser maior que a inicial.");
      return;
    }

    setBusy(true);
    const result = await updatePlanAction(editing.id, {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price,
      minMembers,
      maxMembers,
      active: form.active,
    });
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setEditing(null);
    router.refresh();
  }

  const groups = (["SEDE_ONLY", "SEDE_AND_CONGREGATIONS"] as const).map(
    (structureType) => ({
      structureType,
      plans: plans.filter((plan) => plan.structureType === structureType),
    })
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Planos e valores
        </h1>
        <p className="text-sm text-muted-foreground">
          Ajuste os valores por faixa de membros. O plano da igreja é escolhido
          pela estrutura (somente sede ou sede + congregações) e pelo total de
          membros informado no cadastro.
        </p>
      </div>

      {groups.map((group) => (
        <section key={group.structureType} className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Tags className="h-4 w-4" />
              {STRUCTURE_TYPE_LABELS[group.structureType]}
            </h2>
            <Badge variant="secondary">{group.plans.length} faixas</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {STRUCTURE_TYPE_DESCRIPTIONS[group.structureType]}
          </p>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {group.plans.map((plan) => (
              <Card key={plan.id} className="gap-3">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="truncate">{plan.name}</CardTitle>
                      <CardDescription>
                        {memberRangeLabel(plan.minMembers, plan.maxMembers)}
                      </CardDescription>
                    </div>
                    <Badge variant={plan.active ? "default" : "outline"}>
                      {plan.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-end justify-between gap-2">
                    <p className="text-2xl font-bold tracking-tight">
                      {formatBRL(plan.price)}
                      <span className="text-xs font-normal text-muted-foreground">
                        /mês
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {plan.churches} igreja(s)
                    </p>
                  </div>
                  <p className="line-clamp-2 min-h-8 text-xs text-muted-foreground">
                    {plan.description}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => openEdit(plan)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar valor
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}

      <Dialog
        open={editing !== null}
        onOpenChange={(value) => {
          if (!value) setEditing(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar plano</DialogTitle>
            <DialogDescription>
              {editing
                ? `${editing.code} • ${STRUCTURE_TYPE_LABELS[editing.structureType]}`
                : null}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="plan-name">Nome do plano *</Label>
              <Input
                id="plan-name"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-description">Descrição</Label>
              <Textarea
                id="plan-description"
                rows={2}
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-price">Valor mensal (R$) *</Label>
              <Input
                id="plan-price"
                type="number"
                min={0}
                step="0.01"
                value={form.price}
                onChange={(event) =>
                  setForm((current) => ({ ...current, price: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="plan-min">Membros (de) *</Label>
                <Input
                  id="plan-min"
                  type="number"
                  min={0}
                  value={form.minMembers}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      minMembers: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plan-max">Membros (até)</Label>
                <Input
                  id="plan-max"
                  type="number"
                  min={0}
                  value={form.maxMembers}
                  placeholder="Sem limite"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      maxMembers: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Plano ativo</p>
                <p className="text-xs text-muted-foreground">
                  Planos inativos não são sugeridos no cadastro de igrejas.
                </p>
              </div>
              <Switch
                checked={form.active}
                onCheckedChange={(checked) =>
                  setForm((current) => ({ ...current, active: checked }))
                }
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
              onClick={() => setEditing(null)}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button onClick={() => void handleSubmit()} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar plano
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
