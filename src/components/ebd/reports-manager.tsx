"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Download, FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SELECT_INPUT_CLASS } from "@/lib/styles";
import type {
  EbdBirthdayRow,
  EbdPerformanceReport,
  EbdQuarterView,
  EbdRankingRow,
} from "@/services/ebd-lessons.service";
import type { EbdClassView } from "@/services/ebd.service";
import { EmptyState } from "@/components/ebd/ebd-ui";

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export type EbdReportTab = "boletim" | "ranking" | "aniversariantes";

type Props = {
  tab: EbdReportTab;
  quarterId: string;
  classId: string;
  month: number;
  quarters: EbdQuarterView[];
  classes: EbdClassView[];
  performance?: EbdPerformanceReport;
  ranking?: { quarterName: string; className: string; rows: EbdRankingRow[] };
  birthdays?: { month: number; rows: EbdBirthdayRow[] };
  canExport: boolean;
};

const TABS: Array<{ key: EbdReportTab; label: string }> = [
  { key: "boletim", label: "Boletim de Desempenho" },
  { key: "ranking", label: "Ranking de Pontuação" },
  { key: "aniversariantes", label: "Aniversariantes" },
];

export function ReportsManager({
  tab,
  quarterId,
  classId,
  month,
  quarters,
  classes,
  performance,
  ranking,
  birthdays,
  canExport,
}: Props) {
  const router = useRouter();

  function navigate(next: {
    tab?: EbdReportTab;
    quarterId?: string;
    classId?: string;
    month?: number;
  }) {
    const params = new URLSearchParams();
    const nextTab = next.tab ?? tab;
    const nextQuarter = next.quarterId ?? quarterId;
    const nextClass = next.classId ?? classId;
    const nextMonth = next.month ?? month;
    params.set("tab", nextTab);
    if (nextQuarter) params.set("quarterId", nextQuarter);
    if (nextClass) params.set("classId", nextClass);
    if (nextTab === "aniversariantes") params.set("month", String(nextMonth));
    router.push(`/ebd/relatorios?${params.toString()}`);
  }

  const { pdfUrl, pdfDownloadUrl } = useMemo(() => {
    const params = new URLSearchParams();
    if (quarterId) params.set("quarterId", quarterId);
    if (classId) params.set("classId", classId);
    if (tab === "aniversariantes") params.set("month", String(month));
    const base =
      tab === "boletim"
        ? "/api/ebd/relatorios/boletim"
        : tab === "ranking"
          ? "/api/ebd/relatorios/ranking"
          : "/api/ebd/relatorios/aniversariantes";
    const query = params.toString();
    const inline = query ? `${base}?${query}` : base;
    return {
      pdfUrl: inline,
      pdfDownloadUrl: `${inline}${query ? "&" : "?"}download=1`,
    };
  }, [tab, quarterId, classId, month]);

  const subtitle =
    tab === "boletim" && performance
      ? `${performance.quarterName} · ${performance.className} · ${performance.lessons} aula(s)`
      : tab === "ranking" && ranking
        ? `${ranking.quarterName} · ${ranking.className}`
        : tab === "aniversariantes" && birthdays
          ? `${MONTHS[birthdays.month - 1]} · ${
              classId
                ? classes.find((item) => item.id === classId)?.name ?? "Classe"
                : "Todas as classes"
            }`
          : "";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 rounded-lg border bg-muted/30 p-1">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => navigate({ tab: item.key })}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === item.key
                ? "bg-background text-foreground shadow-sm ring-1 ring-foreground/10"
                : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap">
          {tab !== "aniversariantes" ? (
            <label className="space-y-1.5 sm:max-w-64">
              <span className="block text-sm font-medium">Trimestre</span>
              <select
                value={quarterId}
                onChange={(event) => navigate({ quarterId: event.target.value })}
                className={SELECT_INPUT_CLASS}
              >
                <option value="">Todos os trimestres</option>
                {quarters.map((quarter) => (
                  <option key={quarter.id} value={quarter.id}>
                    {quarter.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="space-y-1.5 sm:max-w-52">
              <span className="block text-sm font-medium">Mês</span>
              <select
                value={month}
                onChange={(event) =>
                  navigate({ month: Number(event.target.value) })
                }
                className={SELECT_INPUT_CLASS}
              >
                {MONTHS.map((name, index) => (
                  <option key={name} value={index + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="space-y-1.5 sm:max-w-64">
            <span className="block text-sm font-medium">Classe</span>
            <select
              value={classId}
              onChange={(event) => navigate({ classId: event.target.value })}
              className={SELECT_INPUT_CLASS}
            >
              <option value="">Todas as classes</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {canExport ? (
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button asChild variant="outline">
              <a href={pdfUrl} target="_blank" rel="noreferrer">
                <Printer className="mr-1.5 size-4" />
                Imprimir
              </a>
            </Button>
            <Button asChild>
              <a href={pdfDownloadUrl} download>
                <Download className="mr-1.5 size-4" />
                Baixar PDF
              </a>
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <FileText className="size-4" />
        {subtitle}
      </div>

      {tab === "boletim" && performance ? (
        <PerformanceTable report={performance} />
      ) : tab === "ranking" && ranking ? (
        <RankingTable rows={ranking.rows} />
      ) : tab === "aniversariantes" && birthdays ? (
        <BirthdaysTable rows={birthdays.rows} />
      ) : (
        <EmptyState message="Selecione os filtros para visualizar o relatório." />
      )}
    </div>
  );
}

function PerformanceTable({ report }: { report: EbdPerformanceReport }) {
  const averagePercent =
    report.rows.length > 0
      ? Math.round(
          report.rows.reduce((sum, row) => sum + row.percent, 0) / report.rows.length
        )
      : 0;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Summary label="Aulas no período" value={String(report.lessons)} />
        <Summary label="Alunos avaliados" value={String(report.rows.length)} />
        <Summary label="Aproveitamento médio" value={`${averagePercent}%`} />
      </div>
      {report.rows.length === 0 ? (
        <EmptyState message="Nenhuma chamada registrada para os filtros selecionados." />
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Aluno</th>
                <th className="px-3 py-2 font-medium">Matrícula</th>
                <th className="px-3 py-2 font-medium">Classe</th>
                <th className="px-3 py-2 text-right font-medium">Aulas</th>
                <th className="px-3 py-2 text-right font-medium">Presenças</th>
                <th className="px-3 py-2 text-right font-medium">Pontos</th>
                <th className="px-3 py-2 text-right font-medium">Média</th>
                <th className="px-3 py-2 text-right font-medium">%</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((row) => (
                <tr key={row.studentId} className="border-t">
                  <td className="px-3 py-2 font-medium">{row.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.code}</td>
                  <td className="px-3 py-2">{row.className}</td>
                  <td className="px-3 py-2 text-right">{row.lessons}</td>
                  <td className="px-3 py-2 text-right">{row.presences}</td>
                  <td className="px-3 py-2 text-right">{row.totalScore}</td>
                  <td className="px-3 py-2 text-right">{row.averageScore.toFixed(1)}</td>
                  <td className="px-3 py-2 text-right font-medium">{row.percent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RankingTable({ rows }: { rows: EbdRankingRow[] }) {
  if (rows.length === 0) {
    return <EmptyState message="Nenhuma pontuação registrada para os filtros selecionados." />;
  }
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Posição</th>
            <th className="px-3 py-2 font-medium">Aluno</th>
            <th className="px-3 py-2 font-medium">Classe</th>
            <th className="px-3 py-2 text-right font-medium">Presenças</th>
            <th className="px-3 py-2 text-right font-medium">Pontos</th>
            <th className="px-3 py-2 text-right font-medium">Média</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.studentId} className="border-t">
              <td className="px-3 py-2 font-semibold">
                {row.position <= 3 ? (
                  <span
                    className={
                      row.position === 1
                        ? "text-amber-600"
                        : row.position === 2
                          ? "text-slate-500"
                          : "text-orange-700"
                    }
                  >
                    {row.position}º
                  </span>
                ) : (
                  `${row.position}º`
                )}
              </td>
              <td className="px-3 py-2 font-medium">{row.name}</td>
              <td className="px-3 py-2">{row.className}</td>
              <td className="px-3 py-2 text-right">{row.presences}</td>
              <td className="px-3 py-2 text-right font-semibold">{row.totalScore}</td>
              <td className="px-3 py-2 text-right">{row.averageScore.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BirthdaysTable({ rows }: { rows: EbdBirthdayRow[] }) {
  if (rows.length === 0) {
    return <EmptyState message="Nenhum aniversariante encontrado para o mês selecionado." />;
  }
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Dia</th>
            <th className="px-3 py-2 font-medium">Nome</th>
            <th className="px-3 py-2 font-medium">Classe</th>
            <th className="px-3 py-2 font-medium">Nascimento</th>
            <th className="px-3 py-2 text-right font-medium">Idade</th>
            <th className="px-3 py-2 font-medium">Telefone</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.studentId} className="border-t">
              <td className="px-3 py-2 font-semibold">
                {String(row.day).padStart(2, "0")}
              </td>
              <td className="px-3 py-2 font-medium">{row.name}</td>
              <td className="px-3 py-2">{row.className}</td>
              <td className="px-3 py-2 text-muted-foreground">
                {row.birthDate.split("-").reverse().join("/")}
              </td>
              <td className="px-3 py-2 text-right">{row.age}</td>
              <td className="px-3 py-2 text-muted-foreground">{row.phone || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold leading-none">{value}</p>
    </div>
  );
}
