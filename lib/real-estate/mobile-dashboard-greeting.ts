export type MobileGreetingPeriod =
  | "overnight"
  | "early_morning"
  | "late_morning"
  | "early_afternoon"
  | "late_afternoon"
  | "early_evening"
  | "late_evening";

export type MobileDashboardGreeting = {
  period: MobileGreetingPeriod;
  salutation: "Bom dia" | "Boa tarde" | "Boa noite";
  message: string;
};

type PhraseBank = {
  salutation: MobileDashboardGreeting["salutation"];
  calm: readonly string[];
  attention: readonly string[];
};

const saoPauloDateTime = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
});

const phraseBanks: Record<MobileGreetingPeriod, PhraseBank> = {
  overnight: {
    salutation: "Boa noite",
    calm: [
      "Pode ficar tranquilo: a operação segue em ordem enquanto a cidade descansa.",
      "Tudo sob controle por aqui para atravessarmos a madrugada sem preocupações.",
      "A operação está em ordem e pronta para quando o dia começar.",
      "Está tudo certo por aqui; nada urgente precisa interromper sua noite.",
    ],
    attention: [
      "Há {priorities} para retomarmos assim que o dia começar.",
      "A operação tem {priorities}; já sabemos por onde começar.",
      "O próximo passo já considera {priorities}.",
      "Antes do amanhecer, há {priorities} que merecem cuidado.",
    ],
  },
  early_morning: {
    salutation: "Bom dia",
    calm: [
      "A operação amanheceu em ordem para começarmos o dia com leveza.",
      "Tudo alinhado por aqui para você abrir o dia focando no que importa.",
      "A casa está em ordem e a manhã começa com espaço para avançar.",
      "O dia começa com a operação redonda e as prioridades no lugar.",
    ],
    attention: [
      "Começamos o dia com {priorities} para colocar em ordem.",
      "A manhã abre com {priorities} que podemos resolver sem perder o ritmo.",
      "Há {priorities} esperando por nós; vamos começar pelo que mais importa.",
      "Temos {priorities} para deixar o restante do dia mais leve.",
    ],
  },
  late_morning: {
    salutation: "Bom dia",
    calm: [
      "A manhã segue redonda e a operação continua em dia.",
      "Tudo no lugar por aqui para aproveitarmos bem o restante da manhã.",
      "A operação está alinhada e a manhã pode seguir sem ruído.",
      "Chegamos ao fim da manhã com tudo sob controle.",
    ],
    attention: [
      "Ainda temos {priorities} para organizar antes de a tarde começar.",
      "A manhã avança com {priorities} que merecem nossa atenção.",
      "Ainda há {priorities}; dá tempo de agir antes de a tarde começar.",
      "Temos {priorities} para fechar bem a manhã.",
    ],
  },
  early_afternoon: {
    salutation: "Boa tarde",
    calm: [
      "A tarde começa com tudo em ordem para mantermos o ritmo.",
      "Está tudo alinhado por aqui para avançarmos no que importa.",
      "A operação segue redonda e a tarde está aberta para novas oportunidades.",
      "Começamos a tarde com a casa em ordem e espaço para crescer.",
    ],
    attention: [
      "A tarde começa com {priorities} no radar.",
      "Há {priorities} para colocarmos em dia e seguirmos com mais leveza.",
      "Temos {priorities} pedindo atenção neste começo de tarde.",
      "Há {priorities} para organizar antes de ganharmos ritmo.",
    ],
  },
  late_afternoon: {
    salutation: "Boa tarde",
    calm: [
      "Estamos fechando a tarde com a operação em ordem.",
      "Tudo sob controle por aqui para terminarmos o dia com tranquilidade.",
      "A tarde segue bem encaminhada e sem pendências urgentes.",
      "O fim da tarde chega com tudo alinhado na operação.",
    ],
    attention: [
      "Temos {priorities} para fecharmos a tarde em ordem.",
      "O dia ainda tem espaço para resolvermos {priorities}.",
      "Há {priorities} que merecem atenção antes de desacelerarmos.",
      "Temos {priorities} para encerrar a tarde com mais tranquilidade.",
    ],
  },
  early_evening: {
    salutation: "Boa noite",
    calm: [
      "O dia desacelera e a operação continua em ordem por aqui.",
      "Tudo alinhado para fecharmos o dia com tranquilidade.",
      "A noite começa com a casa em ordem.",
      "Chegamos à noite com a operação sob controle e sem urgências.",
    ],
    attention: [
      "O dia deixa {priorities}; podemos agir agora.",
      "A noite começa com {priorities} que ainda merecem atenção.",
      "Há {priorities} para organizarmos antes de encerrar o ritmo.",
      "Temos {priorities} para deixar a operação mais tranquila esta noite.",
    ],
  },
  late_evening: {
    salutation: "Boa noite",
    calm: [
      "Podemos dormir tranquilos porque está tudo nos conformes por aqui.",
      "Fechamos o dia com a operação em ordem e sem surpresas.",
      "Tudo certo por aqui para você encerrar o dia com tranquilidade.",
      "A casa está em ordem; agora podemos desacelerar.",
    ],
    attention: [
      "Antes de encerrar o dia, há {priorities} que merecem atenção.",
      "O dia termina com {priorities}; deixamos tudo claro para o próximo passo.",
      "Ainda temos {priorities} para organizar.",
      "Há {priorities} esperando por nós antes de considerarmos o dia encerrado.",
    ],
  },
};

function readSaoPauloClock(now: Date) {
  const parts = Object.fromEntries(
    saoPauloDateTime
      .formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
  };
}

function periodForHour(hour: number): MobileGreetingPeriod {
  if (hour < 5) return "overnight";
  if (hour < 9) return "early_morning";
  if (hour < 12) return "late_morning";
  if (hour < 15) return "early_afternoon";
  if (hour < 18) return "late_afternoon";
  if (hour < 21) return "early_evening";
  return "late_evening";
}

export function getMobileDashboardGreeting({
  now,
  attentionCount,
}: {
  now: Date;
  attentionCount: number;
}): MobileDashboardGreeting {
  const { year, month, day, hour } = readSaoPauloClock(now);
  const period = periodForHour(hour);
  const bank = phraseBanks[period];
  const phrases = attentionCount > 0 ? bank.attention : bank.calm;
  const dayNumber = Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
  const message = phrases[dayNumber % phrases.length].replace(
    "{priorities}",
    attentionCount === 1 ? "1 prioridade" : `${attentionCount} prioridades`,
  );

  return {
    period,
    salutation: bank.salutation,
    message,
  };
}
