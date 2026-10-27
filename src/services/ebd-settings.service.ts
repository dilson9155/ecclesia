import "server-only";

import { prisma } from "@/lib/prisma";
import {
  DEFAULT_ABSENCE_TEMPLATE,
  EBD_ABSENCE_TEMPLATE_KEY,
} from "@/modules/ebd/message";

const MAX_TEMPLATE_LENGTH = 600;

export type EbdMessageSettings = {
  template: string;
  churchName: string;
};

export async function getEbdMessageSettings(
  churchId: string
): Promise<EbdMessageSettings> {
  const [church, setting] = await Promise.all([
    prisma.church.findUnique({
      where: { id: churchId },
      select: { name: true, legalName: true },
    }),
    prisma.systemSetting.findUnique({
      where: { churchId_key: { churchId, key: EBD_ABSENCE_TEMPLATE_KEY } },
      select: { value: true },
    }),
  ]);

  const stored =
    typeof setting?.value === "string" ? setting.value.trim() : "";

  return {
    template: stored || DEFAULT_ABSENCE_TEMPLATE,
    churchName: church?.name || church?.legalName || "Igreja",
  };
}

export async function saveEbdAbsenceTemplate(
  churchId: string,
  template: string
): Promise<void> {
  const value = template.trim().slice(0, MAX_TEMPLATE_LENGTH);

  if (!value) {
    await prisma.systemSetting.deleteMany({
      where: { churchId, key: EBD_ABSENCE_TEMPLATE_KEY },
    });
    return;
  }

  await prisma.systemSetting.upsert({
    where: { churchId_key: { churchId, key: EBD_ABSENCE_TEMPLATE_KEY } },
    update: { value },
    create: {
      churchId,
      key: EBD_ABSENCE_TEMPLATE_KEY,
      value,
      category: "ebd",
    },
  });
}
