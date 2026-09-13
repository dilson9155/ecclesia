import qrcode from "qrcode";
import * as PDF from "@react-pdf/renderer";
import { requirePermission } from "@/lib/rbac";
import { getCard } from "@/services/cards.service";

const CARD_W = 290;
const CARD_H = 178;

const styles: PDF.Styles = {
  page: {
    flexDirection: "row",
    padding: 12,
    gap: 12,
  },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderWidth: 1,
    borderColor: "#b9bdc6",
    borderStyle: "solid",
    borderRadius: 8,
    overflow: "hidden",
    flexDirection: "column",
  },
  header: {
    backgroundColor: "#0f172a",
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  churchName: { color: "#ffffff", fontSize: 13, fontFamily: "Helvetica-Bold" },
  churchTag: { color: "#cbd5e1", fontSize: 8, marginTop: 2 },
  flag: {
    color: "#ffffff",
    backgroundColor: "#2563eb",
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  body: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    gap: 8,
  },
  info: { flexGrow: 1, gap: 5 },
  label: { color: "#64748b", fontSize: 7, textTransform: "uppercase" },
  value: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#0f172a" },
  qr: { width: 62, height: 62 },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    borderTopStyle: "solid",
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  back: { flexGrow: 1, padding: 10 },
  backTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#0f172a", marginBottom: 6 },
  backText: { fontSize: 7.5, color: "#334155", lineHeight: 1.5 },
  sign: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#cbd5e1",
    borderTopStyle: "solid",
    paddingTop: 4,
    fontSize: 7.5,
    color: "#475569",
    textAlign: "center",
  },
};

function formatDate(d?: Date | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("carteirinhas.view");
  const { id } = await ctx.params;
  const card = await getCard(user.churchId ?? "", id);
  if (!card || !card.qrToken) {
    return new Response("Carteirinha não encontrada.", { status: 404 });
  }

  const qrDataUrl = await qrcode.toDataURL(card.qrToken, {
    margin: 0,
    width: 128,
    errorCorrectionLevel: "M",
  });
  const member = card.member;

  const doc = (
    <PDF.Document title={`Carteirinha ${card.cardNumber}`}>
      <PDF.Page size="A5" orientation="landscape" style={styles.page}>
        <PDF.View style={styles.card}>
          <PDF.View style={styles.header}>
            <PDF.View>
              <PDF.Text style={styles.churchName}>{card.church.name}</PDF.Text>
              <PDF.Text style={styles.churchTag}>Identificação do membro</PDF.Text>
            </PDF.View>
            <PDF.Text style={styles.flag}>Membro</PDF.Text>
          </PDF.View>
          <PDF.View style={styles.body}>
            <PDF.View style={styles.info}>
              <PDF.View>
                <PDF.Text style={styles.label}>Nome</PDF.Text>
                <PDF.Text style={styles.value}>{member.name}</PDF.Text>
              </PDF.View>
              <PDF.View style={{ flexDirection: "row", gap: 12 }}>
                <PDF.View>
                  <PDF.Text style={styles.label}>Matrícula</PDF.Text>
                  <PDF.Text style={styles.value}>{member.code}</PDF.Text>
                </PDF.View>
                <PDF.View>
                  <PDF.Text style={styles.label}>Carteirinha</PDF.Text>
                  <PDF.Text style={styles.value}>{card.cardNumber}</PDF.Text>
                </PDF.View>
              </PDF.View>
              <PDF.View>
                <PDF.Text style={styles.label}>Congregação</PDF.Text>
                <PDF.Text style={styles.value}>{card.congregation.name}</PDF.Text>
              </PDF.View>
            </PDF.View>
            <PDF.Image src={qrDataUrl} style={styles.qr} />
          </PDF.View>
          <PDF.View style={styles.footer}>
            <PDF.Text style={{ fontSize: 7, color: "#64748b" }}>
              Emissão {formatDate(card.issueDate)}
            </PDF.Text>
            <PDF.Text style={{ fontSize: 7, color: "#64748b" }}>
              Válida até {formatDate(card.validityDate)}
            </PDF.Text>
          </PDF.View>
        </PDF.View>

        <PDF.View style={styles.card}>
          <PDF.View style={styles.back}>
            <PDF.Text style={styles.backTitle}>Carteira de Membro Ecclesia</PDF.Text>
            <PDF.Text style={styles.backText}>
              {card.church.legalName ? `${card.church.legalName}\n` : ""}
              {card.church.cnpj ? `CNPJ: ${card.church.cnpj}\n` : ""}
              {`\n`}
              {`Esta carteirinha é de uso exclusivo do titular e identifica o portador como membro da igreja acima. Em caso de perda ou extravio, comunique imediatamente a secretaria.\n`}
              {`\n`}
              {`Conteúdo assinado digitalmente e verificável pelo QR Code ao lado.`}
            </PDF.Text>
            <PDF.Text style={styles.sign}>
              {card.church.name} · Protocolo {card.id}
            </PDF.Text>
          </PDF.View>
        </PDF.View>
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