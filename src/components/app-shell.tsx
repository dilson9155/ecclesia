"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Church,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  UserPlus,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

export type NavItem = {
  key: string;
  label: string;
  href: string;
  icon?: "dashboard" | "igrejas" | "membros" | "visitantes" | "financeiro" | "relatorios" | "admin";
};

const NAV_ICONS: Record<NonNullable<NavItem["icon"]>, ReactNode> = {
  dashboard: <LayoutDashboard className="h-4 w-4" />,
  igrejas: <Building2 className="h-4 w-4" />,
  membros: <Users className="h-4 w-4" />,
  visitantes: <UserPlus className="h-4 w-4" />,
  financeiro: <Wallet className="h-4 w-4" />,
  relatorios: <FileText className="h-4 w-4" />,
  admin: <Settings className="h-4 w-4" />,
};

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-4 py-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Church className="size-5" />
      </span>
      <div className="leading-tight">
        <p className="text-sm font-semibold tracking-tight text-sidebar-foreground">
          Ecclesia
        </p>
        <p className="text-[11px] text-sidebar-foreground/60">
          Gestão de Igrejas
        </p>
      </div>
    </div>
  );
}

function NavContent({
  navItems,
  pathname,
  onNavigate,
}: {
  navItems: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 space-y-1 p-2">
      {navItems.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.key}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            {item.icon ? NAV_ICONS[item.icon] : null}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function UserFooter({ userName, userEmail }: { userName: string; userEmail: string }) {
  return (
    <div className="border-t border-sidebar-border p-3">
      <p className="truncate text-xs font-medium text-sidebar-foreground">
        {userName}
      </p>
      <p className="truncate text-xs text-sidebar-foreground/60">{userEmail}</p>
    </div>
  );
}

function Sidebar({
  navItems,
  userName,
  userEmail,
}: {
  navItems: NavItem[];
  userName: string;
  userEmail: string;
}) {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <Brand />
      <NavContent navItems={navItems} pathname={pathname} />
      <UserFooter userName={userName} userEmail={userEmail} />
    </aside>
  );
}

export function AppShell({
  userName,
  userEmail,
  navItems,
  children,
}: {
  userName: string;
  userEmail: string;
  navItems: NavItem[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-background">
      <Sidebar navItems={navItems} userName={userName} userEmail={userEmail} />

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-sidebar-border bg-sidebar">
            <div className="flex items-center justify-between pr-2">
              <Brand />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(false)}
                className="text-sidebar-foreground/70"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <NavContent navItems={navItems} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            <UserFooter userName={userName} userEmail={userEmail} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <p className="font-semibold leading-none">Painel de gestão</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Administração eclesiástica
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={async () => {
              await logout();
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </header>
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}