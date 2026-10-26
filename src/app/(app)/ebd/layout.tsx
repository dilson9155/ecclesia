import type { ReactNode } from "react";
import { can, requirePermission } from "@/lib/rbac";
import { EbdNav } from "@/components/ebd/ebd-nav";

export const dynamic = "force-dynamic";

export default async function EbdLayout({ children }: { children: ReactNode }) {
  const user = await requirePermission("ebd.view");

  const allowed = [
    "/ebd",
    "/ebd/alunos",
    "/ebd/professores",
    "/ebd/classes",
    "/ebd/licoes",
    "/ebd/chamadas",
  ];
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
