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
    photoUrl: string | null;
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
    height: 36,
    backgroundColor: CARD_DARK,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  logoFrame: {
    width: 25,
    height: 25,
    borderRadius: 4,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    padding: 2,
  },
  logo: { width: 21, height: 21, objectFit: "contain" },
  churchName: {
    color: "#ffffff",
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.15,
  },
  churchTag: { color: "#cbd5e1", fontSize: 4.6, marginTop: 1.5 },
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
  body: {
    flexGrow: 1,
    paddingHorizontal: 9,
    paddingTop: 7,
    paddingBottom: 4,
    flexDirection: "row",
    gap: 7,
  },
  left: { flexGrow: 1 },
  identity: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  identityText: { flexGrow: 1, paddingTop: 1 },
  photoFrame: {
    width: 38,
    height: 46,
    borderRadius: 3,
    borderWidth: 0.8,
    borderColor: "#cbd5e1",
    borderStyle: "solid",
    overflow: "hidden",
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  photo: { width: "100%", height: "100%", objectFit: "cover" },
  photoFallback: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#94a3b8",
  },
  name: { fontSize: 9.8, fontFamily: "Helvetica-Bold", color: CARD_DARK, lineHeight: 1.15 },
  cargo: {
    marginTop: 2,
    fontSize: 5.6,
    color: CARD_BLUE,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.25,
  },
  congregation: { marginTop: 1.5, fontSize: 5.2, color: CARD_MUTED },
  infoGrid: { marginTop: 7, flexDirection: "row", flexWrap: "wrap", gap: 4 },
  infoCell: { width: "47%" },
  infoCellWide: { width: "100%" },
  label: {
    fontSize: 4.2,
    color: CARD_MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.15,
  },
  value: { fontSize: 5.8, color: CARD_DARK, fontFamily: "Helvetica-Bold", marginTop: 0.4 },
  right: { width: 52, alignItems: "center", justifyContent: "space-between", paddingBottom: 1 },
  qr: { width: 46, height: 46 },
  qrHint: { fontSize: 4, color: CARD_MUTED, textAlign: "center", marginTop: 2 },
  validity: {
    width: 52,
    borderRadius: 3,
    backgroundColor: "#eff6ff",
    paddingVertical: 3,
    paddingHorizontal: 3,
    alignItems: "center",
  },
  validityLabel: { fontSize: 3.9, color: CARD_MUTED, textTransform: "uppercase" },
  validityValue: { fontSize: 5.5, color: CARD_BLUE, fontFamily: "Helvetica-Bold", marginTop: 1 },
  footer: {
    height: 17,
    borderTopWidth: 0.8,
    borderTopColor: "#e2e8f0",
    borderTopStyle: "solid",
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 4.6, color: CARD_MUTED },
  back: { flexGrow: 1, padding: 7, backgroundColor: "#ffffff" },
  backHeader: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 3 },
  backTitle: { fontSize: 7.2, fontFamily: "Helvetica-Bold", color: CARD_DARK },
  backSub: { fontSize: 4.3, color: CARD_MUTED, marginTop: 1 },
  sectionTitle: {
    fontSize: 4.4,
    fontFamily: "Helvetica-Bold",
    color: CARD_BLUE,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  backGrid: { marginTop: 1.5, flexDirection: "row", flexWrap: "wrap", gap: 3 },
  backCell: { width: "31%" },
  backCellWide: { width: "48%" },
  backInfo: {
    marginTop: 4,
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderRadius: 3,
    backgroundColor: "#f8fafc",
    borderWidth: 0.5,
    borderColor: "#e2e8f0",
    borderStyle: "solid",
  },
  backInfoText: { fontSize: 4.4, color: "#475569", lineHeight: 1.25 },
  backText: { marginTop: 4, fontSize: 4.6, color: "#334155", lineHeight: 1.3 },
  backSignRow: {
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
  },
  backSignBlock: { width: 95, alignItems: "center" },
  backSignImage: { width: 48, height: 10, objectFit: "contain" },
  backSignLine: {
    width: 90,
    borderTopWidth: 0.6,
    borderTopColor: "#94a3b8",
    borderTopStyle: "solid",
    paddingTop: 2,
    textAlign: "center",
    fontSize: 4.5,
    color: "#475569",
  },
  backProtocol: { marginTop: 1.5, textAlign: "center", fontSize: 3.6, color: "#94a3b8" },
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

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function churchInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function Info({
  label,
  value,
  wide,
}: {
  label: string;
  value: string | null | undefined;
  wide?: boolean;
}) {
  return (
    <PDF.View style={wide ? styles.infoCellWide : styles.infoCell}>
      <PDF.Text style={styles.label}>{label}</PDF.Text>
      <PDF.Text style={styles.value}>{value || "—"}</PDF.Text>
    </PDF.View>
  );
}

function BackInfo({
  label,
  value,
  wide,
}: {
  label: string;
  value: string | null | undefined;
  wide?: boolean;
}) {
  return (
    <PDF.View style={wide ? styles.backCellWide : styles.backCell}>
      <PDF.Text style={styles.label}>{label}</PDF.Text>
      <PDF.Text style={styles.value}>{value || "—"}</PDF.Text>
    </PDF.View>
  );
}

export function MemberCardFront({ data }: { data: MemberCardPdfData }) {
  return (
    <PDF.View style={styles.card}>
      <PDF.View style={styles.header}>
        <PDF.View style={styles.logoFrame}>
          {data.church.logoUrl ? (
            <PDF.Image src={data.church.logoUrl} style={styles.logo} />
          ) : (
            <PDF.Text style={{ color: CARD_BLUE, fontSize: 7, fontFamily: "Helvetica-Bold" }}>
              {churchInitials(data.church.name) || "I"}
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
          <PDF.View style={styles.identity}>
            <PDF.View style={styles.photoFrame}>
              {data.member.photoUrl ? (
                <PDF.Image src={data.member.photoUrl} style={styles.photo} />
              ) : (
                <PDF.Text style={styles.photoFallback}>
                  {initials(data.member.name)}
                </PDF.Text>
              )}
            </PDF.View>
            <PDF.View style={styles.identityText}>
              <PDF.Text style={styles.name}>{data.member.name}</PDF.Text>
              <PDF.Text style={styles.cargo}>{data.member.cargo || "Membro"}</PDF.Text>
              <PDF.Text style={styles.congregation}>{data.congregation.name}</PDF.Text>
            </PDF.View>
          </PDF.View>

          <PDF.View style={styles.infoGrid}>
            <Info label="Matrícula" value={data.member.code} />
            <Info label="Carteirinha" value={data.cardNumber} />
            <Info label="CPF" value={data.member.cpf} wide />
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
          Emitida em {formatDate(data.issueDate)}
        </PDF.Text>
        <PDF.Text style={styles.footerText}>
          {data.congregation.sedeName || data.church.name}
        </PDF.Text>
      </PDF.View>
    </PDF.View>
  );
}

export function MemberCardBack({ data }: { data: MemberCardPdfData }) {
  const cityState =
    [data.member.city || data.congregation.city, data.member.state || data.congregation.state]
      .filter(Boolean)
      .join(" / ") || null;

  return (
    <PDF.View style={styles.card}>
      <PDF.View style={styles.back}>
        <PDF.View style={styles.backHeader}>
          {data.church.logoUrl ? (
            <PDF.Image src={data.church.logoUrl} style={styles.logo} />
          ) : null}
          <PDF.View style={{ flexGrow: 1 }}>
            <PDF.Text style={styles.backTitle}>Carteira de Membro</PDF.Text>
            <PDF.Text style={styles.backSub}>
              {data.church.legalName || data.church.name}
              {data.church.cnpj ? ` · CNPJ ${data.church.cnpj}` : ""}
            </PDF.Text>
          </PDF.View>
        </PDF.View>

        <PDF.Text style={styles.sectionTitle}>Dados do membro</PDF.Text>
        <PDF.View style={styles.backGrid}>
          <BackInfo label="RG" value={data.member.rg} wide />
          <BackInfo label="Nascimento" value={formatDate(data.member.birthDate)} wide />
          <BackInfo
            label="Estado civil"
            value={
              data.member.maritalStatus
                ? MARITAL_LABELS[data.member.maritalStatus] ?? data.member.maritalStatus
                : null
            }
            wide
          />
          <BackInfo label="Telefone" value={data.member.phone} wide />
          <BackInfo
            label="Ministério / Depto"
            value={[data.member.ministerio, data.member.departamento]
              .filter(Boolean)
              .join(" · ")}
            wide
          />
          <BackInfo label="Cidade / UF" value={cityState} wide />
        </PDF.View>

        <PDF.View style={styles.backInfo}>
          <PDF.Text style={styles.backInfoText}>
            {data.church.phone ? `Igreja: ${data.church.phone}` : ""}
            {data.church.phone && data.church.email ? " · " : ""}
            {data.church.email ? `${data.church.email}` : ""}
            {data.congregation.sedeName ? `\nSede: ${data.congregation.sedeName}` : ""}
          </PDF.Text>
        </PDF.View>

        <PDF.Text style={styles.backText}>
          Documento pessoal e intransferível. Em caso de perda ou extravio, comunique a
          secretaria. Autenticidade conferida pelo QR Code da frente.
        </PDF.Text>

        <PDF.View style={{ flexGrow: 1 }} />

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
