import type { ReactNode } from "react";
import { requireAuth } from "@/lib/rbac";
import { AppShell, type NavItem } from "@/components/app-shell";

type NavEntry = NavItem & { permission?: string };

const NAV_ITEMS: NavEntry[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: "dashboard",
  },
  {
    key: "estrutura",
    label: "Estrutura",
    href: "/estrutura",
    icon: "igrejas",
    permission: "igrejas.view",
  },
  {
    key: "membros",
    label: "Membros",
    href: "/membros",
    icon: "membros",
    permission: "membros.view",
  },
  {
    key: "visitantes",
    label: "Visitantes",
    href: "/visitantes",
    icon: "visitantes",
    permission: "visitantes.view",
  },
  {
    key: "carteirinhas",
    label: "Carteirinhas",
    href: "/carteirinhas",
    icon: "carteirinhas",
    permission: "carteirinhas.view",
  },
  {
    key: "cartas",
    label: "Cartas",
    href: "/cartas",
    icon: "cartas",
    permission: "cartas.view",
  },
  {
    key: "plano-contas",
    label: "Plano de Contas",
    href: "/plano-contas",
    icon: "contas",
    permission: "planoContas.view",
  },
  {
    key: "centros-custo",
    label: "Centros de Custo",
    href: "/centros-custo",
    icon: "centrosCusto",
    permission: "centrosCusto.view",
  },
  {
    key: "dizimos",
    label: "Dízimos",
    href: "/dizimos",
    icon: "dizimos",
    permission: "dizimos.view",
  },
  {
    key: "ofertas",
    label: "Ofertas",
    href: "/ofertas",
    icon: "ofertas",
    permission: "ofertas.view",
  },
  {
    key: "fornecedores",
    label: "Fornecedores",
    href: "/fornecedores",
    icon: "fornecedores",
    permission: "fornecedores.view",
  },
  {
    key: "entradas",
    label: "Entradas",
    href: "/entradas",
    icon: "entradas",
    permission: "entradas.view",
  },
  {
    key: "saidas",
    label: "Saídas",
    href: "/saidas",
    icon: "saidas",
    permission: "saidas.view",
  },
  {
    key: "livro-caixa",
    label: "Livro Caixa",
    href: "/livro-caixa",
    icon: "livroCaixa",
    permission: "livroCaixa.view",
  },
  {
    key: "fechamento",
    label: "Fechamento",
    href: "/fechamento",
    icon: "fechamento",
    permission: "fechamento.view",
  },
];

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireAuth();

  const hasPermission = (permission?: string) =>
    !permission ||
    user.permissions.includes("*") ||
    user.permissions.includes(permission);

  const navItems: NavItem[] = NAV_ITEMS.filter((item) =>
    hasPermission(item.permission)
  ).map((item) => ({
    key: item.key,
    label: item.label,
    href: item.href,
    icon: item.icon,
  }));

  return (
    <AppShell
      userName={user.name ?? ""}
      userEmail={user.email ?? ""}
      navItems={navItems}
    >
      {children}
    </AppShell>
  );
}