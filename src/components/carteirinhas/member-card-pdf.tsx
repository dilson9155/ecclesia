import * as PDF from "@react-pdf/renderer";

export const CARD_WIDTH = 242.6;
export const CARD_HEIGHT = 153;

/**
 * Paleta da credencial: azul-marinho profundo + dourado.
 * O fundo é desenhado em SVG para permitir gradientes e curvas suaves.
 */
const NAVY_950 = "#04122A";
const NAVY_900 = "#071A38";
const NAVY_800 = "#0A2450";
const NAVY_700 = "#0E3168";
const NAVY_600 = "#15437F";
const GOLD_300 = "#FFE08A";
const GOLD_400 = "#FFC93C";
const GOLD_500 = "#F5B301";
const GOLD_600 = "#D99A00";
const WHITE = "#FFFFFF";
const ICE = "#BFD3EE";
const MUTED = "#8FA9CC";

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
    borderRadius: 9,
    overflow: "hidden",
    backgroundColor: NAVY_950,
    position: "relative",
    flexDirection: "column",
  },
  bgWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  header: {
    height: 34,
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoFrame: {
    width: 27,
    height: 27,
    borderRadius: 7.5,
    backgroundColor: GOLD_500,
    borderWidth: 0.7,
    borderColor: GOLD_300,
    borderStyle: "solid",
    alignItems: "center",
    justifyContent: "center",
  },
  logoInner: {
    width: 21,
    height: 21,
    borderRadius: 4.5,
    backgroundColor: WHITE,
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logo: { width: 17, height: 17, objectFit: "contain" },
  logoInitials: {
    color: NAVY_900,
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
  },
  churchName: {
    color: WHITE,
    fontSize: 8.6,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.1,
  },
  churchTag: {
    color: GOLD_400,
    fontSize: 4.3,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginTop: 1.6,
  },
  body: {
    flexGrow: 1,
    paddingHorizontal: 11,
    paddingTop: 7,
    paddingBottom: 3,
    flexDirection: "row",
    gap: 8,
  },
  left: { flexGrow: 1, justifyContent: "space-between" },
  identity: { flexDirection: "row", alignItems: "flex-start", gap: 7 },
  identityText: { flexGrow: 1, paddingTop: 0.5 },
  photoFrame: {
    width: 46,
    height: 54,
    borderRadius: 6,
    borderWidth: 1.1,
    borderColor: GOLD_400,
    borderStyle: "solid",
    backgroundColor: NAVY_700,
    padding: 1.3,
  },
  photoInner: {
    width: "100%",
    height: "100%",
    borderRadius: 4.6,
    overflow: "hidden",
    backgroundColor: NAVY_600,
    alignItems: "center",
    justifyContent: "center",
  },
  photo: { width: "100%", height: "100%", objectFit: "cover" },
  photoFallback: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: GOLD_300,
  },
  name: {
    fontSize: 10.6,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
    lineHeight: 1.12,
  },
  cargo: {
    marginTop: 2.5,
    fontSize: 5.4,
    color: GOLD_400,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  congregation: { marginTop: 2, fontSize: 5, color: ICE },
  matriculaPill: {
    marginTop: 5,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 2.2,
    paddingHorizontal: 5,
    borderRadius: 3,
    backgroundColor: "#0B2450",
    borderWidth: 0.7,
    borderColor: GOLD_500,
    borderStyle: "solid",
  },
  matriculaLabel: {
    fontSize: 3.8,
    color: GOLD_300,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  matriculaValue: {
    fontSize: 6.2,
    color: WHITE,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.7,
  },
  label: {
    fontSize: 4.5,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  value: {
    fontSize: 6.2,
    color: WHITE,
    fontFamily: "Helvetica-Bold",
    marginTop: 0.8,
  },
  right: {
    width: 56,
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 2,
  },
  qrPanel: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: WHITE,
    borderWidth: 0.9,
    borderColor: GOLD_400,
    borderStyle: "solid",
    padding: 3.4,
    alignItems: "center",
    justifyContent: "center",
  },
  qr: { width: 45, height: 45 },
  qrHint: {
    fontSize: 3.7,
    color: GOLD_300,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 2.6,
  },
  validity: {
    width: 56,
    borderRadius: 5,
    backgroundColor: WHITE,
    borderWidth: 0.9,
    borderColor: GOLD_500,
    borderStyle: "solid",
    paddingVertical: 3.4,
    alignItems: "center",
  },
  validityLabel: {
    fontSize: 3.6,
    color: "#8A6A00",
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  validityValue: {
    fontSize: 5.8,
    color: NAVY_950,
    fontFamily: "Helvetica-Bold",
    marginTop: 1,
  },
  footer: {
    height: 16,
    backgroundColor: GOLD_500,
    borderTopWidth: 0.8,
    borderTopColor: GOLD_300,
    borderTopStyle: "solid",
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 4.4,
    color: "#4A3600",
    fontFamily: "Helvetica-Bold",
  },
  back: { flexGrow: 1, paddingHorizontal: 10, paddingTop: 8, paddingBottom: 6 },
  backHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  backTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: WHITE },
  backSub: { fontSize: 4.2, color: ICE, marginTop: 1.2 },
  sectionTitle: {
    marginTop: 7,
    fontSize: 4.3,
    fontFamily: "Helvetica-Bold",
    color: GOLD_400,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  backGrid: { marginTop: 3, flexDirection: "row", flexWrap: "wrap", gap: 4 },
  backCell: { width: "31%" },
  backCellWide: { width: "48%" },
  contactPanel: {
    marginTop: 7,
    paddingVertical: 4,
    paddingHorizontal: 5,
    borderRadius: 5,
    backgroundColor: "#0B2450",
    borderLeftWidth: 1.6,
    borderLeftColor: GOLD_500,
    borderLeftStyle: "solid",
  },
  panelLabel: {
    fontSize: 4,
    color: GOLD_400,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 1.6,
  },
  panelText: { fontSize: 4.5, color: ICE, lineHeight: 1.4 },
  notice: {
    marginTop: 7,
    paddingTop: 4,
    borderTopWidth: 0.4,
    borderTopColor: "#2A5188",
    borderTopStyle: "solid",
  },
  noticeLabel: {
    fontSize: 4,
    color: GOLD_400,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 1.6,
  },
  noticeText: {
    fontSize: 4.2,
    color: "#A9C1E0",
    lineHeight: 1.45,
  },
  backFooter: {
    height: 13,
    backgroundColor: GOLD_500,
    borderTopWidth: 0.7,
    borderTopColor: GOLD_300,
    borderTopStyle: "solid",
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backFooterText: {
    fontSize: 4,
    color: "#4A3600",
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.3,
  },
  backFooterProtocol: { fontSize: 3.5, color: "#5A4300" },
  backSignRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
  },
  backSignBlock: { width: 95, alignItems: "center" },
  backSignImage: { width: 48, height: 10, objectFit: "contain" },
  backSignLine: {
    width: 90,
    borderTopWidth: 0.6,
    borderTopColor: GOLD_500,
    borderTopStyle: "solid",
    paddingTop: 2,
    textAlign: "center",
    fontSize: 4.5,
    color: ICE,
  },
  backProtocol: {
    marginTop: 1.5,
    textAlign: "center",
    fontSize: 3.5,
    color: "#6F8BB3",
  },
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

/** Fundo em SVG: gradiente marinho + detalhes dourados. */
function CardBackground({ variant }: { variant: "front" | "back" }) {
  const navyId = `navy-${variant}`;
  const goldId = `gold-${variant}`;

  return (
    <PDF.View style={styles.bgWrap}>
      <PDF.Svg
        width={CARD_WIDTH}
        height={CARD_HEIGHT}
        viewBox={`0 0 ${CARD_WIDTH} ${CARD_HEIGHT}`}
      >
        <PDF.Defs>
          <PDF.LinearGradient id={navyId} x1="0" y1="0" x2="1" y2="1">
            <PDF.Stop offset="0" stopColor={NAVY_950} />
            <PDF.Stop offset="0.52" stopColor={NAVY_800} />
            <PDF.Stop offset="1" stopColor={NAVY_600} />
          </PDF.LinearGradient>
          <PDF.LinearGradient id={goldId} x1="0" y1="0" x2="1" y2="1">
            <PDF.Stop offset="0" stopColor={GOLD_300} />
            <PDF.Stop offset="0.45" stopColor={GOLD_500} />
            <PDF.Stop offset="1" stopColor={GOLD_600} />
          </PDF.LinearGradient>
        </PDF.Defs>

        <PDF.Rect
          x="0"
          y="0"
          width={CARD_WIDTH}
          height={CARD_HEIGHT}
          rx="9"
          fill={`url(#${navyId})`}
        />

        {/* Brilho diagonal suave no canto superior direito. */}
        <PDF.Path
          d={`M${CARD_WIDTH} 0 V46 C216 38 190 20 174 0 Z`}
          fill="#1E4F94"
          opacity={0.28}
        />

        {/* Aros dourados discretos, como um selo ao fundo. */}
        <PDF.Circle
          cx="228"
          cy="18"
          r="40"
          fill="none"
          stroke={GOLD_500}
          strokeWidth={0.7}
          opacity={0.16}
        />
        <PDF.Circle
          cx="228"
          cy="18"
          r="29"
          fill="none"
          stroke={GOLD_500}
          strokeWidth={0.5}
          opacity={0.12}
        />

        {/* Faixa dourada na borda esquerda. */}
        <PDF.Path d={`M0 0 H4.6 V${CARD_HEIGHT} H0 Z`} fill={`url(#${goldId})`} />
        <PDF.Path
          d={`M4.6 0 V${CARD_HEIGHT}`}
          fill="none"
          stroke={GOLD_300}
          strokeWidth={0.45}
          opacity={0.5}
        />

        {/* Moldura interna fina. */}
        <PDF.Rect
          x="0.5"
          y="0.5"
          width={CARD_WIDTH - 1}
          height={CARD_HEIGHT - 1}
          rx="8.5"
          fill="none"
          stroke={GOLD_400}
          strokeWidth={0.45}
          opacity={0.35}
        />
      </PDF.Svg>
    </PDF.View>
  );
}

function CardLogo({ data }: { data: MemberCardPdfData }) {
  return (
    <PDF.View style={styles.logoFrame}>
      {data.church.logoUrl ? (
        <PDF.View style={styles.logoInner}>
          <PDF.Image src={data.church.logoUrl} style={styles.logo} />
        </PDF.View>
      ) : (
        <PDF.Text style={styles.logoInitials}>
          {churchInitials(data.church.name) || "I"}
        </PDF.Text>
      )}
    </PDF.View>
  );
}

function BackInfo({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <PDF.View style={styles.backCell}>
      <PDF.Text style={styles.label}>{label}</PDF.Text>
      <PDF.Text style={styles.value}>{value || "—"}</PDF.Text>
    </PDF.View>
  );
}

export function MemberCardFront({ data }: { data: MemberCardPdfData }) {
  return (
    <PDF.View style={styles.card}>
      <CardBackground variant="front" />

      <PDF.View style={styles.header}>
        <CardLogo data={data} />
        <PDF.View style={{ flexGrow: 1 }}>
          <PDF.Text style={styles.churchName}>{data.church.name}</PDF.Text>
          <PDF.Text style={styles.churchTag}>Carteira de membro</PDF.Text>
        </PDF.View>
      </PDF.View>

      <PDF.View style={styles.body}>
        <PDF.View style={styles.left}>
          <PDF.View style={styles.identity}>
            <PDF.View style={styles.photoFrame}>
              <PDF.View style={styles.photoInner}>
                {data.member.photoUrl ? (
                  <PDF.Image src={data.member.photoUrl} style={styles.photo} />
                ) : (
                  <PDF.Text style={styles.photoFallback}>
                    {initials(data.member.name)}
                  </PDF.Text>
                )}
              </PDF.View>
            </PDF.View>
            <PDF.View style={styles.identityText}>
              <PDF.Text style={styles.name}>{data.member.name}</PDF.Text>
              <PDF.Text style={styles.cargo}>{data.member.cargo || "Membro"}</PDF.Text>
              <PDF.Text style={styles.congregation}>{data.congregation.name}</PDF.Text>
            </PDF.View>
          </PDF.View>

          <PDF.View style={styles.matriculaPill}>
            <PDF.Text style={styles.matriculaLabel}>Matrícula</PDF.Text>
            <PDF.Text style={styles.matriculaValue}>{data.member.code}</PDF.Text>
          </PDF.View>
        </PDF.View>

        <PDF.View style={styles.right}>
          <PDF.View>
            <PDF.View style={styles.qrPanel}>
              <PDF.Image src={data.qrDataUrl} style={styles.qr} />
            </PDF.View>
            <PDF.Text style={styles.qrHint}>Validação digital</PDF.Text>
          </PDF.View>
          <PDF.View style={styles.validity}>
            <PDF.Text style={styles.validityLabel}>Válida até</PDF.Text>
            <PDF.Text style={styles.validityValue}>
              {formatDate(data.validityDate)}
            </PDF.Text>
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
      <CardBackground variant="back" />

      <PDF.View style={styles.back}>
        <PDF.View style={styles.backHeader}>
          <CardLogo data={data} />
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
          <BackInfo label="RG" value={data.member.rg} />
          <BackInfo label="Nascimento" value={formatDate(data.member.birthDate)} />
          <BackInfo
            label="Estado civil"
            value={
              data.member.maritalStatus
                ? MARITAL_LABELS[data.member.maritalStatus] ?? data.member.maritalStatus
                : null
            }
          />
          <BackInfo label="Telefone" value={data.member.phone} />
          <BackInfo
            label="Ministério / Depto"
            value={[data.member.ministerio, data.member.departamento]
              .filter(Boolean)
              .join(" · ")}
          />
          <BackInfo label="Cidade / UF" value={cityState} />
        </PDF.View>

        <PDF.View style={styles.contactPanel}>
          <PDF.Text style={styles.panelLabel}>Contato da igreja</PDF.Text>
          <PDF.Text style={styles.panelText}>
            {[data.church.phone, data.church.email].filter(Boolean).join(" · ") ||
              data.church.name}
            {data.congregation.sedeName ? `\nSede: ${data.congregation.sedeName}` : ""}
          </PDF.Text>
        </PDF.View>

        <PDF.View style={styles.notice}>
          <PDF.Text style={styles.noticeLabel}>Importante</PDF.Text>
          <PDF.Text style={styles.noticeText}>
            Documento pessoal e intransferível. Em caso de perda ou extravio, comunique a
            secretaria da igreja. A autenticidade é conferida pelo QR Code impresso na
            frente.
          </PDF.Text>
        </PDF.View>

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
      </PDF.View>

      <PDF.View style={styles.backFooter}>
        <PDF.Text style={styles.backFooterText}>
          {data.church.name}
          {data.congregation.name ? ` · ${data.congregation.name}` : ""}
        </PDF.Text>
        <PDF.Text style={styles.backFooterProtocol}>
          Protocolo {data.id.slice(-10)}
        </PDF.Text>
      </PDF.View>
    </PDF.View>
  );
}

export const memberCardStyles = styles;
