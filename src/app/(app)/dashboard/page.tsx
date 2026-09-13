import { Building2, Church, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireAuth();

  const church = user.churchId
    ? await prisma.church.findUnique({
        where: { id: user.churchId },
        include: {
          sedes: { where: { status: "ATIVO" } },
        },
      })
    : null;

  const [congregations, members] = user.churchId
    ? await Promise.all([
        prisma.congregation.count({ where: { churchId: user.churchId } }),
        prisma.member.count({ where: { churchId: user.churchId } }),
      ])
    : [0, 0];

  const cards = [
    {
      title: "Congregações",
      value: congregations,
      icon: Building2,
    },
    {
      title: "Membros",
      value: members,
      icon: Users,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Bem-vindo{user.name ? `, ${user.name.split(" ")[0]}` : ""}!
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {church?.name ?? "Sistema"} · {church?.sedes[0]?.name ?? "Sede"} ·{" "}
          {new Date().toLocaleDateString("pt-BR")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Church className="size-4 text-primary" />
            O Ecclesia está sendo construído
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            O dashboard completo com gráficos e indicadores financeiros chegará
            em breve. Os módulos de igrejas, membros, financeiro, relatórios e
            administração estão sendo desenvolvidos por etapas.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/estrutura">Estrutura da igreja</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}