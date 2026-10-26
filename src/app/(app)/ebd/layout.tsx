import type { ReactNode } from "react";
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
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          EBD — Escola Bíblica Dominical
        </h1>
        <p className="text-sm text-muted-foreground">
          Alunos, professores, classes, lições do trimestre, chamadas e relatórios
          pedagógicos.
        </p>
      </div>
      <EbdNav allowed={allowed} />
      {children}
    </div>
  );
}
