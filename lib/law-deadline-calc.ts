// Calculadora de prazo processual (CPC): conta só dias úteis (Art. 219),
// pulando fins de semana, feriados nacionais e — quando aplicável — o
// recesso forense de 20/dez a 20/jan (Art. 220). É puramente uma sugestão:
// quem chama isso decide se cria o prazo de verdade, igual ao que já é
// feito na triagem de movimentações do DataJud (nunca afirmar uma data de
// prazo sem confirmação humana).

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Algoritmo de Meeus/Jones/Butcher (calendário gregoriano).
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

export function goodFriday(year: number): Date {
  const easter = easterSunday(year);
  return new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() - 2);
}

// Feriados nacionais forenses fixos + Sexta-feira Santa (móvel). Feriados
// estaduais/municipais e recessos locais de tribunal não entram aqui —
// variam demais para cravar sem dado por tribunal.
export function nationalHolidays(year: number): Date[] {
  const fixed: [number, number][] = [
    [0, 1], // Confraternização Universal
    [3, 21], // Tiradentes
    [4, 1], // Dia do Trabalho
    [8, 7], // Independência do Brasil
    [9, 12], // Nossa Senhora Aparecida
    [10, 2], // Finados
    [10, 15], // Proclamação da República
    [11, 25], // Natal
  ];
  const dates = fixed.map(([month, day]) => new Date(year, month, day));
  if (year >= 2024) dates.push(new Date(year, 10, 20)); // Dia Nacional de Zumbi e da Consciência Negra (Lei 14.759/2023)
  dates.push(goodFriday(year));
  return dates;
}

export function isNationalHoliday(date: Date): boolean {
  return nationalHolidays(date.getFullYear()).some((holiday) => sameDay(holiday, date));
}

// Art. 220 CPC: suspende o prazo processual entre 20/dez e 20/jan, inclusive.
export function isForensicRecess(date: Date): boolean {
  const month = date.getMonth();
  const day = date.getDate();
  if (month === 11 && day >= 20) return true;
  if (month === 0 && day <= 20) return true;
  return false;
}

export function isBusinessDay(date: Date, options: { countRecess?: boolean } = {}): boolean {
  const countRecess = options.countRecess !== false;
  const weekday = date.getDay();
  if (weekday === 0 || weekday === 6) return false;
  if (isNationalHoliday(date)) return false;
  if (countRecess && isForensicRecess(date)) return false;
  return true;
}

export type DeadlineCalcResult = {
  dueDate: Date;
  skippedWeekends: number;
  skippedHolidays: number;
  skippedRecessDays: number;
};

// Conta `days` dias úteis a partir de `start` (exclusive), pulando fins de
// semana, feriados nacionais e, se `countRecess` (padrão true), o recesso
// forense.
export function addBusinessDays(start: Date, days: number, options: { countRecess?: boolean } = {}): DeadlineCalcResult {
  const countRecess = options.countRecess !== false;
  let current = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  let counted = 0;
  let skippedWeekends = 0;
  let skippedHolidays = 0;
  let skippedRecessDays = 0;

  while (counted < days) {
    current = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1);
    const weekday = current.getDay();
    if (weekday === 0 || weekday === 6) {
      skippedWeekends++;
      continue;
    }
    if (isNationalHoliday(current)) {
      skippedHolidays++;
      continue;
    }
    if (countRecess && isForensicRecess(current)) {
      skippedRecessDays++;
      continue;
    }
    counted++;
  }

  return { dueDate: current, skippedWeekends, skippedHolidays, skippedRecessDays };
}
