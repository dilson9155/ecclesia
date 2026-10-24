"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { resetPasswordAction } from "@/app/actions/password-reset";
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

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("A senha deve ter no mínimo 8 caracteres.");
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError("A senha deve conter letras e números.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas informadas não coincidem.");
      return;
    }

    setPending(true);
    try {
      const response = await resetPasswordAction(
        token,
        password,
        confirmPassword
      );
      if (!response.ok) {
        setError(response.error);
        return;
      }
      setDone(true);
    } catch {
      setError("Não foi possível redefinir a senha. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <Card className="w-full">
        <CardHeader>
          <span className="mb-2 flex size-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="size-5" />
          </span>
          <CardTitle className="text-xl">Senha redefinida</CardTitle>
          <CardDescription>
            Sua nova senha foi salva com sucesso. Você já pode acessar o
            sistema.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild className="w-full">
            <Link href="/login">Entrar no sistema</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">Criar nova senha</CardTitle>
        <CardDescription>
          Escolha uma senha forte com pelo menos 8 caracteres, contendo letras e
          números.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">Nova senha</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar nova senha</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button
            type="submit"
            className="w-full"
            disabled={pending || !password || !confirmPassword}
          >
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar nova senha
          </Button>
          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link href="/recuperar-senha">Solicitar um novo link</Link>
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
