import Link from "next/link";
import { Suspense } from "react";
import { Church } from "lucide-react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-dvh flex-1 items-center justify-center overflow-hidden bg-sidebar px-4">
      <div className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:22px_22px]" />
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground">
            <Church className="size-7" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-sidebar-foreground">
            Ecclesia
          </h1>
          <p className="mt-1 text-sm text-sidebar-foreground/60">
            Gestão administrativa e financeira para igrejas
          </p>
        </div>

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>

        <p className="mt-6 text-center text-xs text-sidebar-foreground/50">
          <Link href="/" className="hover:underline">
            ← Voltar para a página inicial
          </Link>
        </p>
      </div>
    </main>
  );
}