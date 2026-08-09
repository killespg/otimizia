# Remoção dos balões de legenda da landing

## Objetivo

Remover por completo os balões decorativos de legenda da landing, incluindo o texto contido neles. Os títulos passam a abrir diretamente cada composição, sem kicker, eyebrow ou legenda solta ocupando o lugar do balão.

## Escopo visual

- Remover `CRM com WhatsApp e IA para quem vende` do hero.
- Remover `Hoje` do capítulo do painel.
- Remover `Seu próximo negócio` da chamada final.
- Remover o estilo `.landing-cinematic-kicker` e o override específico da chamada final.
- Recalibrar as margens dos títulos do hero e da chamada final para não deixar espaços vazios onde os balões existiam.

Os rótulos `Hoje`, `Tim` e `Negócios` dentro das três placas narrativas permanecem. Eles não usam a moldura de balão e identificam o conteúdo de cada placa.

## Comportamento e acessibilidade

- A ordem semântica dos títulos e descrições permanece inalterada.
- Nenhuma informação necessária para executar uma ação depende dos balões removidos.
- A página continua legível sem JavaScript e sem overflow horizontal.

## Contratos de aceitação

- A landing renderizada não contém elementos `.landing-cinematic-kicker`.
- Os três textos removidos não aparecem como legendas soltas.
- Hero, capítulo do painel e chamada final não preservam margem superior destinada aos balões.
- A regressão Playwright da landing, typecheck, lint e testes unitários permanecem verdes.
