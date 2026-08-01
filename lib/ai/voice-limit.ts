export const VOICE_MONTHLY_LIMIT_SECONDS = 20 * 60;

export function currentYearMonth(): string {
  return new Date().toISOString().slice(0, 7);
}
