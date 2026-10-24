import Image from "next/image";
import Link from "next/link";
import { LogOut, ShieldCheck } from "lucide-react";
import { requirePlatformAdmin } from "@/lib/rbac";
import { logout } from "@/app/actions/auth";
import { SuperAdminNav } from "@/components/platform/super-admin-nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requirePlatformAdmin();

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-3 py-3 sm:px-4 md:px-6">
          <Link href="/super-admin" className="flex min-w-0 items-center gap-2.5">
            <Image
              src="/brand/ecclesia-icon.webp"
              alt="Ecclesia"
              width={36}
              height={36}
              className="size-9 shrink-0 rounded-lg object-contain"
            />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold">Ecclesia</p>
              <p className="truncate text-[11px] text-muted-foreground">
                Administração da plataforma
              </p>
            </div>
          </Link>

          <Badge className="hidden gap-1 sm:inline-flex">
            <ShieldCheck className="h-3 w-3" />
            Super Admin
          </Badge>

          <div className="order-3 w-full lg:order-2 lg:ml-4 lg:w-auto">
            <SuperAdminNav />
          </div>

          <div className="order-2 ml-auto flex items-center gap-2 lg:order-3">
            <div className="hidden text-right sm:block">
              <p className="max-w-48 truncate text-xs font-medium">
                {user.name ?? "Administrador"}
              </p>
              <p className="max-w-48 truncate text-[11px] text-muted-foreground">
                {user.email}
              </p>
            </div>
            <form action={logout}>
              <Button type="submit" variant="outline" size="sm">
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl p-3 sm:p-4 md:p-6">{children}</main>
    </div>
  );
}
