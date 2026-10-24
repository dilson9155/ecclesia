import "server-only";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/services/audit.service";

export const BRANDING_KEYS = {
  pastorName: "branding.pastorName",
  pastorSignature: "branding.pastorSignature",
  secretaryName: "branding.secretaryName",
  secretarySignature: "branding.secretarySignature",
  treasurerName: "branding.treasurerName",
  treasurerSignature: "branding.treasurerSignature",
} as const;

export type SignatureBranding = {
  name: string;
  imageUrl: string | null;
};

export type ChurchBranding = {
  churchId: string;
  name: string;
  legalName: string | null;
  cnpj: string | null;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
  pastor: SignatureBranding;
  secretary: SignatureBranding;
  treasurer: SignatureBranding;
};

type BrandingInput = {
  logoUrl?: string | null;
  pastorName?: string | null;
  pastorSignatureUrl?: string | null;
  secretaryName?: string | null;
  secretarySignatureUrl?: string | null;
  treasurerName?: string | null;
  treasurerSignatureUrl?: string | null;
};

const MAX_IMAGE_LENGTH = 2_000_000;

function normalizeName(value: string | null | undefined): string {
  return (value ?? "").trim().slice(0, 120);
}

function normalizeImage(value: string | null | undefined, label: string): string | null {
  const image = (value ?? "").trim();
  if (!image) return null;
  if (!/^data:image\/(png|jpe?g);base64,/i.test(image)) {
    throw new Error(`${label}: envie uma imagem PNG ou JPG.`);
  }
  if (image.length > MAX_IMAGE_LENGTH) {
    throw new Error(`${label}: a imagem é muito grande. Use um arquivo menor.`);
  }
  return image;
}

async function writeSetting(
  tx: {
    systemSetting: {
      upsert: (args: {
        where: { churchId_key: { churchId: string; key: string } };
        update: { value: string };
        create: { churchId: string; key: string; value: string; category: string };
      }) => Promise<unknown>;
    };
  },
  churchId: string,
  key: string,
  value: string
): Promise<void> {
  await tx.systemSetting.upsert({
    where: { churchId_key: { churchId, key } },
    update: { value },
    create: { churchId, key, value, category: "branding" },
  });
}

export async function getChurchBranding(churchId: string): Promise<ChurchBranding> {
  const [church, settings] = await Promise.all([
    prisma.church.findUnique({
      where: { id: churchId },
      select: {
        id: true,
        name: true,
        legalName: true,
        cnpj: true,
        phone: true,
        email: true,
        logoUrl: true,
      },
    }),
    prisma.systemSetting.findMany({
      where: {
        churchId,
        key: { in: Object.values(BRANDING_KEYS) },
      },
      select: { key: true, value: true },
    }),
  ]);

  const values = new Map(
    settings
      .filter((row) => typeof row.value === "string")
      .map((row) => [row.key, row.value as string])
  );

  return {
    churchId,
    name: church?.name ?? "Igreja",
    legalName: church?.legalName ?? null,
    cnpj: church?.cnpj ?? null,
    phone: church?.phone ?? null,
    email: church?.email ?? null,
    logoUrl: church?.logoUrl ?? null,
    pastor: {
      name: values.get(BRANDING_KEYS.pastorName) ?? "",
      imageUrl: values.get(BRANDING_KEYS.pastorSignature) || null,
    },
    secretary: {
      name: values.get(BRANDING_KEYS.secretaryName) ?? "",
      imageUrl: values.get(BRANDING_KEYS.secretarySignature) || null,
    },
    treasurer: {
      name: values.get(BRANDING_KEYS.treasurerName) ?? "",
      imageUrl: values.get(BRANDING_KEYS.treasurerSignature) || null,
    },
  };
}

export async function updateChurchBranding(
  churchId: string,
  userId: string,
  input: BrandingInput
): Promise<void> {
  const logoUrl = normalizeImage(input.logoUrl, "Logo da igreja");
  const pastorSignature = normalizeImage(
    input.pastorSignatureUrl,
    "Assinatura do pastor"
  );
  const secretarySignature = normalizeImage(
    input.secretarySignatureUrl,
    "Assinatura do secretário(a)"
  );
  const treasurerSignature = normalizeImage(
    input.treasurerSignatureUrl,
    "Assinatura do tesoureiro(a)"
  );

  await prisma.$transaction(async (tx) => {
    await tx.church.update({
      where: { id: churchId },
      data: { logoUrl },
    });
    await writeSetting(tx, churchId, BRANDING_KEYS.pastorName, normalizeName(input.pastorName));
    await writeSetting(
      tx,
      churchId,
      BRANDING_KEYS.pastorSignature,
      pastorSignature ?? ""
    );
    await writeSetting(
      tx,
      churchId,
      BRANDING_KEYS.secretaryName,
      normalizeName(input.secretaryName)
    );
    await writeSetting(
      tx,
      churchId,
      BRANDING_KEYS.secretarySignature,
      secretarySignature ?? ""
    );
    await writeSetting(
      tx,
      churchId,
      BRANDING_KEYS.treasurerName,
      normalizeName(input.treasurerName)
    );
    await writeSetting(
      tx,
      churchId,
      BRANDING_KEYS.treasurerSignature,
      treasurerSignature ?? ""
    );
  });

  await auditLog({
    userId,
    churchId,
    action: "UPDATE",
    module: "configuracoes",
    entity: "Identidade visual",
    description: "Atualizou logo e assinaturas institucionais",
  });
}
