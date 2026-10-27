/**
 * Mensagens de acompanhamento da EBD enviadas por WhatsApp.
 * Módulo compartilhado entre servidor e cliente (sem "server-only").
 */

export const EBD_ABSENCE_TEMPLATE_KEY = "ebd.absenceMessageTemplate";

export const DEFAULT_ABSENCE_TEMPLATE =
  "Olá, {primeiro_nome}! Sentimos sua falta na EBD do dia {data}. Esperamos você na próxima aula. Deus abençoe!";

export const ABSENCE_TEMPLATE_VARIABLES = [
  { key: "{primeiro_nome}", label: "Primeiro nome" },
  { key: "{aluno}", label: "Nome completo" },
  { key: "{data}", label: "Data da falta" },
  { key: "{classe}", label: "Classe" },
  { key: "{faltas}", label: "Nº de faltas" },
  { key: "{igreja}", label: "Nome da igreja" },
] as const;

export type AbsenceMessageVars = {
  name: string;
  date: string | null;
  className?: string | null;
  absences?: number;
  churchName?: string | null;
};

export function formatMessageDate(value: string | null | undefined): string {
  if (!value) return "";
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return "";
  return `${day}/${month}/${year}`;
}

export function renderAbsenceTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = vars[key];
    return value === undefined || value === "" ? match : value;
  });
}

export function buildAbsenceMessage(
  template: string,
  data: AbsenceMessageVars
): string {
  const name = data.name.trim();
  const firstName = name.split(" ")[0] ?? name;

  return renderAbsenceTemplate(template, {
    primeiro_nome: firstName,
    aluno: name,
    data: formatMessageDate(data.date),
    classe: data.className ?? "",
    faltas: data.absences !== undefined ? String(data.absences) : "",
    igreja: data.churchName ?? "",
  }).trim();
}

/** Normaliza para o padrão internacional: 55 + DDD + número. */
export function normalizeWhatsappPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 11) return `55${digits}`;
  return digits;
}

export function whatsappLink(phone: string, message: string): string {
  return `https://wa.me/${normalizeWhatsappPhone(phone)}?text=${encodeURIComponent(message)}`;
}
