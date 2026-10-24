"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DocumentType } from "@prisma/client";
import { FileText, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  removeTemplate,
  saveTemplate,
} from "@/app/actions/letter-templates";

type TemplateRow = {
  id: string;
  type: DocumentType;
  title: string;
  body: string;
  active: boolean;
};

type Props = {
  templates: TemplateRow[];
  canEdit: boolean;
};

const TYPE_LABELS: Record<DocumentType, string> = {
  APRESENTACAO: "Apresentação",
  TRANSFERENCIA: "Transferência",
  RECOMENDACAO: "Recomendação",
  DECLARACAO_MEMBRO: "Declaração de Membro",
  DECLARACAO_VINCULO: "Declaração de Vínculo",
  DECLARACAO_BATISMO: "Declaração de Batismo",
  PERSONALIZADO: "Personalizado",
};

const PLACEHOLDERS = [
  "{nome}",
  "{matricula}",
  "{cpf}",
  "{rg}",
  "{nascimento}",
  "{estado_civil}",
  "{congregacao}",
  "{sede}",
  "{cidade}",
  "{uf}",
  "{endereco}",
  "{bairro}",
  "{cep}",
  "{telefone}",
  "{email}",
  "{batismo}",
  "{admissao}",
  "{cargo}",
  "{ministerio}",
  "{departamento}",
  "{pastor}",
  "{secretario}",
  "{tesoureiro}",
  "{igreja}",
  "{cnpj}",
  "{data}",
];

type FormState = {
  id: string | null;
  type: DocumentType;
  title: string;
  body: string;
  active: boolean;
};

const EMPTY_FORM: FormState = {
  id: null,
  type: "DECLARACAO_MEMBRO",
  title: "",
  body: "",
  active: true,
};

export function LetterTemplatesManager({ templates, canEdit }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<TemplateRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setForm(EMPTY_FORM);
    setError(null);
    setOpen(true);
  }

  function openEdit(template: TemplateRow) {
    setForm({
      id: template.id,
      type: template.type,
      title: template.title,
      body: template.body,
      active: template.active,
    });
    setError(null);
    setOpen(true);
  }

  async function handleSave() {
    setBusy(true);
    setError(null);
    const result = await saveTemplate({
      id: form.id,
      type: form.type,
      title: form.title,
      body: form.body,
      active: form.active,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Erro ao salvar o modelo.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    setError(null);
    const result = await removeTemplate(deleting.id);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Erro ao excluir o modelo.");
      return;
    }
    setDeleting(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <FileText className="h-4 w-4" />
            Modelos de cartas e declarações
          </h2>
          <p className="text-sm text-muted-foreground">
            Configure os textos que serão preenchidos automaticamente ao gerar uma carta.
          </p>
        </div>
        {canEdit && (
          <Button onClick={openCreate} size="sm" className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Novo modelo
          </Button>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {templates.length === 0 && (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground md:col-span-2">
            Nenhum modelo cadastrado. Crie o primeiro modelo para agilizar a emissão das cartas.
          </div>
        )}
        {templates.map((template) => (
          <div key={template.id} className="rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{template.title}</p>
                <p className="text-xs text-muted-foreground">{TYPE_LABELS[template.type]}</p>
              </div>
              <Badge variant={template.active ? "default" : "secondary"}>
                {template.active ? "Ativo" : "Inativo"}
              </Badge>
            </div>
            <p className="mt-3 line-clamp-4 whitespace-pre-line text-sm text-muted-foreground">
              {template.body}
            </p>
            {canEdit && (
              <div className="mt-3 flex justify-end gap-1">
                <Button variant="ghost" size="sm" onClick={() => openEdit(template)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" />
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setError(null);
                    setDeleting(template);
                  }}
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5 text-destructive" />
                  Excluir
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar modelo" : "Novo modelo de carta"}</DialogTitle>
            <DialogDescription>
              Use os marcadores para que os dados do membro e da igreja sejam preenchidos
              automaticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="templateType">Tipo</Label>
                <select
                  id="templateType"
                  className={SELECT_INPUT_CLASS}
                  value={form.type}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      type: event.target.value as DocumentType,
                    }))
                  }
                >
                  {(Object.keys(TYPE_LABELS) as DocumentType[]).map((type) => (
                    <option key={type} value={type}>
                      {TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="templateTitle">Título do modelo</Label>
                <Input
                  id="templateTitle"
                  value={form.title}
                  placeholder="Ex.: Declaração de membro"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, title: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="templateBody">Texto do modelo</Label>
              <textarea
                id="templateBody"
                rows={10}
                className={`${SELECT_INPUT_CLASS} h-auto min-h-52 py-2 font-mono text-xs`}
                value={form.body}
                placeholder="Escreva aqui o texto da carta..."
                onChange={(event) =>
                  setForm((current) => ({ ...current, body: event.target.value }))
                }
              />
              <div className="flex flex-wrap gap-1 pt-1">
                {PLACEHOLDERS.map((placeholder) => (
                  <button
                    key={placeholder}
                    type="button"
                    className="rounded border bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground hover:bg-muted"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        body: `${current.body}${placeholder}`,
                      }))
                    }
                  >
                    {placeholder}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) =>
                  setForm((current) => ({ ...current, active: event.target.checked }))
                }
              />
              Modelo disponível para uso
            </label>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar modelo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(value) => !value && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir modelo</DialogTitle>
            <DialogDescription>
              Deseja excluir o modelo &quot;{deleting?.title}&quot;? Se já houver cartas
              emitidas com ele, o modelo será apenas arquivado.
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Voltar
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
