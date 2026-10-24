import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { RequestPasswordResetForm } from "./request-form";

export const metadata: Metadata = {
  title: "Recuperar senha",
};

export default function RequestPasswordResetPage() {
  return (
    <main className="relative flex min-h-dvh flex-1 items-center justify-center overflow-hidden bg-sidebar px-4 py-10">
      <div className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:22px_22px]" />
      <div className="relative w-full max-w-md">
        <div className="mb-7 flex flex-col items-center text-center sm:mb-8">
          <h1 className="sr-only">Recuperar senha do Ecclesia</h1>
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

        <RequestPasswordResetForm />

        <p className="mt-6 text-center text-xs text-sidebar-foreground/50">
          <Link href="/" className="hover:underline">
            ← Voltar para a página inicial
          </Link>
        </p>
      </div>
    </main>
  );
}
