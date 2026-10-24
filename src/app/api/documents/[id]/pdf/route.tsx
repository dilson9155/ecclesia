import * as PDF from "@react-pdf/renderer";
import { requirePermission } from "@/lib/rbac";
import { scopeFromUser, scopedCongregationIdsOrNull } from "@/lib/scope";
import { getLetter } from "@/services/documents.service";
import { getChurchBranding } from "@/services/branding.service";

const styles: PDF.Styles = {
  page: {
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 56,
    fontSize: 11,
    lineHeight: 1.7,
    color: "#1e293b",
    fontFamily: "Helvetica",
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: "#0f172a",
    borderBottomStyle: "solid",
    paddingBottom: 12,
    marginBottom: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logo: { width: 54, height: 54, objectFit: "contain" },
  headerText: { flexGrow: 1 },
  church: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#0f172a" },
  meta: { fontSize: 9, color: "#64748b", marginTop: 4 },
  title: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginBottom: 8,
    color: "#0f172a",
  },
  protocol: { fontSize: 8.5, color: "#94a3b8", textAlign: "center", marginBottom: 18 },
  body: { marginBottom: 26 },
  paragraph: { marginBottom: 8 },
  blank: { marginBottom: 12 },
  date: { marginTop: 26, marginBottom: 16, fontSize: 10, color: "#475569", textAlign: "center" },
  signRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-around",
    gap: 24,
  },
  signBlock: { alignItems: "center", width: 190 },
  signImage: { height: 44, maxWidth: 170, objectFit: "contain", marginBottom: 3 },
  signLine: {
    borderTopWidth: 1,
    borderTopColor: "#64748b",
    borderTopStyle: "solid",
    paddingTop: 5,
    width: 190,
    textAlign: "center",
    color: "#475569",
    fontSize: 9,
  },
  signRole: { fontSize: 7.5, color: "#94a3b8", textAlign: "center", marginTop: 2 },
  footer: {
    position: "absolute",
    bottom: 36,
    left: 56,
    right: 56,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    borderTopStyle: "solid",
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#94a3b8",
  },
};

function SignatureBlock({
  name,
  role,
  imageUrl,
}: {
  name: string;
  role: string;
  imageUrl: string | null;
}) {
  return (
    <PDF.View style={styles.signBlock}>
      {imageUrl ? <PDF.Image src={imageUrl} style={styles.signImage} /> : null}
      <PDF.Text style={styles.signLine}>{name || "________________________"}</PDF.Text>
      <PDF.Text style={styles.signRole}>{role}</PDF.Text>
    </PDF.View>
  );
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("cartas.view");
  const { id } = await ctx.params;
  const [document, branding] = await Promise.all([
    getLetter(
      user.churchId ?? "",
      id,
      await scopedCongregationIdsOrNull(scopeFromUser(user))
    ),
    getChurchBranding(user.churchId ?? ""),
  ]);
  if (!document) {
    return new Response("Documento não encontrado.", { status: 404 });
  }

  const paragraphs = document.content.split(/\n+/);
  const member = document.member;
  const church = document.church;

  const showDefaultSignatures =
    !document.signatureName && (branding.pastor.name || branding.secretary.name || branding.pastor.imageUrl || branding.secretary.imageUrl);

  const doc = (
    <PDF.Document title={document.title}>
      <PDF.Page size="A4" style={styles.page}>
        <PDF.View style={styles.header}>
          {branding.logoUrl ? <PDF.Image src={branding.logoUrl} style={styles.logo} /> : null}
          <PDF.View style={styles.headerText}>
            <PDF.Text style={styles.church}>{church.legalName || church.name}</PDF.Text>
            <PDF.Text style={styles.meta}>
              {church.cnpj ? `CNPJ: ${church.cnpj} · ` : ""}
              {church.phone ? `${church.phone} · ` : ""}
              {church.email ?? ""}
            </PDF.Text>
          </PDF.View>
        </PDF.View>

        <PDF.Text style={styles.title}>{document.title}</PDF.Text>
        <PDF.Text style={styles.protocol}>Protocolo {document.protocol}</PDF.Text>

        <PDF.View style={styles.body}>
          {paragraphs.map((p, i) => (
            <PDF.Text key={i} style={p.trim() ? styles.paragraph : styles.blank}>
              {p}
            </PDF.Text>
          ))}
        </PDF.View>

        <PDF.Text style={styles.date}>
          {new Intl.DateTimeFormat("pt-BR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          }).format(document.issueDate)}
        </PDF.Text>

        {showDefaultSignatures ? (
          <PDF.View style={styles.signRow} wrap={false}>
            <SignatureBlock
              name={branding.pastor.name}
              role="Pastor(a)"
              imageUrl={branding.pastor.imageUrl}
            />
            <SignatureBlock
              name={branding.secretary.name}
              role="Secretário(a)"
              imageUrl={branding.secretary.imageUrl}
            />
          </PDF.View>
        ) : (
          <PDF.View style={styles.signRow} wrap={false}>
            <SignatureBlock
              name={document.signatureName || church.name}
              role={document.signatureName ? "Assinatura" : "Igreja"}
              imageUrl={null}
            />
          </PDF.View>
        )}

        <PDF.View style={styles.footer}>
          <PDF.Text>
            {member ? `Emitido para: ${member.name} (${member.code})` : "Documento avulso"}
          </PDF.Text>
          <PDF.Text>Ecclesia · Gestão de Igrejas</PDF.Text>
        </PDF.View>
      </PDF.Page>
    </PDF.Document>
  );

  const buffer = await PDF.renderToBuffer(doc);
  return new Response(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="documento-${document.id}.pdf"`,
      "cache-control": "no-store",
    },
  });
}
