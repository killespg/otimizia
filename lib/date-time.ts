const LOCAL_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/;

// Inputs `datetime-local` não carregam fuso. Como as Server Actions podem
// rodar em UTC, estes valores são sempre interpretados como horário de São
// Paulo antes de persistir em uma coluna timestamptz.
export function parseSaoPauloDateTime(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;

  const normalized = LOCAL_DATE_TIME.test(raw) ? `${raw}-03:00` : raw;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
