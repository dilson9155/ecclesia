import * as PDF from "@react-pdf/renderer";

export const CARD_WIDTH = 242.6;
export const CARD_HEIGHT = 153;

const CARD_BLUE = "#1d4ed8";
const CARD_DARK = "#0f172a";
const CARD_MUTED = "#64748b";

export type MemberCardPdfData = {
  id: string;
  cardNumber: string | null;
  issueDate: Date;
  validityDate: Date | null;
  qrDataUrl: string;
  member: {
    name: string;
    code: string;
    cpf: string | null;
    rg: string | null;
    birthDate: Date | null;
    maritalStatus: string | null;
    cargo: string | null;
    ministerio: string | null;
    departamento: string | null;
    phone: string | null;
    city: string | null;
    state: string | null;
  };
  congregation: {
    name: string;
    city: string | null;
    state: string | null;
    sedeName: string | null;
  };
  church: {
    name: string;
    legalName: string | null;
    cnpj: string | null;
    phone: string | null;
    email: string | null;
    logoUrl: string | null;
  };
  pastor: {
    name: string;
    imageUrl: string | null;
  };
};

const styles: PDF.Styles = {
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 8,
    borderWidth: 0.8,
    borderColor: "#cbd5e1",
    borderStyle: "solid",
    overflow: "hidden",
    backgroundColor: "#ffffff",
    flexDirection: "column",
  },
  header: {
    height: 39,
    backgroundColor: CARD_DARK,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  logoFrame: {
    width: 27,
    height: 27,
    borderRadius: 4,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    padding: 2,
  },
  logo: { width: 23, height: 23, objectFit: "contain" },
  churchName: {
    color: "#ffffff",
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.15,
  },
  churchTag: { color: "#cbd5e1", fontSize: 4.8, marginTop: 1.5 },
  headerBadge: {
    color: "#ffffff",
    backgroundColor: CARD_BLUE,
    fontSize: 5,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.4,
    paddingHorizontal: 5,
    paddingVertical: 2.5,
    borderRadius: 3,
    textTransform: "uppercase",
  },
  body: { flexGrow: 1, paddingHorizontal: 9, paddingTop: 7, flexDirection: "row", gap: 7 },
  left: { flexGrow: 1 },
  name: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: CARD_DARK, lineHeight: 1.15 },
  cargo: {
    marginTop: 1.5,
    fontSize: 6,
    color: CARD_BLUE,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.25,
  },
  infoGrid: { marginTop: 5, flexDirection: "row", flexWrap: "wrap", gap: 4 },
  infoCell: { width: "47%" },
  label: {
    fontSize: 4.3,
    color: CARD_MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.15,
  },
  value: { fontSize: 5.8, color: CARD_DARK, fontFamily: "Helvetica-Bold", marginTop: 0.4 },
  valueSmall: { fontSize: 5.4, color: "#334155", marginTop: 0.4 },
  right: { width: 55, alignItems: "center", justifyContent: "space-between", paddingBottom: 2 },
  qr: { width: 49, height: 49 },
  qrHint: { fontSize: 4.2, color: CARD_MUTED, textAlign: "center", marginTop: 2 },
  validity: {
    width: 55,
    borderRadius: 3,
    backgroundColor: "#eff6ff",
    paddingVertical: 3,
    paddingHorizontal: 3,
    alignItems: "center",
  },
  validityLabel: { fontSize: 3.9, color: CARD_MUTED, textTransform: "uppercase" },
  validityValue: { fontSize: 5.5, color: CARD_BLUE, fontFamily: "Helvetica-Bold", marginTop: 1 },
  footer: {
    height: 19,
    borderTopWidth: 0.8,
    borderTopColor: "#e2e8f0",
    borderTopStyle: "solid",
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 4.6, color: CARD_MUTED },
  signatureWrap: { flexDirection: "row", alignItems: "center", gap: 3 },
  signature: { width: 44, height: 11, objectFit: "contain" },
  signatureName: { fontSize: 4.6, color: "#475569" },
  back: { flexGrow: 1, padding: 10, backgroundColor: "#ffffff" },
  backHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  backTitle: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: CARD_DARK },
  backSub: { fontSize: 5, color: CARD_MUTED, marginTop: 1 },
  backText: { fontSize: 5.6, color: "#334155", lineHeight: 1.45 },
  backInfo: {
    marginTop: 6,
    padding: 6,
    borderRadius: 4,
    backgroundColor: "#f8fafc",
    borderWidth: 0.5,
    borderColor: "#e2e8f0",
    borderStyle: "solid",
  },
  backInfoText: { fontSize: 5.2, color: "#475569", lineHeight: 1.4 },
  backSignRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
  },
  backSignBlock: { width: 95, alignItems: "center" },
  backSignImage: { width: 62, height: 17, objectFit: "contain" },
  backSignLine: {
    width: 92,
    borderTopWidth: 0.6,
    borderTopColor: "#94a3b8",
    borderTopStyle: "solid",
    paddingTop: 3,
    textAlign: "center",
    fontSize: 5,
    color: "#475569",
  },
  backProtocol: { marginTop: 4, textAlign: "center", fontSize: 4.2, color: "#94a3b8" },
};

const MARITAL_LABELS: Record<string, string> = {
  SOLTEIRO: "Solteiro(a)",
  CASADO: "Casado(a)",
  DIVORCIADO: "Divorciado(a)",
  VIUVO: "Viúvo(a)",
  UNIAO_ESTAVEL: "União estável",
};

function formatDate(value?: Date | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <PDF.View style={styles.infoCell}>
      <PDF.Text style={styles.label}>{label}</PDF.Text>
      <PDF.Text style={styles.value}>{value || "—"}</PDF.Text>
    </PDF.View>
  );
}

export function MemberCardFront({ data }: { data: MemberCardPdfData }) {
  const churchInitials = data.church.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <PDF.View style={styles.card}>
      <PDF.View style={styles.header}>
        <PDF.View style={styles.logoFrame}>
          {data.church.logoUrl ? (
            <PDF.Image src={data.church.logoUrl} style={styles.logo} />
          ) : (
            <PDF.Text style={{ color: CARD_BLUE, fontSize: 8, fontFamily: "Helvetica-Bold" }}>
              {churchInitials || "I"}
            </PDF.Text>
          )}
        </PDF.View>
        <PDF.View style={{ flexGrow: 1 }}>
          <PDF.Text style={styles.churchName}>{data.church.name}</PDF.Text>
          <PDF.Text style={styles.churchTag}>Carteira de identificação de membro</PDF.Text>
        </PDF.View>
        <PDF.Text style={styles.headerBadge}>Membro</PDF.Text>
      </PDF.View>

      <PDF.View style={styles.body}>
        <PDF.View style={styles.left}>
          <PDF.Text style={styles.name}>{data.member.name}</PDF.Text>
          <PDF.Text style={styles.cargo}>
            {data.member.cargo || "Membro"} · {data.congregation.name}
          </PDF.Text>

          <PDF.View style={styles.infoGrid}>
            <Info label="Matrícula" value={data.member.code} />
            <Info label="Carteirinha" value={data.cardNumber} />
            <Info label="CPF" value={data.member.cpf} />
            <Info label="RG" value={data.member.rg} />
            <Info label="Nascimento" value={formatDate(data.member.birthDate)} />
            <Info
              label="Estado civil"
              value={
                data.member.maritalStatus
                  ? MARITAL_LABELS[data.member.maritalStatus] ?? data.member.maritalStatus
                  : null
              }
            />
            <Info
              label="Ministério / departamento"
              value={
                [data.member.ministerio, data.member.departamento]
                  .filter(Boolean)
                  .join(" · ") || null
              }
            />
            <Info
              label="Cidade / UF"
              value={
                [data.member.city || data.congregation.city, data.member.state || data.congregation.state]
                  .filter(Boolean)
                  .join(" / ") || null
              }
            />
          </PDF.View>
        </PDF.View>

        <PDF.View style={styles.right}>
          <PDF.Image src={data.qrDataUrl} style={styles.qr} />
          <PDF.Text style={styles.qrHint}>Validação digital</PDF.Text>
          <PDF.View style={styles.validity}>
            <PDF.Text style={styles.validityLabel}>Válida até</PDF.Text>
            <PDF.Text style={styles.validityValue}>{formatDate(data.validityDate)}</PDF.Text>
          </PDF.View>
        </PDF.View>
      </PDF.View>

      <PDF.View style={styles.footer}>
        <PDF.Text style={styles.footerText}>
          Emitida em {formatDate(data.issueDate)} · {data.congregation.sedeName || data.church.name}
        </PDF.Text>
        <PDF.View style={styles.signatureWrap}>
          {data.pastor.imageUrl ? (
            <PDF.Image src={data.pastor.imageUrl} style={styles.signature} />
          ) : null}
          <PDF.Text style={styles.signatureName}>
            {data.pastor.name || "Pastor(a) responsável"}
          </PDF.Text>
        </PDF.View>
      </PDF.View>
    </PDF.View>
  );
}

export function MemberCardBack({ data }: { data: MemberCardPdfData }) {
  return (
    <PDF.View style={styles.card}>
      <PDF.View style={styles.back}>
        <PDF.View style={styles.backHeader}>
          {data.church.logoUrl ? (
            <PDF.Image src={data.church.logoUrl} style={styles.logo} />
          ) : null}
          <PDF.View>
            <PDF.Text style={styles.backTitle}>Carteira de Membro</PDF.Text>
            <PDF.Text style={styles.backSub}>
              {data.church.legalName || data.church.name}
              {data.church.cnpj ? ` · CNPJ ${data.church.cnpj}` : ""}
            </PDF.Text>
          </PDF.View>
        </PDF.View>

        <PDF.Text style={styles.backText}>
          Esta carteirinha identifica o titular como membro da igreja acima e é de uso pessoal e
          intransferível. Em caso de perda ou extravio, comunique imediatamente a secretaria.
          A autenticidade pode ser conferida pelo QR Code da frente.
        </PDF.Text>

        <PDF.View style={styles.backInfo}>
          <PDF.Text style={styles.backInfoText}>
            {data.church.phone ? `Telefone: ${data.church.phone}\n` : ""}
            {data.church.email ? `E-mail: ${data.church.email}\n` : ""}
            {data.congregation.name ? `Congregação: ${data.congregation.name}\n` : ""}
            {data.member.phone ? `Contato do membro: ${data.member.phone}` : ""}
          </PDF.Text>
        </PDF.View>

        <PDF.View style={styles.backSignRow}>
          <PDF.View style={styles.backSignBlock}>
            {data.pastor.imageUrl ? (
              <PDF.Image src={data.pastor.imageUrl} style={styles.backSignImage} />
            ) : null}
            <PDF.Text style={styles.backSignLine}>
              {data.pastor.name || "Pastor(a)"}
            </PDF.Text>
          </PDF.View>
          <PDF.View style={styles.backSignBlock}>
            <PDF.Text style={styles.backSignLine}>Secretaria da Igreja</PDF.Text>
          </PDF.View>
        </PDF.View>

        <PDF.Text style={styles.backProtocol}>Protocolo {data.id}</PDF.Text>
      </PDF.View>
    </PDF.View>
  );
}

export const memberCardStyles = styles;
