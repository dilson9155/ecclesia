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
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  newLabel?: string;
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
  canCreate,
  canEdit,
  canDelete,
  newLabel,
  actions = [],
  relationOptions = {},
}: Props) {
  const allowCreate = canCreate ?? canWrite;
  const allowEdit = canEdit ?? canWrite;
  const allowDelete = canDelete ?? canWrite;
  const createLabel = newLabel ?? `Novo ${singular}`;
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
  const primaryField =
    tableFields.find((f) => f.key === "name") ??
    tableFields.find((f) => f.key === "description") ??
    tableFields[0];
  const secondaryFields = tableFields.filter((f) => f.key !== primaryField?.key);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {plural}
          </h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {allowCreate && (
          <Button onClick={openCreate} className="w-full shrink-0 sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            {createLabel}
          </Button>
        )}
      </div>

      {actionError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {actionError}
        </p>
      )}

      <div className="space-y-2 md:hidden">
        {rows.length === 0 ? (
          <div className="rounded-lg border bg-card px-3 py-8 text-center text-sm text-muted-foreground">
            Nenhum registro cadastrado.
          </div>
        ) : (
          rows.map((row) => (
            <div
              key={row.id as string}
              className="rounded-lg border bg-card p-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {primaryField
                      ? formatValue(
                          resourceKey,
                          primaryField,
                          row[primaryField.key],
                          relationLabels[primaryField.key]
                        )
                      : "Registro"}
                  </p>
                  {primaryField && primaryField.key !== "name" && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {primaryField.label}
                    </p>
                  )}
                </div>
                {statusField && statusKey && (
                  <div className="shrink-0">
                    {statusBadge(statusField, row[statusKey])}
                  </div>
                )}
              </div>

              {secondaryFields.length > 0 && (
                <dl className="mt-3 grid grid-cols-1 gap-1 text-xs min-[420px]:grid-cols-2">
                  {secondaryFields.map((f) => (
                    <div
                      key={f.key}
                      className="flex min-w-0 items-start justify-between gap-2 rounded-md bg-muted/40 px-2 py-1.5"
                    >
                      <dt className="shrink-0 text-muted-foreground">{f.label}</dt>
                      <dd className="min-w-0 break-words text-right font-medium">
                        {formatValue(
                          resourceKey,
                          f,
                          row[f.key],
                          relationLabels[f.key]
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}

              <div className="mt-3 flex flex-wrap items-center justify-end gap-1 border-t pt-2">
                {actions.map((a) => (
                  <Button
                    key={a.key}
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    disabled={busy}
                    onClick={() => handleRowAction(row.id as string, a.key)}
                  >
                    {a.label}
                  </Button>
                ))}
                {allowEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => openEdit(row)}
                  >
                    <Pencil className="mr-1 h-3.5 w-3.5" />
                    Editar
                  </Button>
                )}
                {allowDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => setDeleting(row)}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5 text-destructive" />
                    Excluir
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="hidden rounded-md border md:block">
        <Table className="border-separate border-spacing-0">
          <TableHeader>
            <TableRow>
              {tableFields.map((f) => (
                <TableHead key={f.key}>{f.label}</TableHead>
              ))}
              {statusField && <TableHead>Situação</TableHead>}
              <TableHead className="sticky right-0 bg-muted text-right shadow-[-6px_0_12px_-8px_rgba(0,0,0,0.35)]">Ações</TableHead>
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
                  <TableCell className="sticky right-0 bg-background text-right shadow-[-6px_0_12px_-8px_rgba(0,0,0,0.35)]">
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
                      {allowEdit && (
                        <Button variant="ghost" size="icon" onClick={() => openEdit(row)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {allowDelete && (
                        <Button variant="ghost" size="icon" onClick={() => setDeleting(row)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
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
              {editingId ? `Editar ${singular}` : createLabel}
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