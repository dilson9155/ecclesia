import Link from "next/link";
import { ArrowLeft, ScrollText } from "lucide-react";
import { requirePermission, can } from "@/lib/rbac";
import { getTemplates } from "@/services/documents.service";
import { LetterTemplatesManager } from "@/components/configuracoes/letter-templates-manager";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function ModelosDeCartasPage() {
  const user = await requirePermission("cartas.view");
  if (!user.churchId) return null;

  const [templates, canEdit] = await Promise.all([
    getTemplates(user.churchId),
    can(user, "cartas.edit"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <ScrollText className="h-5 w-5" />
            Modelos de cartas
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure os textos padrão usados na emissão de cartas e declarações.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
          <Link href="/cartas">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para cartas
          </Link>
        </Button>
      </div>

      <LetterTemplatesManager templates={templates as never} canEdit={canEdit} />
    </div>
  );
}
