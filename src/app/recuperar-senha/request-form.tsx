"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { requestPasswordResetAction } from "@/app/actions/password-reset";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Result = {
  message: string;
  devUrl: string | null;
};

export function RequestPasswordResetForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const response = await requestPasswordResetAction(email);
      if (!response.ok) {
        setError(response.error);
        return;
      }
      setResult({ message: response.message, devUrl: response.devUrl });
    } catch {
      setError("Não foi possível solicitar a recuperação. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  if (result) {
    return (
      <Card className="w-full">
        <CardHeader>
          <span className="mb-2 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MailCheck className="size-5" />
          </span>
          <CardTitle className="text-xl">Verifique seu e-mail</CardTitle>
          <CardDescription>{result.message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {result.devUrl ? (
            <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-medium">Ambiente local: link de teste</p>
              <p className="text-xs">
                O envio de e-mail não está configurado. Use o link abaixo para
                redefinir a senha.
              </p>
              <Link
                href={result.devUrl}
                className="block break-all font-medium underline"
              >
                {result.devUrl}
              </Link>
            </div>
          ) : null}
          <p className="text-sm text-muted-foreground">
            O link expira em 30 minutos e só pode ser usado uma vez.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button asChild className="w-full">
            <Link href="/login">Voltar para o login</Link>
          </Button>
          <button
            type="button"
            className="text-xs text-muted-foreground hover:underline"
            onClick={() => {
              setResult(null);
              setEmail("");
            }}
          >
            Solicitar novamente com outro e-mail
          </button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">Recuperar senha</CardTitle>
        <CardDescription>
          Informe o e-mail da sua conta. Enviaremos um link para criar uma nova
          senha.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recovery-email">E-mail</Label>
            <Input
              id="recovery-email"
              type="email"
              autoComplete="email"
              placeholder="seuemail@igreja.com.br"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button
            type="submit"
            className="w-full"
            disabled={pending || !email}
          >
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Enviar link de recuperação
          </Button>
          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link href="/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para o login
            </Link>
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
