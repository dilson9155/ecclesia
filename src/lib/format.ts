export function formatMoney(value: unknown, withSymbol = false): string {
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  if (withSymbol) {
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}