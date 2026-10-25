import { CircleDollarSign, Clock, ReceiptText, TriangleAlert } from "lucide-react";
import type { ChargeView } from "@/services/charges.service";
import { formatBRL } from "@/modules/platform/pricing";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const STATUS_LABELS: Record<string, string> = {
  PENDENTE: "Pendente",
  PAGA: "Paga",
  VENCIDA: "Vencida",
  CANCELADA: "Cancelada",
};

const STATUS_CLASSES: Record<string, string> = {
  PENDENTE: "border-amber-200 bg-amber-50 text-amber-700",
  PAGA: "border-emerald-200 bg-emerald-50 text-emerald-700",
  VENCIDA: "border-destructive/30 bg-destructive/10 text-destructive",
  CANCELADA: "border-slate-200 bg-slate-50 text-slate-500",
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR");
}

function monthLabel(referenceMonth: string): string {
  const [year, month] = referenceMonth.split("-").map(Number);
  if (!year || !month) return referenceMonth;
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function ChurchCharges({
  charges,
  summary,
  churchName,
  planName,
}: {
  charges: ChargeView[];
  summary: {
    open: ChargeView | null;
    openAmount: number;
    overdueAmount: number;
    paidThisYear: number;
  };
  churchName: string;
  planName: string | null;
}) {
  const cards = [
    {
      label: "Em aberto",
      value: formatBRL(summary.openAmount),
      hint: "Cobranças pendentes",
      icon: Clock,
    },
    {
      label: "Vencido",
      value: formatBRL(summary.overdueAmount),
      hint: "Requer regularização",
      icon: TriangleAlert,
    },
    {
      label: "Pago no ano",
      value: formatBRL(summary.paidThisYear),
      hint: "Baixas confirmadas",
      icon: ReceiptText,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight sm:text-2xl">
          <CircleDollarSign className="h-5 w-5" />
          Cobrança da igreja
        </h1>
        <p className="text-sm text-muted-foreground">
          {churchName}
          {planName ? ` · Plano ${planName}` : ""} — valores definidos pela
          administração da plataforma.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
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
          <CardTitle className="text-base">Cobrança atual</CardTitle>
        </CardHeader>
        <CardContent>
          {summary.open ? (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-muted/20 p-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{summary.open.description}</p>
                <p className="text-xs text-muted-foreground">
                  Referência {monthLabel(summary.open.referenceMonth)} · vence em{" "}
                  {formatDate(summary.open.dueDate)}
                </p>
                {summary.open.notes ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {summary.open.notes}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                    STATUS_CLASSES[summary.open.effectiveStatus] ?? ""
                  }`}
                >
                  {STATUS_LABELS[summary.open.effectiveStatus] ??
                    summary.open.effectiveStatus}
                </span>
                <p className="text-xl font-bold">
                  {formatBRL(summary.open.amount)}
                </p>
              </div>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhuma cobrança em aberto. Sua igreja está em dia.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de cobranças</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Referência</th>
                  <th className="px-4 py-2.5 font-medium">Descrição</th>
                  <th className="px-4 py-2.5 font-medium">Vencimento</th>
                  <th className="px-4 py-2.5 font-medium">Valor</th>
                  <th className="px-4 py-2.5 font-medium">Situação</th>
                </tr>
              </thead>
              <tbody>
                {charges.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      Nenhuma cobrança registrada.
                    </td>
                  </tr>
                ) : (
                  charges.map((charge) => (
                    <tr key={charge.id} className="border-b last:border-0">
                      <td className="px-4 py-2.5">
                        {monthLabel(charge.referenceMonth)}
                      </td>
                      <td className="px-4 py-2.5">{charge.description}</td>
                      <td className="px-4 py-2.5">
                        {formatDate(charge.dueDate)}
                      </td>
                      <td className="px-4 py-2.5 font-medium">
                        {formatBRL(charge.amount)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                            STATUS_CLASSES[charge.effectiveStatus] ?? ""
                          }`}
                        >
                          {STATUS_LABELS[charge.effectiveStatus] ??
                            charge.effectiveStatus}
                        </span>
                        {charge.paidAt ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Paga em {formatDate(charge.paidAt)}
                          </p>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
