import type { ReactNode } from "react";
import Link from "next/link";
import { requirePermission, can } from "@/lib/rbac";
import { RESOURCES } from "@/modules/registration/definitions";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EstruturaLayout({ children }: { children: ReactNode }) {
  const user = await requirePermission("igrejas.view");

  const visibleResources = [];
  for (const r of RESOURCES) {
    if (r.standalone) continue;
    if (await can(user, r.viewPermission)) visibleResources.push(r);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Estrutura da Igreja</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastro da igreja, suas sedes e congregações
        </p>
      </div>

      <nav className="flex flex-wrap gap-2">
        {visibleResources.map((r) => (
          <Link
            key={r.key}
            href={`/estrutura/${r.key}`}
            className={cn(
              "rounded-full border border-input bg-background px-4 py-1.5 text-sm font-medium",
              "text-muted-foreground shadow-sm transition-colors hover:text-foreground"
            )}
          >
            {r.plural}
          </Link>
        ))}
      </nav>

      <div>{children}</div>
    </div>
  );
}