export function formatMoney(value: unknown, withSymbol = false): string {
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  if (withSymbol) {
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(
  value: unknown,
  withTime = false
): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return "—";
  return withTime
    ? d.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : d.toLocaleDateString("pt-BR");
}