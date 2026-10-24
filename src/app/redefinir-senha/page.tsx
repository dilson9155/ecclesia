import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ResetPasswordForm } from "./reset-form";

export const metadata: Metadata = {
  title: "Redefinir senha",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";

  return (
    <main className="relative flex min-h-dvh flex-1 items-center justify-center overflow-hidden bg-sidebar px-4 py-10">
      <div className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:22px_22px]" />
      <div className="relative w-full max-w-md">
        <div className="mb-7 flex flex-col items-center text-center sm:mb-8">
          <h1 className="sr-only">Redefinir senha do Ecclesia</h1>
          <Image
            src="/brand/ecclesia-logo.webp"
            alt="Logo Ecclesia"
            width={900}
            height={900}
            priority
            className="mb-5 size-32 rounded-[1.75rem] shadow-2xl shadow-black/30 sm:size-40"
          />
          <p className="max-w-xs text-sm text-sidebar-foreground/65 sm:max-w-sm">
            Gestão administrativa e financeira para igrejas
          </p>
        </div>

        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <Card className="w-full">
            <CardHeader>
              <span className="mb-2 flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="size-5" />
              </span>
              <CardTitle className="text-xl">Link inválido</CardTitle>
              <CardDescription>
                Este link de recuperação está incompleto ou expirou. Solicite
                uma nova recuperação de senha.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/recuperar-senha">Solicitar novo link</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <p className="mt-6 text-center text-xs text-sidebar-foreground/50">
          <Link href="/" className="hover:underline">
            ← Voltar para a página inicial
          </Link>
        </p>
      </div>
    </main>
  );
}
