"use client";

/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  ImagePlus,
  Loader2,
  PenLine,
  Save,
  Trash2,
  UserRoundCheck,
  Wallet,
} from "lucide-react";
import type { ChurchBranding } from "@/services/branding.service";
import { saveBranding } from "@/app/actions/branding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ImageKind = "logo" | "pastor" | "secretary" | "treasurer";

type Props = {
  branding: ChurchBranding;
  canEdit: boolean;
};

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Formato de imagem não suportado."));
    image.src = src;
  });
}

async function optimizeImage(file: File, maxDimension: number): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Selecione um arquivo de imagem (PNG ou JPG).");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("A imagem deve ter no máximo 8 MB.");
  }

  const dataUrl = await readAsDataUrl(file);
  const image = await loadImage(dataUrl);
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível processar a imagem.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.9);
}

function ImagePicker({
  kind,
  label,
  hint,
  value,
  canEdit,
  onChange,
  onRemove,
  onError,
}: {
  kind: ImageKind;
  label: string;
  hint: string;
  value: string | null;
  canEdit: boolean;
  onChange: (value: string | null) => void;
  onRemove: () => void;
  onError: (message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);
  const maxDimension = kind === "logo" ? 900 : 700;

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setReading(true);
    try {
      onChange(await optimizeImage(file, maxDimension));
    } catch (error) {
      onError((error as Error).message);
    } finally {
      setReading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-20 w-32 items-center justify-center overflow-hidden rounded-lg border border-dashed bg-muted/30">
          {value ? (
            <img src={value} alt={label} className="max-h-full max-w-full object-contain" />
          ) : (
            <ImagePlus className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="space-y-1.5">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canEdit || reading}
              onClick={() => inputRef.current?.click()}
            >
              {reading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ImagePlus className="mr-2 h-4 w-4" />
              )}
              {value ? "Trocar imagem" : "Enviar imagem"}
            </Button>
            {value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!canEdit || reading}
                onClick={onRemove}
              >
                <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                Remover
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        disabled={!canEdit}
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
    </div>
  );
}

export function BrandingManager({ branding, canEdit }: Props) {
  const router = useRouter();
  const [logoUrl, setLogoUrl] = useState<string | null>(branding.logoUrl);
  const [pastorName, setPastorName] = useState(branding.pastor.name);
  const [pastorSignature, setPastorSignature] = useState<string | null>(
    branding.pastor.imageUrl
  );
  const [secretaryName, setSecretaryName] = useState(branding.secretary.name);
  const [secretarySignature, setSecretarySignature] = useState<string | null>(
    branding.secretary.imageUrl
  );
  const [treasurerName, setTreasurerName] = useState(branding.treasurer.name);
  const [treasurerSignature, setTreasurerSignature] = useState<string | null>(
    branding.treasurer.imageUrl
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSave() {
    setBusy(true);
    setError(null);
    setSuccess(null);
    const result = await saveBranding({
      logoUrl,
      pastorName,
      pastorSignatureUrl: pastorSignature,
      secretaryName,
      secretarySignatureUrl: secretarySignature,
      treasurerName,
      treasurerSignatureUrl: treasurerSignature,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Erro ao salvar a identidade visual.");
      return;
    }
    setSuccess("Identidade visual atualizada. Os próximos PDFs já usarão as novas imagens.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" />
            Logo da igreja
          </CardTitle>
          <CardDescription>
            A imagem aparece no cabeçalho de relatórios, cartas e carteirinhas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <ImagePicker
            kind="logo"
            label="Logo institucional"
            hint="Prefira uma imagem quadrada, com fundo branco ou transparente."
            value={logoUrl}
            canEdit={canEdit}
            onChange={setLogoUrl}
            onRemove={() => setLogoUrl(null)}
            onError={setError}
          />
          <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <p>
              <span className="font-medium text-foreground">Igreja:</span> {branding.name}
            </p>
            <p>
              <span className="font-medium text-foreground">CNPJ:</span>{" "}
              {branding.cnpj || "não informado"}
            </p>
            <p>
              <span className="font-medium text-foreground">Telefone:</span>{" "}
              {branding.phone || "não informado"}
            </p>
            <p>
              <span className="font-medium text-foreground">E-mail:</span>{" "}
              {branding.email || "não informado"}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PenLine className="h-4 w-4" />
              Pastor
            </CardTitle>
            <CardDescription>Assinatura usada em cartas e relatórios financeiros.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="pastorName">Nome do pastor</Label>
              <Input
                id="pastorName"
                value={pastorName}
                disabled={!canEdit}
                placeholder="Pastor responsável"
                onChange={(event) => setPastorName(event.target.value)}
              />
            </div>
            <ImagePicker
              kind="pastor"
              label="Assinatura do pastor"
              hint="Envie uma foto nítida da assinatura, de preferência em fundo branco."
              value={pastorSignature}
              canEdit={canEdit}
              onChange={setPastorSignature}
              onRemove={() => setPastorSignature(null)}
              onError={setError}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRoundCheck className="h-4 w-4" />
              Secretário(a)
            </CardTitle>
            <CardDescription>Assinatura usada nas cartas e declarações.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="secretaryName">Nome do secretário(a)</Label>
              <Input
                id="secretaryName"
                value={secretaryName}
                disabled={!canEdit}
                placeholder="Secretário(a) responsável"
                onChange={(event) => setSecretaryName(event.target.value)}
              />
            </div>
            <ImagePicker
              kind="secretary"
              label="Assinatura do secretário(a)"
              hint="A assinatura aparece ao lado da assinatura pastoral nas cartas."
              value={secretarySignature}
              canEdit={canEdit}
              onChange={setSecretarySignature}
              onRemove={() => setSecretarySignature(null)}
              onError={setError}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-4 w-4" />
              Tesoureiro(a)
            </CardTitle>
            <CardDescription>Assinatura usada nos relatórios financeiros.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="treasurerName">Nome do tesoureiro(a)</Label>
              <Input
                id="treasurerName"
                value={treasurerName}
                disabled={!canEdit}
                placeholder="Tesoureiro(a) responsável"
                onChange={(event) => setTreasurerName(event.target.value)}
              />
            </div>
            <ImagePicker
              kind="treasurer"
              label="Assinatura do tesoureiro(a)"
              hint="A assinatura aparece ao lado da assinatura pastoral nos relatórios financeiros."
              value={treasurerSignature}
              canEdit={canEdit}
              onChange={setTreasurerSignature}
              onRemove={() => setTreasurerSignature(null)}
              onError={setError}
            />
          </CardContent>
        </Card>
      </div>

      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={busy} className="w-full sm:w-auto">
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar identidade visual
          </Button>
        </div>
      )}
    </div>
  );
}
