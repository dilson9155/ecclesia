import Link from "next/link";
import { FileText, Settings } from "lucide-react";
import { requirePermission, can } from "@/lib/rbac";
import { getChurchBranding } from "@/services/branding.service";
import { getTemplates } from "@/services/documents.service";
import { BrandingManager } from "@/components/configuracoes/branding-manager";
import { LetterTemplatesManager } from "@/components/configuracoes/letter-templates-manager";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const user = await requirePermission("config.view");
  if (!user.churchId) return null;

  const [branding, templates, canEdit, canEditTemplates] = await Promise.all([
    getChurchBranding(user.churchId),
    getTemplates(user.churchId),
    can(user, "config.edit"),
    can(user, "cartas.edit"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Settings className="h-5 w-5" />
            Configurações da igreja
          </h1>
          <p className="text-sm text-muted-foreground">
            Identidade visual, assinaturas e textos usados em relatórios, cartas e carteirinhas.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
          <Link href="/cartas/modelos">
            <FileText className="mr-2 h-4 w-4" />
            Gerenciar modelos de cartas
          </Link>
        </Button>
      </div>

      <BrandingManager branding={branding} canEdit={canEdit} />

      <section id="modelos" className="scroll-mt-24">
        <LetterTemplatesManager
          templates={templates as never}
          canEdit={canEditTemplates}
        />
      </section>
    </div>
  );
}
