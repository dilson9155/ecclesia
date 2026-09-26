import * as PDF from "@react-pdf/renderer";
import { requirePermission } from "@/lib/rbac";
import { scopeFromUser, scopedCongregationIdsOrNull } from "@/lib/scope";
import { getLetter } from "@/services/documents.service";

const styles: PDF.Styles = {
  page: {
    paddingTop: 56,
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
    paddingBottom: 10,
    marginBottom: 22,
  },
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
  signRow: { marginTop: 40, alignItems: "center" },
  signLine: {
    borderTopWidth: 1,
    borderTopColor: "#64748b",
    borderTopStyle: "solid",
    paddingTop: 6,
    width: 320,
    textAlign: "center",
    color: "#475569",
  },
  footer: {
    position: "absolute",
    bottom: 40,
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

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("cartas.view");
  const { id } = await ctx.params;
  const document = await getLetter(
    user.churchId ?? "",
    id,
    await scopedCongregationIdsOrNull(scopeFromUser(user))
  );
  if (!document) {
    return new Response("Documento não encontrado.", { status: 404 });
  }

  const paragraphs = document.content.split(/\n+/);
  const member = document.member;
  const church = document.church;

  const doc = (
    <PDF.Document title={document.title}>
      <PDF.Page size="A4" style={styles.page}>
        <PDF.View style={styles.header}>
          <PDF.Text style={styles.church}>{church.legalName || church.name}</PDF.Text>
          <PDF.Text style={styles.meta}>
            {church.cnpj ? `CNPJ: ${church.cnpj} · ` : ""}
            {church.phone ? `${church.phone} · ` : ""}
            {church.email ?? ""}
          </PDF.Text>
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

        <PDF.View style={styles.signRow}>
          <PDF.Text style={{ marginBottom: 4, fontSize: 10, color: "#475569" }}>
            {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
              .format(document.issueDate)}
          </PDF.Text>
          <PDF.Text style={styles.signLine}>
            {document.signatureName || church.name}
          </PDF.Text>
        </PDF.View>

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