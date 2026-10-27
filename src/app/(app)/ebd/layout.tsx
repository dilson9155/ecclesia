import type { ReactNode } from "react";
import { BookOpen } from "lucide-react";
import { can, requirePermission } from "@/lib/rbac";
import { isEbdTeacherOnly } from "@/lib/ebd-scope";
import { EbdNav } from "@/components/ebd/ebd-nav";

export const dynamic = "force-dynamic";

export default async function EbdLayout({ children }: { children: ReactNode }) {
  const user = await requirePermission("ebd.view");

  const professorOnly = isEbdTeacherOnly(user);
  const allowed = ["/ebd", "/ebd/alunos", "/ebd/licoes", "/ebd/chamadas"];
  if (!professorOnly) {
    allowed.push("/ebd/professores", "/ebd/classes");
  }
  if (await can(user, "ebd.reports")) allowed.push("/ebd/relatorios");

  return (
    <div className="space-y-4 sm:space-y-5">
      <header className="relative overflow-hidden rounded-2xl border bg-card px-4 py-4 shadow-sm sm:px-5">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-24 size-56 rounded-full bg-primary/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-28 left-1/4 size-64 rounded-full bg-amber-400/10 blur-3xl"
        />
        <div className="relative flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/75 text-primary-foreground shadow-sm ring-1 ring-primary/25">
            <BookOpen className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/80">
              Escola Bíblica Dominical
            </p>
            <h1 className="mt-0.5 text-lg font-semibold tracking-tight sm:text-xl">
              EBD
            </h1>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              Alunos, professores, classes, lições do trimestre, chamadas e
              relatórios pedagógicos.
            </p>
          </div>
        </div>
      </header>
      <EbdNav allowed={allowed} />
      {children}
    </div>
  );
}
