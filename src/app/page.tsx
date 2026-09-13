import Link from "next/link";
import {
  Building2,
  Church,
  FileText,
  Landmark,
  LineChart,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    icon: Users,
    title: "Membros & Fichas",
    description:
      "Cadastro completo de membros e visitantes, foto, documentos e histórico individual.",
  },
  {
    icon: Building2,
    title: "Multi-congregação",
    description:
      "Sede e congregações com relatórios individuais e consolidados.",
  },
  {
    icon: Wallet,
    title: "Dízimos & Ofertas",
    description:
      "Lançamentos individuais, em lote ou anônimos, vinculados à contabilidade.",
  },
  {
    icon: Landmark,
    title: "Contabilidade gerencial",
    description:
      "Plano de contas hierárquico, códigos contábeis e centros de custos.",
  },
  {
    icon: LineChart,
    title: "Relatórios & DRE",
    description:
      "Livro Caixa, DRE gerencial, relatórios por congregação e consolidados.",
  },
  {
    icon: FileText,
    title: "Carteirinhas & Cartas",
    description:
      "Emissão de carteirinhas com QR Code, cartas e declarações em PDF.",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur">
        <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Church className="size-5" />
            </span>
            <div className="leading-tight">
              <p className="text-base font-semibold tracking-tight">Ecclesia</p>
              <p className="text-[11px] text-muted-foreground">
                Gestão de Igrejas
              </p>
            </div>
          </div>
          <Button asChild>
            <Link href="/login">Acessar sistema</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <section className="border-b bg-gradient-to-b from-background to-muted/40">
          <div className="container mx-auto max-w-6xl px-4 py-20 md:py-28">
            <div className="mx-auto max-w-3xl text-center">
              <p className="mb-4 inline-flex items-center rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                Gestão administrativa &amp; financeira para igrejas
              </p>
              <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
                Administre a sua igreja com{" "}
                <span className="text-primary">excelência</span> e{" "}
                <span className="text-primary">transparência</span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground">
                Ecclesia reúne o controle de membros, congregações, dízimos,
                ofertas e finanças em um único sistema moderno, seguro e
                acessível de qualquer dispositivo.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Button asChild size="lg">
                  <Link href="/login">Acessar o sistema</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Tudo o que a sua igreja precisa
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
                Um sistema completo com segurança granular, auditoria e
                preparado para produção na nuvem.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <Card
                  key={feature.title}
                  className="transition-shadow hover:shadow-md"
                >
                  <CardHeader>
                    <span className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <feature.icon className="size-5" />
                    </span>
                    <CardTitle>{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                  <CardContent />
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-muted/40">
        <div className="container mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-8 text-center sm:flex-row sm:text-left">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Ecclesia — Gestão de Igrejas
          </p>
          <p className="text-sm text-muted-foreground">
            Segurança · Transparência · Fidelidade
          </p>
        </div>
      </footer>
    </div>
  );
}