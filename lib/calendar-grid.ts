// Construção de grid mensal (dom-sáb) compartilhada entre as páginas de
// calendário — evita reimplementar o mesmo cálculo de offset/dias em cada
// lugar que precisa de um mês em grade.

export function buildMonthCells(year: number, month: number): (number | null)[] {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function monthParam(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function parseMonthParam(value: string | undefined, fallback: Date): { year: number; month: number } {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split("-").map(Number);
    if (month >= 1 && month <= 12) return { year, month: month - 1 };
  }
  return { year: fallback.getFullYear(), month: fallback.getMonth() };
}
