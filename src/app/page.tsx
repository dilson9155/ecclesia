import Image from "next/image";
import Link from "next/link";
import {
  Building2,
  FileText,
  Landmark,
  LineChart,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { InstallAppButton } from "@/components/install-app-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const WHATSAPP_NUMBER = "5538988131359";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  "Olá! Gostaria de saber mais sobre o Ecclesia."
)}`;

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

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
          <div className="flex min-w-0 items-center gap-2.5">
            <Image
              src="/brand/ecclesia-icon.webp"
              alt="Ecclesia"
              width={36}
              height={36}
              priority
              className="size-9 shrink-0 rounded-lg object-contain"
            />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-base font-semibold tracking-tight">
                Ecclesia
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                Gestão de Igrejas
              </p>
            </div>
          </div>
          <Button asChild className="ml-3 shrink-0">
            <Link href="/login">Acessar sistema</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <section className="border-b bg-gradient-to-b from-background to-muted/40">
          <div className="container mx-auto max-w-6xl px-4 py-14 sm:py-20 md:py-28">
            <div className="mx-auto max-w-3xl text-center">
              <Image
                src="/brand/ecclesia-logo.webp"
                alt="Logo Ecclesia"
                width={900}
                height={900}
                priority
                className="mx-auto mb-7 size-32 rounded-[1.75rem] shadow-2xl shadow-primary/20 sm:mb-9 sm:size-40"
              />
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
              <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link href="/login">Acessar o sistema</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  className="w-full bg-[#25D366] text-white hover:bg-[#1fb85a] sm:w-auto"
                >
                  <a
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Falar no WhatsApp pelo número (38) 98813-1359"
                  >
                    <WhatsAppIcon className="mr-2 size-5" />
                    Falar no WhatsApp
                  </a>
                </Button>
                <InstallAppButton
                  alwaysVisible
                  size="lg"
                  variant="outline"
                  label="Instalar o sistema"
                  className="w-full sm:w-auto"
                />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                WhatsApp para atendimento: (38) 98813-1359
              </p>
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

        <section className="border-t bg-muted/40 py-14 md:py-20">
          <div className="container mx-auto max-w-3xl px-4 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Pronto para modernizar a gestão da sua igreja?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Fale com a nossa equipe pelo WhatsApp ou instale o Ecclesia agora
              mesmo no seu celular ou computador.
            </p>
            <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Button
                asChild
                size="lg"
                className="w-full bg-[#25D366] text-white hover:bg-[#1fb85a] sm:w-auto"
              >
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Falar no WhatsApp pelo número (38) 98813-1359"
                >
                  <WhatsAppIcon className="mr-2 size-5" />
                  Falar no WhatsApp
                </a>
              </Button>
              <InstallAppButton
                alwaysVisible
                size="lg"
                variant="outline"
                label="Instalar o sistema"
                className="w-full sm:w-auto"
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              WhatsApp: (38) 98813-1359
            </p>
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