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