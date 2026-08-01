// Agendamento incremental compartilhado pelo sync de legal_cases e de
// legal_watched_processes — mesma política de backoff pros dois, num só
// lugar (antes vivia duplicado nos dois arquivos e podia divergir com o
// tempo).
export const SUCCESS_SYNC_INTERVAL_HOURS = 20;
export const MAX_BACKOFF_HOURS = 24;

export function backoffHours(failedCount: number) {
  return Math.min(2 ** failedCount, MAX_BACKOFF_HOURS);
}

export function hoursFromNow(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}
