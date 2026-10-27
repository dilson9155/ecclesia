import "server-only";

import { prisma } from "@/lib/prisma";
import {
  DEFAULT_ABSENCE_TEMPLATE,
  DEFAULT_BIRTHDAY_TEMPLATE,
  EBD_ABSENCE_TEMPLATE_KEY,
  EBD_BIRTHDAY_TEMPLATE_KEY,
} from "@/modules/ebd/message";

const MAX_TEMPLATE_LENGTH = 600;

export type EbdMessageSettings = {
  /** Mensagem de ausência (relatório de frequência e chamadas). */
  absenceTemplate: string;
  /** Mensagem de parabéns (relatório de aniversariantes). */
  birthdayTemplate: string;
  churchName: string;
};

function readTemplate(value: unknown, fallback: string): string {
  const stored = typeof value === "string" ? value.trim() : "";
  return stored || fallback;
}

export async function getEbdMessageSettings(
  churchId: string
): Promise<EbdMessageSettings> {
  const [church, settings] = await Promise.all([
    prisma.church.findUnique({
      where: { id: churchId },
      select: { name: true, legalName: true },
    }),
    prisma.systemSetting.findMany({
      where: {
        churchId,
        key: { in: [EBD_ABSENCE_TEMPLATE_KEY, EBD_BIRTHDAY_TEMPLATE_KEY] },
      },
      select: { key: true, value: true },
    }),
  ]);

  const byKey = new Map(settings.map((setting) => [setting.key, setting.value]));

  return {
    absenceTemplate: readTemplate(
      byKey.get(EBD_ABSENCE_TEMPLATE_KEY),
      DEFAULT_ABSENCE_TEMPLATE
    ),
    birthdayTemplate: readTemplate(
      byKey.get(EBD_BIRTHDAY_TEMPLATE_KEY),
      DEFAULT_BIRTHDAY_TEMPLATE
    ),
    churchName: church?.name || church?.legalName || "Igreja",
  };
}

async function saveTemplate(
  churchId: string,
  key: string,
  template: string
): Promise<void> {
  const value = template.trim().slice(0, MAX_TEMPLATE_LENGTH);

  if (!value) {
    await prisma.systemSetting.deleteMany({ where: { churchId, key } });
    return;
  }

  await prisma.systemSetting.upsert({
    where: { churchId_key: { churchId, key } },
    update: { value },
    create: { churchId, key, value, category: "ebd" },
  });
}

export async function saveEbdAbsenceTemplate(
  churchId: string,
  template: string
): Promise<void> {
  await saveTemplate(churchId, EBD_ABSENCE_TEMPLATE_KEY, template);
}

export async function saveEbdBirthdayTemplate(
  churchId: string,
  template: string
): Promise<void> {
  await saveTemplate(churchId, EBD_BIRTHDAY_TEMPLATE_KEY, template);
}
