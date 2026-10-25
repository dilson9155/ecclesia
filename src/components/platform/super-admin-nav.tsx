"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/super-admin", label: "Visão geral" },
  { href: "/super-admin/igrejas", label: "Igrejas" },
  { href: "/super-admin/cobrancas", label: "Cobranças" },
  { href: "/super-admin/notificacoes", label: "Notificações" },
  { href: "/super-admin/planos", label: "Planos" },
];

export function SuperAdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex w-full items-center gap-1 overflow-x-auto lg:w-auto">
      {ITEMS.map((item) => {
        const active =
          item.href === "/super-admin"
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "shrink-0 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
