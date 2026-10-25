"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BellRing,
  Loader2,
  Megaphone,
  Pencil,
  Plus,
  Power,
  Trash2,
} from "lucide-react";
import {
  createNoticeAction,
  deleteNoticeAction,
  setNoticeActiveAction,
  updateNoticeAction,
} from "@/app/actions/notices";
import type { NoticeView } from "@/services/notices.service";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Level = "INFO" | "ALERTA" | "URGENTE";

type FormState = {
  title: string;
  message: string;
  level: Level;
  active: boolean;
  expiresAt: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  message: "",
  level: "INFO",
  active: true,
  expiresAt: "",
};

const LEVEL_LABELS: Record<Level, string> = {
  INFO: "Informativo",
  ALERTA: "Alerta",
  URGENTE: "Urgente",
};

const LEVEL_CLASSES: Record<Level, string> = {
  INFO: "border-sky-200 bg-sky-50 text-sky-700",
  ALERTA: "border-amber-200 bg-amber-50 text-amber-700",
  URGENTE: "border-destructive/30 bg-destructive/10 text-destructive",
};

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("pt-BR");
}

export function NoticesManager({ notices }: { notices: NoticeView[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<NoticeView | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setError(null);
    setSuccess(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  }

  function openEdit(notice: NoticeView) {
    setEditing(notice);
    setError(null);
    setSuccess(null);
    setForm({
      title: notice.title,
      message: notice.message,
      level: notice.level,
      active: notice.active,
      expiresAt: notice.expiresAt?.slice(0, 10) ?? "",
    });
    setOpen(true);
  }

  async function handleSubmit() {
    setError(null);
    setSuccess(null);
    if (!form.title.trim() || !form.message.trim()) {
      setError("Informe o título e a mensagem.");
      return;
    }

    const payload = {
      title: form.title.trim(),
      message: form.message.trim(),
      level: form.level,
      active: form.active,
      expiresAt: form.expiresAt || null,
    };

    setBusy(true);
    const result = editing
      ? await updateNoticeAction(editing.id, payload)
      : await createNoticeAction(payload);
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    setSuccess(
      editing
        ? "Comunicado atualizado. As igrejas já veem a nova versão."
        : "Comunicado publicado para todas as igrejas e congregações."
    );
    router.refresh();
  }

  async function handleToggle(notice: NoticeView) {
    setBusyId(notice.id);
    setError(null);
    const result = await setNoticeActiveAction(notice.id, !notice.active);
    setBusyId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSuccess(
      notice.active ? "Comunicado desativado." : "Comunicado reativado."
    );
    router.refresh();
  }

  async function handleDelete(notice: NoticeView) {
    if (
      !window.confirm(`Remover definitivamente o comunicado "${notice.title}"?`)
    ) {
      return;
    }
    setBusyId(notice.id);
    setError(null);
    const result = await deleteNoticeAction(notice.id);
    setBusyId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSuccess("Comunicado removido.");
    router.refresh();
  }

  const activeCount = notices.filter(
    (notice) =>
      notice.active &&
      (!notice.expiresAt || new Date(notice.expiresAt) >= new Date())
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight sm:text-2xl">
            <Megaphone className="h-5 w-5" />
            Notificações da plataforma
          </h1>
          <p className="text-sm text-muted-foreground">
            Publique avisos que aparecem no sino de todas as igrejas e
            congregações.
          </p>
        </div>
        <Button onClick={openCreate} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Novo comunicado
        </Button>
      </div>

      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </p>
      ) : null}

      <div className="flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
        <BellRing className="h-4 w-4 shrink-0" />
        {activeCount === 0
          ? "Nenhum comunicado ativo no momento."
          : `${activeCount} comunicado(s) ativo(s) visível(is) nas igrejas.`}
      </div>

      {notices.length === 0 ? (
        <p className="rounded-lg border bg-card px-3 py-10 text-center text-sm text-muted-foreground">
          Nenhum comunicado publicado ainda.
        </p>
      ) : (
        <div className="space-y-3">
          {notices.map((notice) => {
            const expired =
              notice.expiresAt && new Date(notice.expiresAt) < new Date();
            const visible = notice.active && !expired;
            return (
              <Card key={notice.id}>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{notice.title}</p>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                            LEVEL_CLASSES[notice.level]
                          )}
                        >
                          {LEVEL_LABELS[notice.level]}
                        </span>
                        <Badge variant={visible ? "default" : "outline"}>
                          {visible
                            ? "Visível"
                            : expired
                              ? "Expirado"
                              : "Desativado"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Publicado em {formatDateTime(notice.publishedAt)}
                        {notice.expiresAt
                          ? ` · expira em ${formatDate(notice.expiresAt)}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Editar comunicado"
                        title="Editar comunicado"
                        onClick={() => openEdit(notice)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={
                          notice.active
                            ? "Desativar comunicado"
                            : "Reativar comunicado"
                        }
                        title={
                          notice.active
                            ? "Desativar comunicado"
                            : "Reativar comunicado"
                        }
                        disabled={busyId === notice.id}
                        onClick={() => void handleToggle(notice)}
                      >
                        {busyId === notice.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Power
                            className={cn(
                              "h-4 w-4",
                              notice.active
                                ? "text-emerald-600"
                                : "text-muted-foreground"
                            )}
                          />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Remover comunicado"
                        title="Remover comunicado"
                        disabled={busyId === notice.id}
                        onClick={() => void handleDelete(notice)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <p className="whitespace-pre-line text-sm text-muted-foreground">
                    {notice.message}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar comunicado" : "Novo comunicado"}
            </DialogTitle>
            <DialogDescription>
              O comunicado aparece imediatamente no sino de todas as igrejas e
              congregações.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="notice-title">Título *</Label>
              <Input
                id="notice-title"
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="Manutenção programada"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notice-message">Mensagem *</Label>
              <Textarea
                id="notice-message"
                rows={4}
                value={form.message}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    message: event.target.value,
                  }))
                }
                placeholder="Escreva o comunicado para as igrejas…"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Nível</Label>
                <Select
                  value={form.level}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      level: value as Level,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INFO">Informativo</SelectItem>
                    <SelectItem value="ALERTA">Alerta</SelectItem>
                    <SelectItem value="URGENTE">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notice-expires">Expira em</Label>
                <Input
                  id="notice-expires"
                  type="date"
                  value={form.expiresAt}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      expiresAt: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4"
                checked={form.active}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    active: event.target.checked,
                  }))
                }
              />
              Publicar imediatamente
            </label>

            {error ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={() => void handleSubmit()} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editing ? "Salvar" : "Publicar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
