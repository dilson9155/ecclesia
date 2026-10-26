import * as PDF from "@react-pdf/renderer";
import {
  PdfSummary,
  PdfTable,
  ReportFooter,
  ReportHeader,
  reportPdfStyles as styles,
} from "@/components/reports/report-pdf";
import type { ReportContext } from "@/services/reports.service";
import type {
  EbdBirthdayRow,
  EbdPerformanceReport,
  EbdRankingRow,
} from "@/services/ebd-lessons.service";

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

function subtitle(report: { quarterName: string; className: string }) {
  return `Trimestre: ${report.quarterName} · Classe: ${report.className}`;
}

export function PerformanceReportPdf({
  context,
  report,
}: {
  context: ReportContext;
  report: EbdPerformanceReport;
}) {
  const totalStudents = report.rows.length;
  const averagePercent =
    totalStudents > 0
      ? Math.round(
          report.rows.reduce((sum, row) => sum + row.percent, 0) / totalStudents
        )
      : 0;
  const totalPresences = report.rows.reduce((sum, row) => sum + row.presences, 0);

  return (
    <PDF.Document title="Boletim Escolar de Desempenho — EBD">
      <PDF.Page size="A4" style={styles.page}>
        <ReportHeader
          context={context}
          title="Boletim Escolar de Desempenho — EBD"
          subtitle={subtitle(report)}
        />
        <PdfSummary
          items={[
            { label: "Aulas no período", value: String(report.lessons) },
            { label: "Alunos avaliados", value: String(totalStudents) },
            { label: "Presenças", value: String(totalPresences) },
            { label: "Aproveitamento médio", value: `${averagePercent}%` },
          ]}
        />
        <PdfTable
          headers={[
            "Aluno",
            "Matrícula",
            "Classe",
            "Aulas",
            "Presenças",
            "Pontos",
            "Média",
            "%",
          ]}
          align={["left", "left", "left", "right", "right", "right", "right", "right"]}
          rows={report.rows.map((row) => [
            row.name,
            row.code,
            row.className,
            row.lessons,
            row.presences,
            row.totalScore,
            row.averageScore.toFixed(1),
            `${row.percent}%`,
          ])}
        />
        <ReportFooter context={context} />
      </PDF.Page>
    </PDF.Document>
  );
}

export function RankingReportPdf({
  context,
  ranking,
}: {
  context: ReportContext;
  ranking: { quarterName: string; className: string; rows: EbdRankingRow[] };
}) {
  return (
    <PDF.Document title="Ranking de Pontuação — EBD">
      <PDF.Page size="A4" style={styles.page}>
        <ReportHeader
          context={context}
          title="Ranking de Pontuação — EBD"
          subtitle={subtitle(ranking)}
        />
        <PdfSummary
          items={[
            { label: "Participantes", value: String(ranking.rows.length) },
            {
              label: "Maior pontuação",
              value: ranking.rows.length > 0 ? String(ranking.rows[0].totalScore) : "0",
            },
          ]}
        />
        <PdfTable
          headers={["Pos.", "Aluno", "Classe", "Presenças", "Pontos", "Média"]}
          align={["right", "left", "left", "right", "right", "right"]}
          rows={ranking.rows.map((row) => [
            `${row.position}º`,
            row.name,
            row.className,
            row.presences,
            row.totalScore,
            row.averageScore.toFixed(1),
          ])}
        />
        <ReportFooter context={context} />
      </PDF.Page>
    </PDF.Document>
  );
}

export function BirthdaysReportPdf({
  context,
  month,
  className,
  rows,
}: {
  context: ReportContext;
  month: number;
  className: string;
  rows: EbdBirthdayRow[];
}) {
  return (
    <PDF.Document title="Aniversariantes — EBD">
      <PDF.Page size="A4" style={styles.page}>
        <ReportHeader
          context={context}
          title="Aniversariantes — EBD"
          subtitle={`Mês: ${MONTHS[month - 1] ?? month} · Classe: ${className}`}
        />
        <PdfSummary items={[{ label: "Aniversariantes", value: String(rows.length) }]} />
        <PdfTable
          headers={["Dia", "Nome", "Classe", "Nascimento", "Idade", "Telefone"]}
          align={["right", "left", "left", "left", "right", "left"]}
          rows={rows.map((row) => [
            String(row.day).padStart(2, "0"),
            row.name,
            row.className,
            formatDate(row.birthDate),
            `${row.age} anos`,
            row.phone ?? "—",
          ])}
        />
        <ReportFooter context={context} />
      </PDF.Page>
    </PDF.Document>
  );
}

function formatDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}
