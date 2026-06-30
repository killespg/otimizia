export function formatBRL(cents: number): string {
  const safeCents = Number.isFinite(cents) ? cents : 0;
  return (safeCents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatDate(iso: string | null): string {
  const date = validDate(iso);
  if (!date) return "-";
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(iso: string | null): string {
  const date = validDate(iso);
  if (!date) return "-";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function validDate(iso: string | null): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}
