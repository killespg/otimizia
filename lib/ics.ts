export type IcsEvent = {
  uid: string;
  title: string;
  start: Date;
  description?: string;
};

function toIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function foldLine(line: string): string {
  return line.replace(/[\r\n]+/g, " ");
}

// Feed .ics somente-leitura (VCALENDAR/VEVENT), pensado pra assinatura no
// Google Agenda/Apple Calendário — sem VALARM porque quem assina um feed
// externo normalmente já usa os lembretes nativos do próprio app de
// calendário, e a maioria dos clientes ignora alarmes de feeds assinados.
export function buildIcsFeed(calendarName: string, events: IcsEvent[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//OtimizIA//Lembretes//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${foldLine(calendarName)}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
  ];

  for (const event of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.uid}`,
      `DTSTAMP:${toIcsDate(new Date())}`,
      `DTSTART:${toIcsDate(event.start)}`,
      `SUMMARY:${foldLine(event.title)}`,
      ...(event.description ? [`DESCRIPTION:${foldLine(event.description)}`] : []),
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
