import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  Percent,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import { requirePermission, can } from "@/lib/rbac";
import { ebdScopeFromUser, isEbdTeacherOnly } from "@/lib/ebd-scope";
import { getEbdOverview } from "@/services/ebd.service";
import { StatCard } from "@/components/ebd/ebd-ui";

export const dynamic = "force-dynamic";

const SCORE_RULES = [
  { label: "Presença", value: 2 },
  { label: "Lição impressa", value: 2 },
  { label: "Participação", value: 3 },
  { label: "Bíblia", value: 2 },
  { label: "Oferta", value: 1 },
];

export default async function EbdOverviewPage() {
  const user = await requirePermission("ebd.view");
  if (!user.churchId) return null;

  const scope = await ebdScopeFromUser(user);
  const overview = await getEbdOverview(scope);
  const canReports = await can(user, "ebd.reports");
  const professorOnly = isEbdTeacherOnly(user);

  const shortcuts = [
    {
      href: "/ebd/alunos",
      title: "Alunos",
      description: "Matricule membros e controle a participação na EBD.",
      icon: Users,
    },
    ...(!professorOnly
      ? [
          {
            href: "/ebd/professores",
            title: "Professores",
            description: "Defina quem leciona em cada classe.",
            icon: UserRound,
          },
          {
            href: "/ebd/classes",
            title: "Classes",
            description: "Organize as turmas e a capacidade de alunos.",
            icon: GraduationCap,
          },
        ]
      : []),
    {
      href: "/ebd/licoes",
      title: "Lições do trimestre",
      description: "Cadastre o trimestre e as lições por classe.",
      icon: BookOpen,
    },
    {
      href: "/ebd/chamadas",
      title: "Chamadas",
      description: "Registre presenças e pontuações das lições.",
      icon: ClipboardList,
    },
    ...(canReports
      ? [
          {
            href: "/ebd/relatorios",
            title: "Relatórios pedagógicos",
            description:
              "Boletim, frequência, ranking de pontuação e aniversariantes.",
            icon: CalendarDays,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Alunos ativos"
          value={overview.activeStudents}
          hint={`${overview.totalStudents} matrícula(s) no total`}
          icon={Users}
          tone="primary"
        />
        <StatCard
          label="Professores ativos"
          value={overview.activeTeachers}
          hint={`${overview.totalTeachers} cadastro(s) no total`}
          icon={UserRound}
          tone="sky"
        />
        <StatCard
          label="Classes ativas"
          value={overview.activeClasses}
          hint={`${overview.totalClasses} classe(s) no total`}
          icon={GraduationCap}
          tone="violet"
        />
        <StatCard
          label="Frequência média"
          value={`${overview.attendanceRate}%`}
          hint={`${overview.totalAttendances} chamada(s) · ${overview.totalLessons} lição(ões)`}
          icon={Percent}
          tone="emerald"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {shortcuts.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group relative overflow-hidden rounded-xl border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
            >
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              />
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15 transition-colors group-hover:bg-primary/15">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{item.title}</span>
                    <ArrowUpRight className="size-4 shrink-0 -translate-x-1 text-primary opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary/[0.07] via-card to-card p-4">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-16 size-40 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="relative flex items-start gap-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
            <Sparkles className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Como funciona a pontuação</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Cada lição vale até 10 pontos e alimenta o boletim e o ranking de
              pontuação.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {SCORE_RULES.map((rule) => (
                <span
                  key={rule.label}
                  className="inline-flex items-center gap-1.5 rounded-full border bg-background/70 px-2.5 py-1 text-xs text-muted-foreground"
                >
                  {rule.label}
                  <strong className="font-semibold tabular-nums text-foreground">
                    {rule.value}
                  </strong>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
