export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function isValidCpf(value?: string | null): boolean {
  const cpf = onlyDigits(value ?? "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += Number(cpf[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  const dv1 = resto === 10 ? 0 : resto;
  if (dv1 !== Number(cpf[9])) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += Number(cpf[i]) * (11 - i);
  resto = (soma * 10) % 11;
  const dv2 = resto === 10 ? 0 : resto;
  return dv2 === Number(cpf[10]);
}

export function formatCpf(value?: string | null): string {
  const cpf = onlyDigits(value ?? "");
  if (cpf.length !== 11) return value ?? "";
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}