import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  Users,
  UserRound,
} from "lucide-react";
import { requirePermission, can } from "@/lib/rbac";
import { ebdScopeFromUser, isEbdTeacherOnly } from "@/lib/ebd-scope";
import { getEbdOverview } from "@/services/ebd.service";
import { StatCard } from "@/components/ebd/ebd-ui";

export const dynamic = "force-dynamic";

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
            description: "Boletim, ranking de pontuação e aniversariantes.",
            icon: CalendarDays,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Alunos ativos"
          value={overview.activeStudents}
          hint={`${overview.totalStudents} matrícula(s) no total`}
        />
        <StatCard
          label="Professores ativos"
          value={overview.activeTeachers}
          hint={`${overview.totalTeachers} cadastro(s) no total`}
        />
        <StatCard
          label="Classes ativas"
          value={overview.activeClasses}
          hint={`${overview.totalClasses} classe(s) no total`}
        />
        <StatCard
          label="Frequência média"
          value={`${overview.attendanceRate}%`}
          hint={`${overview.totalAttendances} chamada(s) · ${overview.totalLessons} lição(ões)`}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {shortcuts.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-start gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/40"
            >
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-4" />
              </span>
              <span>
                <span className="block text-sm font-semibold">{item.title}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {item.description}
                </span>
              </span>
            </Link>
          );
        })}
      </div>

      <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Como funciona a pontuação</p>
        <p className="mt-1">
          Cada lição vale até 10 pontos: presença (2), lição impressa (2),
          participação (3), bíblia impressa (2) e oferta (1). Os pontos alimentam o
          boletim e o ranking de pontuação.
        </p>
      </div>
    </div>
  );
}
