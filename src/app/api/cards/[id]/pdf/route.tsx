import qrcode from "qrcode";
import * as PDF from "@react-pdf/renderer";
import { requirePermission } from "@/lib/rbac";
import { scopeFromUser, scopedCongregationIdsOrNull } from "@/lib/scope";
import { getCard } from "@/services/cards.service";
import { getChurchBranding } from "@/services/branding.service";
import {
  MemberCardBack,
  MemberCardFront,
  type MemberCardPdfData,
} from "@/components/carteirinhas/member-card-pdf";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("carteirinhas.view");
  const { id } = await ctx.params;
  const congregationIds = await scopedCongregationIdsOrNull(scopeFromUser(user));
  const [card, branding] = await Promise.all([
    getCard(user.churchId ?? "", id, congregationIds),
    getChurchBranding(user.churchId ?? ""),
  ]);

  if (!card || !card.qrToken) {
    return new Response("Carteirinha não encontrada.", { status: 404 });
  }

  const qrDataUrl = await qrcode.toDataURL(card.qrToken, {
    margin: 0,
    width: 160,
    errorCorrectionLevel: "M",
  });

  const data: MemberCardPdfData = {
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

  const doc = (
    <PDF.Document title={`Carteirinha ${card.cardNumber}`}>
      <PDF.Page
        size="A5"
        orientation="landscape"
        style={{ flexDirection: "row", padding: 12, gap: 12 }}
      >
        <MemberCardFront data={data} />
        <MemberCardBack data={data} />
      </PDF.Page>
    </PDF.Document>
  );

  const buffer = await PDF.renderToBuffer(doc);
  return new Response(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="carteirinha-${card.cardNumber}.pdf"`,
      "cache-control": "no-store",
    },
  });
}
