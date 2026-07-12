// Fuso horário fixo (BRT = UTC-3): o Brasil aboliu o horário de verão em
// 2019, então um offset fixo é seguro e evita puxar uma lib de timezone só
// pra isso. Serve para os crons decidirem o que é "hoje" no fuso do produto
// (a maioria dos usuários), mesmo rodando em servidores UTC (Vercel).
const BR_OFFSET_MS = 3 * 60 * 60 * 1000;

export function getBrDayBoundsUtc(reference = new Date()): { startUtc: Date; endUtc: Date; dateKey: string } {
  const localWallClock = new Date(reference.getTime() - BR_OFFSET_MS);
  const dateKey = localWallClock.toISOString().slice(0, 10);

  const startLocal = new Date(localWallClock);
  startLocal.setUTCHours(0, 0, 0, 0);
  const endLocal = new Date(localWallClock);
  endLocal.setUTCHours(23, 59, 59, 999);

  return {
    startUtc: new Date(startLocal.getTime() + BR_OFFSET_MS),
    endUtc: new Date(endLocal.getTime() + BR_OFFSET_MS),
    dateKey,
  };
}
