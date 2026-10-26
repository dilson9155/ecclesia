import qrcode from "qrcode";
import * as PDF from "@react-pdf/renderer";
import { requirePermission } from "@/lib/rbac";
import { scopeFromUser, scopedCongregationIdsOrNull } from "@/lib/scope";
import { getCardsForPdf } from "@/services/cards.service";
import { getChurchBranding } from "@/services/branding.service";
import { auditLog } from "@/services/audit.service";
import {
  buildCardSheetPages,
  type CardSheetLayout,
} from "@/components/carteirinhas/card-sheet";
import type { MemberCardPdfData } from "@/components/carteirinhas/member-card-pdf";

export async function GET(request: Request) {
  const user = await requirePermission("carteirinhas.view");
  if (!user.churchId) {
    return new Response("Igreja não encontrada.", { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const ids = (searchParams.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 100);

  if (ids.length === 0) {
    return new Response("Selecione pelo menos uma carteirinha.", { status: 400 });
  }

  // "both" (padrão) inclui o verso; "front" mantém apenas as frentes.
  const includeBack = searchParams.get("faces") !== "front";
  // No modo padrão o verso fica ao lado da frente (3 cartões por folha).
  // "duplex" imprime frentes e versos em folhas intercaladas (5 por folha).
  const layout: CardSheetLayout = !includeBack
    ? "front"
    : searchParams.get("layout") === "duplex"
      ? "duplex"
      : "side-by-side";

  const congregationIds = await scopedCongregationIdsOrNull(scopeFromUser(user));
  const [cards, branding] = await Promise.all([
    getCardsForPdf(user.churchId, ids, congregationIds),
    getChurchBranding(user.churchId),
  ]);

  if (cards.length === 0) {
    return new Response("Nenhuma carteirinha encontrada.", { status: 404 });
  }

  const data: MemberCardPdfData[] = await Promise.all(
    cards.map(async (card) => {
      const qrDataUrl = await qrcode.toDataURL(card.qrToken ?? card.id, {
        margin: 0,
        width: 160,
        errorCorrectionLevel: "M",
      });

      return {
        id: card.id,
        cardNumber: card.cardNumber,
        issueDate: card.issueDate,
        validityDate: card.validityDate,
        qrDataUrl,
        member: {
          name: card.member.name,
          code: card.member.code,
          photoUrl: card.member.photoUrl,
          cpf: card.member.cpf,
          rg: card.member.rg,
          birthDate: card.member.birthDate,
          maritalStatus: card.member.maritalStatus,
          cargo: card.member.cargo,
          ministerio: card.member.ministerio,
          departamento: card.member.departamento,
          phone: card.member.phone,
          city: card.member.city,
          state: card.member.state,
        },
        congregation: {
          name: card.congregation.name,
          city: card.congregation.city,
          state: card.congregation.state,
          sedeName: card.congregation.sede?.name ?? null,
        },
        church: {
          name: card.church.name,
          legalName: card.church.legalName,
          cnpj: card.church.cnpj,
          phone: card.church.phone,
          email: card.church.email,
          logoUrl: branding.logoUrl ?? card.church.logoUrl,
        },
        pastor: {
          name: branding.pastor.name,
          imageUrl: branding.pastor.imageUrl,
        },
      };
    })
  );

  const doc = (
    <PDF.Document title="Carteirinhas em lote">
      {buildCardSheetPages(data, layout)}
    </PDF.Document>
  );

  const buffer = await PDF.renderToBuffer(doc);

  await auditLog({
    userId: user.id,
    churchId: user.churchId,
    action: "PRINT",
    module: "carteirinhas",
    entity: "Carteirinha",
    description: `${cards.length} carteirinha(s) geradas em folha A4`,
    newValues: { count: cards.length },
  });

  return new Response(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="carteirinhas-lote.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
