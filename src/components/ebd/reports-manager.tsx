"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Cake, Download, FileText, Printer, Trophy } from "lucide-react";
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

const TABS: Array<{ key: EbdReportTab; label: string; icon: typeof BarChart3 }> = [
  { key: "boletim", label: "Boletim de Desempenho", icon: BarChart3 },
  { key: "ranking", label: "Ranking de Pontuação", icon: Trophy },
  { key: "aniversariantes", label: "Aniversariantes", icon: Cake },
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
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-border/70 bg-card/80 p-1 shadow-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => navigate({ tab: item.key })}
              aria-current={active ? "page" : undefined}
              className={`group inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-gradient-to-b from-primary to-primary/90 text-primary-foreground shadow-sm shadow-primary/25"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              }`}
            >
              <Icon
                className={`size-4 transition-opacity ${
                  active ? "opacity-100" : "opacity-60 group-hover:opacity-100"
                }`}
              />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="ebd-panel flex flex-col gap-3 p-4 lg:flex-row lg:items-end lg:justify-between">
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
        <div className="ebd-table-shell">
          <table className="ebd-table min-w-[560px] lg:min-w-[820px]">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Aluno</th>
                <th className="hidden px-3 py-2 font-medium lg:table-cell">Matrícula</th>
                <th className="hidden px-3 py-2 font-medium xl:table-cell">Classe</th>
                <th className="hidden px-3 py-2 text-right font-medium xl:table-cell">Aulas</th>
                <th className="px-3 py-2 text-right font-medium">Presenças</th>
                <th className="px-3 py-2 text-right font-medium">Pontos</th>
                <th className="hidden px-3 py-2 text-right font-medium xl:table-cell">Média</th>
                <th className="px-3 py-2 text-right font-medium">%</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((row) => (
                <tr key={row.studentId} className="border-t">
                  <td className="px-3 py-2 font-medium">{row.name}</td>
                  <td className="hidden px-3 py-2 text-muted-foreground lg:table-cell">{row.code}</td>
                  <td className="hidden px-3 py-2 xl:table-cell">{row.className}</td>
                  <td className="hidden px-3 py-2 text-right xl:table-cell">{row.lessons}</td>
                  <td className="px-3 py-2 text-right">{row.presences}</td>
                  <td className="px-3 py-2 text-right">{row.totalScore}</td>
                  <td className="hidden px-3 py-2 text-right xl:table-cell">{row.averageScore.toFixed(1)}</td>
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
    <div className="ebd-table-shell">
      <table className="ebd-table min-w-[460px] lg:min-w-[720px]">
        <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Posição</th>
            <th className="px-3 py-2 font-medium">Aluno</th>
            <th className="hidden px-3 py-2 font-medium lg:table-cell">Classe</th>
            <th className="hidden px-3 py-2 text-right font-medium lg:table-cell">Presenças</th>
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
              <td className="hidden px-3 py-2 lg:table-cell">{row.className}</td>
              <td className="hidden px-3 py-2 text-right lg:table-cell">{row.presences}</td>
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
    <div className="ebd-table-shell">
      <table className="ebd-table min-w-[460px] lg:min-w-[720px]">
        <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Dia</th>
            <th className="px-3 py-2 font-medium">Nome</th>
            <th className="hidden px-3 py-2 font-medium lg:table-cell">Classe</th>
            <th className="hidden px-3 py-2 font-medium xl:table-cell">Nascimento</th>
            <th className="px-3 py-2 text-right font-medium">Idade</th>
            <th className="hidden px-3 py-2 font-medium lg:table-cell">Telefone</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.studentId} className="border-t">
              <td className="px-3 py-2 font-semibold">
                {String(row.day).padStart(2, "0")}
              </td>
              <td className="px-3 py-2 font-medium">{row.name}</td>
              <td className="hidden px-3 py-2 lg:table-cell">{row.className}</td>
              <td className="hidden px-3 py-2 text-muted-foreground xl:table-cell">
                {row.birthDate.split("-").reverse().join("/")}
              </td>
              <td className="px-3 py-2 text-right">{row.age}</td>
              <td className="hidden px-3 py-2 text-muted-foreground lg:table-cell">
                {row.phone || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl border bg-card px-4 py-3 shadow-sm">
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0"
      />
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-semibold leading-none tabular-nums">{value}</p>
    </div>
  );
}
