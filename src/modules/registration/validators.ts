import { isValidCpf, formatCpf } from "@/modules/cpf";

export type Option = { value: string; label: string };

type FieldValidator = (value: string) => string | null;
type FieldDisplay = (value: unknown) => string | null;

const VALIDATORS: Record<string, FieldValidator> = {
  "membros.cpf": (v) => (v && !isValidCpf(v) ? "CPF inválido." : null),
};

const DISPLAYS: Record<string, FieldDisplay> = {
  "membros.cpf": (v) => (v ? formatCpf(String(v)) : null),
  "visitantes.convertedToMemberId": (v) =>
    v ? "Convertido" : "Pendente",
};

export function validateField(resourceKey: string, fieldKey: string, value: string): string | null {
  const fn = VALIDATORS[`${resourceKey}.${fieldKey}`];
  return fn ? fn(value) : null;
}

export function displayField(resourceKey: string, fieldKey: string, value: unknown): string | null {
  const fn = DISPLAYS[`${resourceKey}.${fieldKey}`];
  return fn ? fn(value) : null;
}