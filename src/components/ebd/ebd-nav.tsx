"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  UserRound,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/ebd", label: "Visão geral", icon: LayoutDashboard },
  { href: "/ebd/alunos", label: "Alunos", icon: Users },
  { href: "/ebd/professores", label: "Professores", icon: UserRound },
  { href: "/ebd/classes", label: "Classes", icon: GraduationCap },
  { href: "/ebd/licoes", label: "Lições do trimestre", icon: BookOpen },
  { href: "/ebd/chamadas", label: "Chamadas", icon: ClipboardList },
  { href: "/ebd/relatorios", label: "Relatórios", icon: BarChart3 },
];

export function EbdNav({ allowed }: { allowed: string[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto rounded-xl border border-border/70 bg-card/80 p-1 shadow-sm backdrop-blur [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {ITEMS.filter((item) => allowed.includes(item.href)).map((item) => {
        const active =
          item.href === "/ebd"
            ? pathname === "/ebd"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200",
              active
                ? "bg-gradient-to-b from-primary to-primary/90 text-primary-foreground shadow-sm shadow-primary/25"
                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
            )}
          >
            <Icon
              className={cn(
                "size-4 transition-opacity",
                active ? "opacity-100" : "opacity-60 group-hover:opacity-100"
              )}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
