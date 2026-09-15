import { FileText, LineChart, Users } from "lucide-react";
import Link from "next/link";
import { requirePermission } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const REPORTS = [
  {
    href: "/relatorios/mapa-membros",
    title: "Mapa de Membros",
    description: "Cadastro geral de membros com situação, congregação e dados de contato.",
    icon: Users,
  },
  {
    href: "/relatorios/financeiro",
    title: "Relatório Financeiro",
    description: "Fluxo de caixa por conta, entradas e saídas do período selecionado.",
    icon: LineChart,
  },
  {
    href: "/relatorios/contribuicoes",
    title: "Contribuições",
    description: "Dízimos e ofertas por período, com totais por tipo e por membro.",
    icon: FileText,
  },
];

export default async function RelatoriosPage() {
  await requirePermission("relatorios.view");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Relatórios</h1>
        <p className="text-sm text-muted-foreground">
          Relatórios analíticos com exportação em PDF, Excel e CSV
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => (
          <Link key={r.href} href={r.href} className="block">
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader>
                <span className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <r.icon className="size-5" />
                </span>
                <CardTitle>{r.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{r.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}