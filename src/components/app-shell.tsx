"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  BookText,
  CreditCard,
  FileText,
  Gift,
  HandCoins,
  Landmark,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  ScrollText,
  Settings,
  Tags,
  TrendingDown,
  TrendingUp,
  Truck,
  UserCog,
  UserPlus,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/actions/auth";
import { InstallAppButton } from "@/components/install-app-button";
import { cn } from "@/lib/utils";

export type NavItem = {
  key: string;
  label: string;
  href: string;
  icon?: "dashboard" | "igrejas" | "usuarios" | "membros" | "visitantes" | "carteirinhas" | "cartas" | "financeiro" | "contas" | "centrosCusto" | "dizimos" | "ofertas" | "fornecedores" | "entradas" | "saidas" | "livroCaixa" | "fechamento" | "relatorios" | "admin";
};

export type NavGroup = {
  title?: string;
  items: NavItem[];
};

const NAV_ICONS: Record<NonNullable<NavItem["icon"]>, ReactNode> = {
  dashboard: <LayoutDashboard className="h-4 w-4" />,
  igrejas: <Building2 className="h-4 w-4" />,
  usuarios: <UserCog className="h-4 w-4" />,
  membros: <Users className="h-4 w-4" />,
  visitantes: <UserPlus className="h-4 w-4" />,
  carteirinhas: <CreditCard className="h-4 w-4" />,
  cartas: <ScrollText className="h-4 w-4" />,
  financeiro: <Wallet className="h-4 w-4" />,
  contas: <Landmark className="h-4 w-4" />,
  centrosCusto: <Tags className="h-4 w-4" />,
  dizimos: <HandCoins className="h-4 w-4" />,
  ofertas: <Gift className="h-4 w-4" />,
  fornecedores: <Truck className="h-4 w-4" />,
  entradas: <TrendingUp className="h-4 w-4" />,
  saidas: <TrendingDown className="h-4 w-4" />,
  livroCaixa: <BookText className="h-4 w-4" />,
  fechamento: <Lock className="h-4 w-4" />,
  relatorios: <FileText className="h-4 w-4" />,
  admin: <Settings className="h-4 w-4" />,
};

function Brand() {
  return (
    <div className="flex min-w-0 items-center gap-2.5 px-4 py-4">
      <Image
        src="/brand/ecclesia-icon.webp"
        alt="Ecclesia"
        width={36}
        height={36}
        className="size-9 shrink-0 rounded-lg object-contain"
      />
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-semibold tracking-tight text-sidebar-foreground">
          Ecclesia
        </p>
        <p className="truncate text-[11px] text-sidebar-foreground/60">
          Gestão de Igrejas
        </p>
      </div>
    </div>
  );
}

function NavContent({
  groups,
  pathname,
  onNavigate,
}: {
  groups: NavGroup[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 overflow-y-auto p-2 space-y-1">
      {groups.map((group, i) => (
        <div key={group.title ?? `group-${i}`} className={i > 0 ? "mt-4" : ""}>
          {group.title && (
            <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              {group.title}
            </p>
          )}
          <div className="space-y-1">
            {group.items.map((item) => {
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
          </div>
        </div>
      ))}
    </nav>
  );
}

function UserFooter({ userName, userEmail }: { userName: string; userEmail: string }) {
  return (
    <div className="border-t border-sidebar-border p-3">
      <InstallAppButton className="mb-3 w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" />
      <p className="truncate text-xs font-medium text-sidebar-foreground">
        {userName}
      </p>
      <p className="truncate text-xs text-sidebar-foreground/60">{userEmail}</p>
    </div>
  );
}

function Sidebar({
  groups,
  userName,
  userEmail,
}: {
  groups: NavGroup[];
  userName: string;
  userEmail: string;
}) {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <Brand />
      <NavContent groups={groups} pathname={pathname} />
      <UserFooter userName={userName} userEmail={userEmail} />
    </aside>
  );
}

export function AppShell({
  userName,
  userEmail,
  navGroups,
  children,
}: {
  userName: string;
  userEmail: string;
  navGroups: NavGroup[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-background">
      <Sidebar groups={navGroups} userName={userName} userEmail={userEmail} />

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(18rem,85vw)] flex-col border-r border-sidebar-border bg-sidebar">
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
            <NavContent groups={navGroups} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            <UserFooter userName={userName} userEmail={userEmail} />
          </aside>
        </div>
      )}

      <div className="min-w-0 lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-2 border-b bg-background/80 px-3 backdrop-blur sm:px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-none sm:text-base">
                Painel de gestão
              </p>
              <p className="mt-1 hidden truncate text-xs text-muted-foreground sm:block">
                Administração eclesiástica
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            aria-label="Sair do sistema"
            onClick={async () => {
              await logout();
            }}
          >
            <LogOut className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </header>
        <main className="min-w-0 p-3 sm:p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}