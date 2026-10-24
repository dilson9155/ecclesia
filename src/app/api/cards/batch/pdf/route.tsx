import qrcode from "qrcode";
import * as PDF from "@react-pdf/renderer";
import { requirePermission } from "@/lib/rbac";
import { scopeFromUser, scopedCongregationIdsOrNull } from "@/lib/scope";
import { getCardsForPdf } from "@/services/cards.service";
import { getChurchBranding } from "@/services/branding.service";
import { auditLog } from "@/services/audit.service";
import {
  MemberCardFront,
  type MemberCardPdfData,
} from "@/components/carteirinhas/member-card-pdf";

const CARDS_PER_PAGE = 10;
const CARDS_PER_ROW = 2;

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

  const pages = [];
  for (let offset = 0; offset < data.length; offset += CARDS_PER_PAGE) {
    const group = data.slice(offset, offset + CARDS_PER_PAGE);
    const rows = [];
    for (let rowIndex = 0; rowIndex < CARDS_PER_ROW * 5; rowIndex += CARDS_PER_ROW) {
      const rowCards = group.slice(rowIndex, rowIndex + CARDS_PER_ROW);
      if (rowCards.length === 0) break;
      rows.push(
        <PDF.View key={`row-${rowIndex}`} style={{ flexDirection: "row", gap: 8.5 }}>
          {rowCards.map((card) => (
            <MemberCardFront key={card.id} data={card} />
          ))}
        </PDF.View>
      );
    }

    pages.push(
      <PDF.Page
        key={`page-${offset}`}
        size="A4"
        style={{
          paddingTop: 17,
          paddingBottom: 17,
          paddingHorizontal: 17,
          flexDirection: "column",
          alignItems: "center",
          gap: 8.5,
        }}
      >
        {rows}
      </PDF.Page>
    );
  }

  const doc = (
    <PDF.Document title="Carteirinhas em lote">{pages}</PDF.Document>
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
