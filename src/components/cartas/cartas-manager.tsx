"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Download, FileText, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SELECT_INPUT_CLASS } from "@/lib/styles";
import { newLetter, removeLetter } from "@/app/actions/documents";
import type { DocumentType } from "@prisma/client";

type LetterRow = {
  id: string;
  protocol: string | null;
  title: string;
  type: DocumentType;
  issueDate: Date;
  member: { id: string; name: string; code: string } | null;
  congregation: { id: string; name: string } | null;
};

type TemplateItem = { id: string; type: DocumentType; title: string; body: string };
type MemberOption = { id: string; name: string; code: string };

const TYPE_LABELS: Record<DocumentType, string> = {
  APRESENTACAO: "Apresentação",
  TRANSFERENCIA: "Transferência",
  RECOMENDACAO: "Recomendação",
  DECLARACAO_MEMBRO: "Declaração de Membro",
  DECLARACAO_VINCULO: "Declaração de Vínculo",
  DECLARACAO_BATISMO: "Declaração de Batismo",
  PERSONALIZADO: "Personalizado",
};

type FormValues = {
  type: DocumentType;
  templateId: string;
  memberId: string;
  title: string;
  content: string;
  signatureName: string;
};

const PLACEHOLDERS =
  "{nome} · {matricula} · {congregacao} · {igreja} · {cnpj} · {cidade} · {uf} · {batismo} · {admissao} · {data}";

type Props = {
  letters: LetterRow[];
  templates: TemplateItem[];
  members: MemberOption[];
  canCreate: boolean;
  canDelete: boolean;
};

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

export function CartasManager({ letters, templates, members, canCreate, canDelete }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<LetterRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    defaultValues: {
      type: "DECLARACAO_MEMBRO",
      templateId: "",
      memberId: "",
      title: "",
      content: "",
      signatureName: "",
    },
  });

  function applyTemplate(templateId: string) {
    const t = templates.find((x) => x.id === templateId);
    if (!t) return;
    form.setValue("type", t.type);
    form.setValue("title", t.title);
    form.setValue("content", t.body);
  }

  async function handleSubmit(values: FormValues) {
    setBusy(true);
    setError(null);
    const result = await newLetter({
      type: values.type,
      templateId: values.templateId || null,
      memberId: values.memberId || null,
      title: values.title || null,
      content: values.content || null,
      signatureName: values.signatureName || null,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Erro ao gerar documento.");
      return;
    }
    form.reset();
    setOpen(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    setError(null);
    const result = await removeLetter(deleting.id);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Erro ao excluir documento.");
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

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Cartas e Declarações</h1>
          <p className="text-sm text-muted-foreground">
            Documentos oficiais da igreja com protocolo e assinatura
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova carta
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Protocolo</th>
                <th className="px-4 py-2.5 font-medium">Título</th>
                <th className="px-4 py-2.5 font-medium">Tipo</th>
                <th className="px-4 py-2.5 font-medium">Membro</th>
                <th className="px-4 py-2.5 font-medium">Emissão</th>
                <th className="px-4 py-2.5 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {letters.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum documento gerado ainda.
                  </td>
                </tr>
              )}
              {letters.map((letter) => (
                <tr key={letter.id} className="border-b last:border-0">
                  <td className="px-4 py-2.5 font-medium">{letter.protocol ?? "—"}</td>
                  <td className="px-4 py-2.5">{letter.title}</td>
                  <td className="px-4 py-2.5">{TYPE_LABELS[letter.type]}</td>
                  <td className="px-4 py-2.5">{letter.member?.name ?? "—"}</td>
                  <td className="px-4 py-2.5">{formatDate(letter.issueDate)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <a href={`/api/documents/${letter.id}/pdf`} target="_blank" rel="noreferrer">
                        <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                          <Download className="mr-1 h-3.5 w-3.5" />
                          PDF
                        </Button>
                      </a>
                      {canDelete && (
                        <Button variant="ghost" size="icon" disabled={busy} onClick={() => setDeleting(letter)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Nova carta
            </DialogTitle>
            <DialogDescription>
              Escolha um modelo ou escreva o texto livremente. Use os placeholders abaixo para
              preenchimento automático.
            </DialogDescription>
          </DialogHeader>
          <form id="letter-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="templateId">Modelo</Label>
                <select
                  id="templateId"
                  className={SELECT_INPUT_CLASS}
                  {...form.register("templateId", {
                    onChange: (e) => applyTemplate(e.target.value),
                  })}
                >
                  <option value="">— Personalizado —</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="type">Tipo</Label>
                <select id="type" className={SELECT_INPUT_CLASS} {...form.register("type")}>
                  {(Object.keys(TYPE_LABELS) as DocumentType[]).map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="memberId">Membro (opcional)</Label>
                <select id="memberId" className={SELECT_INPUT_CLASS} {...form.register("memberId")}>
                  <option value="">Sem vínculo</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="signatureName">Assinatura</Label>
                <Input id="signatureName" placeholder="Nome de quem assina" {...form.register("signatureName")} />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="title">Título</Label>
              <Input id="title" placeholder="Título do documento" {...form.register("title")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="content">Conteúdo</Label>
              <textarea
                id="content"
                rows={7}
                className={`${SELECT_INPUT_CLASS} h-auto min-h-32 py-2`}
                {...form.register("content")}
              />
              <p className="text-xs text-muted-foreground">{PLACEHOLDERS}</p>
            </div>
          </form>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="letter-form" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Gerar documento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir documento</DialogTitle>
            <DialogDescription>
              Deseja excluir o documento &quot;{deleting?.title}&quot; ({deleting?.protocol})? Esta ação não
              poderá ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleting(null)}>
              Voltar
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}