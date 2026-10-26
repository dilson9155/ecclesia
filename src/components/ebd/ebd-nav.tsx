"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/ebd", label: "Visão geral" },
  { href: "/ebd/alunos", label: "Alunos" },
  { href: "/ebd/professores", label: "Professores" },
  { href: "/ebd/classes", label: "Classes" },
  { href: "/ebd/licoes", label: "Lições do trimestre" },
  { href: "/ebd/chamadas", label: "Chamadas" },
  { href: "/ebd/relatorios", label: "Relatórios" },
];

export function EbdNav({ allowed }: { allowed: string[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto rounded-lg border bg-muted/30 p-1">
      {ITEMS.filter((item) => allowed.includes(item.href)).map((item) => {
        const active =
          item.href === "/ebd"
            ? pathname === "/ebd"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-background text-foreground shadow-sm ring-1 ring-foreground/10"
                : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
