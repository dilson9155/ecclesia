"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import type { FieldDef, Option, RowActionDef } from "@/modules/registration/definitions";
import { displayField } from "@/modules/registration/validators";
import {
  createRecord,
  updateRecord,
  removeRecord,
  runRowActionById,
} from "@/app/actions/registration";
import { buildFormDefaults, fillEmptyFields } from "@/lib/form-utils";
import { formatMoney } from "@/lib/format";
import { SELECT_INPUT_CLASS } from "@/lib/styles";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Props = {
  resourceKey: string;
  singular: string;
  plural: string;
  description: string;
  fields: FieldDef[];
  rows: Record<string, unknown>[];
  canWrite: boolean;
  actions?: RowActionDef[];
  relationOptions?: Record<string, Option[]>;
};

const STATUS_KEYS = ["status", "situation"];

function optionLabel(field: FieldDef, value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  for (const o of field.options ?? []) {
    if (o.value === String(value)) return o.label;
  }
  return null;
}

function statusBadge(field: FieldDef, value: unknown) {
  const frame = optionLabel(field, value) ?? String(value ?? "ATIVO");
  const active = String(value ?? "ATIVO") === "ATIVO";
  return <Badge variant={active ? "default" : "secondary"}>{frame}</Badge>;
}

function formatValue(
  resourceKey: string,
  field: FieldDef,
  value: unknown,
  relationLabels?: Map<string, string>
): string {
  const custom = displayField(resourceKey, field.key, value);
  if (custom !== null) return custom;
  if (field.type === "select") {
    return optionLabel(field, value) ?? (value === null || value === undefined ? "—" : String(value));
  }
  if (field.type === "decimal") {
    return value === null || value === undefined || value === ""
      ? "—"
      : formatMoney(value, true);
  }
  if (field.type === "checkbox") {
    return value === true || value === "true" ? "Sim" : "Não";
  }
  if (field.type === "relation") {
    if (value === null || value === undefined || value === "") return "—";
    return relationLabels?.get(String(value)) ?? String(value);
  }
  if (field.type === "date") {
    const s = String(value ?? "");
    return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : s || "—";
  }
  if (value === null || value === undefined) return "—";
  return String(value);
}

export function CrudManager({
  resourceKey,
  singular,
  plural,
  description,
  fields,
  rows,
  canWrite,
  actions = [],
  relationOptions = {},
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const defaultValues = useMemo(() => buildFormDefaults(fields), [fields]);
  const form = useForm<Record<string, unknown>>({ defaultValues });

  const visibleFields = fields.slice(0, 6);
  const statusField = fields.find((f) => STATUS_KEYS.includes(f.key));
  const statusKey = statusField?.key;

  const relationLabels = useMemo(() => {
    const out: Record<string, Map<string, string>> = {};
    for (const [key, options] of Object.entries(relationOptions)) {
      out[key] = new Map(options.map((o) => [o.value, o.label]));
    }
    return out;
  }, [relationOptions]);

  function openCreate() {
    setEditingId(null);
    setActionError(null);
    form.reset(defaultValues);
    setDialogOpen(true);
  }

  function openEdit(row: Record<string, unknown>) {
    setEditingId(row.id as string);
    setActionError(null);
    form.reset(fillEmptyFields(fields, row));
    setDialogOpen(true);
  }

  async function handleSubmit(values: Record<string, unknown>) {
    setBusy(true);
    setActionError(null);
    const result = editingId
      ? await updateRecord(resourceKey, editingId, values)
      : await createRecord(resourceKey, values);
    setBusy(false);
    if (!result.ok) {
      setActionError(result.error ?? "Erro ao salvar.");
      return;
    }
    setDialogOpen(false);
  }

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    setActionError(null);
    const result = await removeRecord(resourceKey, deleting.id as string);
    setBusy(false);
    if (!result.ok) {
      setActionError(result.error ?? "Erro ao excluir.");
      return;
    }
    setDeleting(null);
  }

  async function handleRowAction(rowId: string, actionKey: string) {
    setBusy(true);
    setActionError(null);
    const result = await runRowActionById(resourceKey, actionKey, rowId);
    setBusy(false);
    if (!result.ok) {
      setActionError(result.error ?? "Erro ao executar ação.");
    }
  }

  const tableFields = visibleFields.filter((f) => !STATUS_KEYS.includes(f.key));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{plural}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {canWrite && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Novo {singular}
          </Button>
        )}
      {actionError && (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {actionError}
          </p>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {tableFields.map((f) => (
                <TableHead key={f.key}>{f.label}</TableHead>
              ))}
              {statusField && <TableHead>Situação</TableHead>}
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={tableFields.length + (statusField ? 1 : 0) + 1}
                  className="h-24 text-center text-muted-foreground"
                >
                  Nenhum registro cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id as string}>
                  {tableFields.map((f) => (
                    <TableCell
                      key={f.key}
                      className={f.key === "name" ? "font-medium" : undefined}
                      title={f.type === "text" ? String(row[f.key] ?? "") : undefined}
                    >
                      {formatValue(resourceKey, f, row[f.key], relationLabels[f.key])}
                    </TableCell>
                  ))}
                  {statusField && statusKey && (
                    <TableCell>{statusBadge(statusField, row[statusKey])}</TableCell>
                  )}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {actions.map((a) => (
                        <Button
                          key={a.key}
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          disabled={busy}
                          onClick={() => handleRowAction(row.id as string, a.key)}
                        >
                          {a.label}
                        </Button>
                      ))}
                      {canWrite && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(row)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleting(row)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? `Editar ${singular}` : `Novo ${singular}`}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do cadastro.
            </DialogDescription>
          </DialogHeader>
          <form id="crud-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {fields.map((f) => {
              if (f.readonly) return null;
              if (f.type === "select" || f.type === "relation") {
                return (
                  <div key={f.key} className="space-y-1">
                    <Label htmlFor={f.key}>
                      {f.label}
                      {f.required && <span className="text-destructive"> *</span>}
                    </Label>
                    <select
                      id={f.key}
                      className={SELECT_INPUT_CLASS}
                      {...form.register(f.key)}
                    >
                      <option value="">Selecione…</option>
                      {(f.type === "select"
                        ? f.options ?? []
                        : relationOptions[f.key] ?? []
                      ).map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }
              if (f.type === "textarea") {
                return (
                  <div key={f.key} className="space-y-1">
                    <Label htmlFor={f.key}>
                      {f.label}
                      {f.required && <span className="text-destructive"> *</span>}
                    </Label>
                    <textarea
                      id={f.key}
                      rows={3}
                      className={`${SELECT_INPUT_CLASS} h-auto min-h-20 py-2`}
                      placeholder={f.hint}
                      {...form.register(f.key)}
                    />
                  </div>
                );
              }
              return (
                <div key={f.key} className="space-y-1">
                  <Label htmlFor={f.key}>
                    {f.label}
                    {f.required && <span className="text-destructive"> *</span>}
                  </Label>
                  <Input
                    id={f.key}
                    type={f.type === "date" ? "date" : "text"}
                    placeholder={f.hint}
                    {...form.register(f.key)}
                  />
                </div>
              );
            })}
            {actionError && <p className="text-sm text-destructive">{actionError}</p>}
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="crud-form" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleting)} onOpenChange={(v) => !v && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir registro</DialogTitle>
            <DialogDescription>
              Deseja realmente excluir este {singular}? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          {actionError && <p className="text-sm text-destructive">{actionError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
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