"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import type { FieldDef, Option } from "@/modules/registration/definitions";
import { createRecord, updateRecord, removeRecord } from "@/app/actions/registration";
import { buildFormDefaults, fillEmptyFields } from "@/lib/form-utils";
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
  relationOptions?: Record<string, Option[]>;
};

function optionLabel(field: FieldDef, value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  for (const o of field.options ?? []) {
    if (o.value === String(value)) return o.label;
  }
  return null;
}

function statusBadge(status: unknown) {
  const inactive = String(status ?? "ATIVO") === "INATIVO";
  return (
    <Badge variant={inactive ? "secondary" : "default"}>
      {inactive ? "Inativo" : "Ativo"}
    </Badge>
  );
}

function formatValue(field: FieldDef, value: unknown, relationLabels?: Map<string, string>): string {
  if (field.type === "select") {
    return optionLabel(field, value) ?? (value === null || value === undefined ? "—" : String(value));
  }
  if (field.type === "relation") {
    if (value === null || value === undefined || value === "") return "—";
    const label = relationLabels?.get(String(value));
    return label ?? String(value);
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

  const statusField = fields.find((f) => f.key === "status");

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
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {visibleFields.map((f) => f.key !== "status" && (
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
                  colSpan={visibleFields.filter((f) => f.key !== "status").length + (statusField ? 2 : 1)}
                  className="h-24 text-center text-muted-foreground"
                >
                  Nenhum registro cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id as string}>
                  {visibleFields.map((f) => {
                    if (f.key === "status") return null;
                    return (
                      <TableCell
                        key={f.key}
                        className={f.key === "name" ? "font-medium" : undefined}
                        title={f.type === "text" ? String(row[f.key] ?? "") : undefined}
                      >
                        {formatValue(f, row[f.key], relationLabels[f.key])}
                      </TableCell>
                    );
                  })}
                  {statusField && (
                    <TableCell>{statusBadge(row["status"])}</TableCell>
                  )}
                  <TableCell className="text-right">
                    <div className="flex justify-end">
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
            {fields.map((f) => (
              <div key={f.key} className="space-y-1.5">
                {f.type === "select" || f.type === "relation" ? (
                  <div className="space-y-1">
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
                ) : (
                  <div className="space-y-1">
                    <Label htmlFor={f.key}>
                      {f.label}
                      {f.required && <span className="text-destructive"> *</span>}
                    </Label>
                    <Input
                      id={f.key}
                      type="text"
                      placeholder={f.hint}
                      {...form.register(f.key)}
                    />
                  </div>
                )}
              </div>
            ))}
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