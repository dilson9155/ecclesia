import Link from "next/link";
import {
  Building2,
  ChevronRight,
  Network,
  TrendingUp,
  UserRoundCheck,
  Users,
} from "lucide-react";
import { getPlatformOverview } from "@/services/platform.service";
import {
  STRUCTURE_TYPE_LABELS,
  formatBRL,
} from "@/modules/platform/pricing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("pt-BR");
}

export default async function SuperAdminOverviewPage() {
  const overview = await getPlatformOverview();

  const cards = [
    {
      label: "Igrejas cadastradas",
      value: String(overview.totalChurches),
      hint: `${overview.activeChurches} ativas • ${overview.inactiveChurches} inativas`,
      icon: Building2,
    },
    {
      label: "Receita recorrente (MRR)",
      value: formatBRL(overview.mrr),
      hint: `${overview.activeSubscriptions} assinaturas ativas`,
      icon: TrendingUp,
    },
    {
      label: "Membros gerenciados",
      value: new Intl.NumberFormat("pt-BR").format(overview.totalMembers),
      hint: "Soma informada por sede + congregações",
      icon: Users,
    },
    {
      label: "Igrejas com congregações",
      value: String(overview.networkChurches),
      hint: `${overview.sedeOnlyChurches} igreja(s) somente sede`,
      icon: UserRoundCheck,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Visão geral da plataforma
          </h1>
          <p className="text-sm text-muted-foreground">
            Igrejas, assinaturas e indicadores de cobrança do Ecclesia.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/super-admin/igrejas">
            Gerenciar igrejas
            <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardContent className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {card.label}
                  </p>
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold tracking-tight">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.hint}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-4 w-4" />
            Igrejas recentes
          </CardTitle>
          <CardDescription>
            Últimos cadastros e o plano contratado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {overview.recentChurches.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhuma igreja cadastrada ainda.
            </p>
          ) : (
            <div className="divide-y">
              {overview.recentChurches.map((church) => (
                <div
                  key={church.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{church.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {STRUCTURE_TYPE_LABELS[church.structureType]} •{" "}
                      {new Intl.NumberFormat("pt-BR").format(church.memberCount)}{" "}
                      membros • desde {formatDate(church.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {church.planName ?? "Sem plano"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {church.price > 0 ? `${formatBRL(church.price)}/mês` : "—"}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {church.planName ? "Assinatura" : "Pendente"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
