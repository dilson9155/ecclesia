"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Cake,
  CalendarCheck,
  Download,
  FileText,
  Loader2,
  MessageCircle,
  Printer,
  Settings2,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { SELECT_INPUT_CLASS } from "@/lib/styles";
import type {
  EbdAttendanceReport,
  EbdBirthdayRow,
  EbdPerformanceReport,
  EbdQuarterView,
  EbdRankingRow,
} from "@/services/ebd-lessons.service";
import type { EbdClassView } from "@/services/ebd.service";
import { EmptyState } from "@/components/ebd/ebd-ui";
import {
  saveEbdAbsenceTemplateAction,
  saveEbdBirthdayTemplateAction,
} from "@/app/actions/ebd";
import {
  ABSENCE_TEMPLATE_VARIABLES,
  BIRTHDAY_TEMPLATE_VARIABLES,
  DEFAULT_ABSENCE_TEMPLATE,
  DEFAULT_BIRTHDAY_TEMPLATE,
  buildAbsenceMessage,
  buildBirthdayMessage,
  whatsappLink,
} from "@/modules/ebd/message";

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

export type EbdReportTab =
  | "boletim"
  | "frequencia"
  | "ranking"
  | "aniversariantes";

type TemplateKind = "absence" | "birthday";

type Props = {
  tab: EbdReportTab;
  quarterId: string;
  classId: string;
  month: number;
  quarters: EbdQuarterView[];
  classes: EbdClassView[];
  performance?: EbdPerformanceReport;
  attendance?: EbdAttendanceReport;
  ranking?: { quarterName: string; className: string; rows: EbdRankingRow[] };
  birthdays?: { month: number; rows: EbdBirthdayRow[] };
  canExport: boolean;
  messageTemplate?: string;
  birthdayTemplate?: string;
  churchName?: string;
  canManageMessages?: boolean;
};

const TABS: Array<{ key: EbdReportTab; label: string; icon: typeof BarChart3 }> = [
  { key: "boletim", label: "Boletim de Desempenho", icon: BarChart3 },
  { key: "frequencia", label: "Frequência", icon: CalendarCheck },
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
  attendance,
  ranking,
  birthdays,
  canExport,
  messageTemplate,
  birthdayTemplate,
  churchName,
  canManageMessages,
}: Props) {
  const router = useRouter();
  const [templateKind, setTemplateKind] = useState<TemplateKind | null>(null);

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
        : tab === "frequencia"
          ? "/api/ebd/relatorios/frequencia"
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
      : tab === "frequencia" && attendance
        ? `${attendance.quarterName} · ${attendance.className} · ${attendance.lessons} chamada(s)`
        : tab === "ranking" && ranking
        ? `${ranking.quarterName} · ${ranking.className}`
        : tab === "aniversariantes" && birthdays
          ? `${MONTHS[birthdays.month - 1]} · ${
              classId
                ? classes.find((item) => item.id === classId)?.name ?? "Classe"
                : "Todas as classes"
            }`
          : "";

  const activeTemplateKind: TemplateKind =
    templateKind ?? (tab === "aniversariantes" ? "birthday" : "absence");
  const activeTemplate =
    activeTemplateKind === "birthday"
      ? birthdayTemplate ?? ""
      : messageTemplate ?? "";
  const canManageTabMessages =
    !!canManageMessages && (tab === "frequencia" || tab === "aniversariantes");

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

        <div className="flex shrink-0 flex-wrap gap-2">
          {canManageTabMessages ? (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setTemplateKind(tab === "aniversariantes" ? "birthday" : "absence")
              }
            >
              <Settings2 className="mr-1.5 size-4" />
              Modelo de mensagem
            </Button>
          ) : null}
          {canExport ? (
            <>
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
            </>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <FileText className="size-4" />
        {subtitle}
      </div>

      {tab === "boletim" && performance ? (
        <PerformanceTable report={performance} />
      ) : tab === "frequencia" && attendance ? (
        <AttendanceTable
          report={attendance}
          messageTemplate={messageTemplate ?? ""}
          churchName={churchName ?? ""}
        />
      ) : tab === "ranking" && ranking ? (
        <RankingTable rows={ranking.rows} />
      ) : tab === "aniversariantes" && birthdays ? (
        <BirthdaysTable
          rows={birthdays.rows}
          messageTemplate={birthdayTemplate ?? ""}
          churchName={churchName ?? ""}
        />
      ) : (
        <EmptyState message="Selecione os filtros para visualizar o relatório." />
      )}

      {canManageTabMessages ? (
        <MessageTemplateDialog
          kind={activeTemplateKind}
          open={templateKind !== null}
          onOpenChange={(open) => setTemplateKind(open ? activeTemplateKind : null)}
          template={activeTemplate}
          churchName={churchName ?? ""}
        />
      ) : null}
    </div>
  );
}

function AttendanceTable({
  report,
  messageTemplate,
  churchName,
}: {
  report: EbdAttendanceReport;
  messageTemplate: string;
  churchName: string;
}) {
  const atRisk = report.rows.filter((row) => row.percent < 75).length;
  const totalAbsences = report.rows.reduce((sum, row) => sum + row.absences, 0);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Summary label="Chamadas no período" value={String(report.lessons)} />
        <Summary label="Alunos" value={String(report.rows.length)} />
        <Summary label="Faltas" value={String(totalAbsences)} />
        <Summary label="Frequência média" value={`${report.averagePercent}%`} />
      </div>
      {report.rows.length === 0 ? (
        <EmptyState message="Nenhuma chamada registrada para os filtros selecionados." />
      ) : (
        <div className="ebd-table-shell">
          <table className="ebd-table min-w-[600px] lg:min-w-[900px]">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Aluno</th>
                <th className="hidden px-3 py-2 font-medium lg:table-cell">Classe</th>
                <th className="hidden px-3 py-2 font-medium xl:table-cell">Telefone</th>
                <th className="hidden px-3 py-2 text-right font-medium lg:table-cell">Aulas</th>
                <th className="px-3 py-2 text-right font-medium">Presenças</th>
                <th className="px-3 py-2 text-right font-medium">Faltas</th>
                <th className="px-3 py-2 text-right font-medium">Frequência</th>
                <th className="px-3 py-2 font-medium">Situação</th>
                <th className="px-3 py-2 text-right font-medium">Aviso</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((row) => (
                <tr key={row.studentId} className="border-t">
                  <td className="px-3 py-2 font-medium">{row.name}</td>
                  <td className="hidden px-3 py-2 lg:table-cell">{row.className}</td>
                  <td className="hidden px-3 py-2 text-muted-foreground xl:table-cell">
                    {row.phone || "—"}
                  </td>
                  <td className="hidden px-3 py-2 text-right lg:table-cell">{row.lessons}</td>
                  <td className="px-3 py-2 text-right">{row.presences}</td>
                  <td className="px-3 py-2 text-right">
                    <span className="block font-medium tabular-nums">{row.absences}</span>
                    {row.consecutiveAbsences >= 2 ? (
                      <span className="block text-[10px] font-medium text-amber-600">
                        {row.consecutiveAbsences} seguidas
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">
                    {row.percent}%
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        row.percent >= 75
                          ? "inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300"
                          : row.percent >= 50
                            ? "inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300"
                            : "inline-flex items-center gap-1.5 rounded-full border border-rose-200/80 bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300"
                      }
                    >
                      <span
                        className={
                          row.percent >= 75
                            ? "size-1.5 rounded-full bg-emerald-500"
                            : row.percent >= 50
                              ? "size-1.5 rounded-full bg-amber-500"
                              : "size-1.5 rounded-full bg-rose-500"
                        }
                      />
                      {row.percent >= 75
                        ? "Regular"
                        : row.percent >= 50
                          ? "Atenção"
                          : "Crítico"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {row.phone && row.absences > 0 ? (
                      <a
                        href={whatsappLink(
                          row.phone,
                          buildAbsenceMessage(messageTemplate, {
                            name: row.name,
                            date: row.lastAbsence,
                            className: row.className,
                            absences: row.absences,
                            churchName,
                          })
                        )}
                        target="_blank"
                        rel="noreferrer"
                        title={`Enviar mensagem para ${row.phone}`}
                        className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200/80 px-2 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-emerald-500/25 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
                      >
                        <MessageCircle className="size-3.5" />
                        Avisar
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {row.phone ? "—" : "Sem telefone"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {atRisk > 0 ? (
        <p className="text-xs text-muted-foreground">
          {atRisk} aluno(s) com frequência abaixo de 75% — considere um contato de
          acompanhamento.
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        O botão <strong className="font-medium text-foreground">Avisar</strong> abre o
        WhatsApp com a mensagem de ausência já preenchida, usando o telefone cadastrado
        do aluno.
      </p>
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

function BirthdaysTable({
  rows,
  messageTemplate,
  churchName,
}: {
  rows: EbdBirthdayRow[];
  messageTemplate: string;
  churchName: string;
}) {
  if (rows.length === 0) {
    return <EmptyState message="Nenhum aniversariante encontrado para o mês selecionado." />;
  }
  return (
    <div className="space-y-3">
      <div className="ebd-table-shell">
        <table className="ebd-table min-w-[560px] lg:min-w-[820px]">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Dia</th>
              <th className="px-3 py-2 font-medium">Nome</th>
              <th className="hidden px-3 py-2 font-medium lg:table-cell">Classe</th>
              <th className="hidden px-3 py-2 font-medium xl:table-cell">Nascimento</th>
              <th className="px-3 py-2 text-right font-medium">Idade</th>
              <th className="hidden px-3 py-2 font-medium lg:table-cell">Telefone</th>
              <th className="px-3 py-2 text-right font-medium">Mensagem</th>
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
                <td className="px-3 py-2 text-right">
                  {row.phone ? (
                    <a
                      href={whatsappLink(
                        row.phone,
                        buildBirthdayMessage(messageTemplate, {
                          name: row.name,
                          age: row.age,
                          churchName,
                        })
                      )}
                      target="_blank"
                      rel="noreferrer"
                      title={`Parabenizar ${row.name} pelo WhatsApp`}
                      className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200/80 px-2 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-emerald-500/25 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
                    >
                      <MessageCircle className="size-3.5" />
                      Parabenizar
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sem telefone</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        O botão <strong className="font-medium text-foreground">Parabenizar</strong> abre
        o WhatsApp com a mensagem de aniversário já preenchida, usando o telefone
        cadastrado do aluno.
      </p>
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

const PREVIEW_VARS = {
  name: "Maria da Silva",
  date: "2026-10-25",
  className: "Classe Adultos",
  absences: 2,
  churchName: "Igreja Exemplo",
};

function MessageTemplateDialog({
  kind,
  open,
  onOpenChange,
  template,
  churchName,
}: {
  kind: TemplateKind;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: string;
  churchName: string;
}) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(template);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isBirthday = kind === "birthday";
  const variables = isBirthday
    ? BIRTHDAY_TEMPLATE_VARIABLES
    : ABSENCE_TEMPLATE_VARIABLES;
  const defaultTemplate = isBirthday
    ? DEFAULT_BIRTHDAY_TEMPLATE
    : DEFAULT_ABSENCE_TEMPLATE;

  function handleOpenChange(next: boolean) {
    if (next) {
      setValue(template);
      setError(null);
    }
    onOpenChange(next);
  }

  function insertVariable(variable: string) {
    const textarea = textareaRef.current;
    if (!textarea) {
      setValue((current) => `${current}${variable}`);
      return;
    }
    const focused = document.activeElement === textarea;
    const start = focused ? (textarea.selectionStart ?? value.length) : value.length;
    const end = focused ? (textarea.selectionEnd ?? value.length) : value.length;
    const next = `${value.slice(0, start)}${variable}${value.slice(end)}`;
    setValue(next);
    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + variable.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  }

  async function submit() {
    setSaving(true);
    setError(null);
    const result = isBirthday
      ? await saveEbdBirthdayTemplateAction(value)
      : await saveEbdAbsenceTemplateAction(value);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onOpenChange(false);
    router.refresh();
  }

  const preview = isBirthday
    ? buildBirthdayMessage(value || "", {
        name: PREVIEW_VARS.name,
        age: 34,
        churchName: churchName || PREVIEW_VARS.churchName,
      })
    : buildAbsenceMessage(value || "", {
        ...PREVIEW_VARS,
        churchName: churchName || PREVIEW_VARS.churchName,
      });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isBirthday ? "Mensagem de aniversário" : "Modelo de mensagem"}
          </DialogTitle>
          <DialogDescription>
            {isBirthday
              ? "Personalize o texto usado no botão Parabenizar do WhatsApp. Os campos entre chaves são substituídos automaticamente."
              : "Personalize o texto usado no botão Avisar do WhatsApp. Os campos entre chaves são substituídos automaticamente."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              rows={5}
              maxLength={600}
              placeholder={
                isBirthday
                  ? "Escreva a mensagem de aniversário..."
                  : "Escreva a mensagem de acompanhamento..."
              }
              className="min-h-28 resize-y"
            />
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Inserir:</span>
              {variables.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => insertVariable(item.key)}
                  title={item.label}
                  className="rounded-full border border-border/70 bg-muted/50 px-2 py-0.5 font-mono text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                >
                  {item.key}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setValue(defaultTemplate)}
                className="ml-auto text-[11px] font-medium text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
              >
                Restaurar padrão
              </button>
            </div>
            <p className="text-right text-[11px] text-muted-foreground tabular-nums">
              {value.length}/600
            </p>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Pré-visualização
            </span>
            <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/60 p-3 text-sm whitespace-pre-wrap text-emerald-900 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-100">
              {preview || "Escreva a mensagem para visualizar."}
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={submit} disabled={saving || !value.trim()}>
            {saving ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
            Salvar modelo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
