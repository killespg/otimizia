# Landing com Liquid Glass iluminado pelo fundo

**Data:** 2026-08-09
**Status:** aprovado para planejamento
**Escopo:** somente a landing pública do OtimizIA

## Objetivo

Corrigir a hierarquia óptica da landing. Hoje alguns cards, painéis e molduras
carregam gradientes azuis ou roxos e sombras coloridas próprias. O resultado é
uma coleção de objetos que parecem emitir luz, em vez de volumes de vidro que
revelam a iluminação do ambiente.

A nova regra é única e verificável:

> A iluminação azul e roxa nasce somente no canvas. Tudo que está à frente é
> material passivo: transmite, desfoca e reflete essa iluminação com baixa
> opacidade.

## Decisão visual

A landing terá dois níveis materiais.

### 1. Canvas emissivo

`landing-cinematic-page`, seu `::before` e as duas luzes ambientais são as
únicas fontes decorativas de luz. Eles continuam responsáveis pelos grandes
campos azuis e pelo apoio roxo distribuídos ao longo da página.

Depois da retirada dos glows locais, a implementação pode ajustar somente
posição, dimensão e opacidade das fontes amplas azuis e roxas que já existem no
canvas. Não entra uma fonte nova vinculada a componente. A luz permanece ampla,
contínua e atrás de todo o conteúdo, com azul dominante e roxo de apoio.

### 2. Primeiro plano passivo

Placas, painéis, navegação, moldura do print e barras flutuantes compartilham o
mesmo material base:

- preenchimento marinho com opacidade baixa;
- `backdrop-filter` para revelar e desfocar o canvas;
- borda branca discreta, um pouco mais clara no topo;
- reflexão neutra branca e grão quase imperceptível;
- apenas um fio interno de luz, sem sombra externa colorida;
- nenhum gradiente azul ou roxo local;
- nenhum halo ou `box-shadow` azul/roxo.

Valores de referência para a implementação:

- preenchimento base: `rgba(6, 12, 27, 0.22)`;
- preenchimento quieto: `rgba(6, 12, 27, 0.28)`;
- borda: branco a 12%, com topo a 19%;
- reflexão: branco a no máximo 8%, desaparecendo antes de 40% do volume;
- blur: 18px e saturação máxima de 125%;
- inset especular: branco a no máximo 5%;
- sombra externa decorativa: nenhuma.

O ajuste final respeita limites objetivos: preenchimento passivo com alfa de no
máximo 30%, reflexão branca com alfa de no máximo 8% e borda com alfa de no
máximo 20%. Qualquer diferença necessária por contraste deve ser coberta pelos
testes.

## Superfícies incluídas

### Placas do hero

As três `.landing-cinematic-plate` preservam posição, perspectiva e conteúdo,
mas perdem:

- o gradiente branco interno forte;
- a tintura roxa exclusiva da placa do Tim;
- a linha azul luminosa na borda inferior;
- qualquer sombra que simule emissão.

Os recipientes dos ícones passam a usar preenchimento branco neutro de baixa
opacidade. O glifo pode continuar azul para comunicar identidade, sem halo.

### Painéis de conteúdo

`.landing-cinematic-stage` e `.landing-cinematic-stage--quiet` tornam-se as
variantes compartilhadas do material passivo. Isso abrange:

- demonstração do Tim;
- profissões e recursos;
- preços;
- FAQ;
- sobre o OtimizIA;
- CTA final.

O `::after` desses painéis mantém somente grão e reflexão branca. O radial azul
local é removido. O CTA final deixa de ter seu próprio holofote.

Faixas internas como `.od-band`, linhas alternadas e balões de conversa usam
somente branco ou marinho em baixa opacidade. Nenhuma dessas peças cria uma
segunda fonte de luz.

### Prisma Glass

`.landing-prisma-panel-frame` deve parecer uma lâmina sobre o fundo:

- preenchimento marinho baixo;
- borda neutra e reflexão branca;
- blur moderado;
- sem gradiente azul próprio;
- sem sombra azul de 80px;
- sem linha superior azul/roxa iluminada.

O print original dentro da moldura não é alterado. O foco acessível do viewport
continua azul, porque é estado de interação e não iluminação decorativa.

### Navegação e CTA móvel

O header e a barra fixa mobile usam o mesmo material passivo. Não recebem
glow. A leitura e o contraste devem permanecer estáveis enquanto o fundo passa
por trás.

### Controles internos

O controle segmentado usa fundo neutro translúcido. Apenas a aba selecionada
continua azul sólida. Botões primários continuam azuis sólidos. Hover, foco e
seleção podem usar o azul da marca, mas sem sombra luminosa.

Mensagens, ícones e chips passivos não recebem preenchimento azul sólido;
podem usar texto ou glifo azul e uma tintura azul de baixa opacidade, sem halo.

## Exceções permitidas

O azul sólido fica restrito a:

- botões de ação primária;
- aba selecionada;
- indicadores reais de foco ou seleção.

Logo, texto de destaque e ícones podem usar a cor da marca, mas não transformam
seu recipiente em fonte de luz. Estados semânticos de erro, alerta e sucesso
continuam permitidos quando comunicam informação real.

## Fallbacks e preferências

Quando `backdrop-filter` não existir ou `prefers-reduced-transparency` estiver
ativo:

- as superfícies usam o marinho opaco já aprovado;
- a hierarquia de bordas permanece;
- reflexos, blur e halos são removidos;
- stage externo do Prisma continua transparente para não criar painel duplo;
- frame e dica de arraste permanecem legíveis e opacos.

`prefers-reduced-motion` não muda a composição material; apenas reduz movimento.
`prefers-contrast` reforça bordas e texto sem acrescentar emissão luminosa.

## Acessibilidade

- Texto normal mantém contraste mínimo de 4,5:1.
- Texto grande mantém contraste mínimo de 3:1.
- Foco visível continua distinguível em navegação, tabs e viewport do print.
- A transparência não pode depender de uma região específica do fundo para
  tornar texto legível.
- A landing permanece utilizável sem JavaScript e sem overflow horizontal em
  390px.

## Contratos de teste

Os testes devem proteger o princípio, não apenas uma fotografia do CSS:

1. superfícies passivas não têm sombra externa azul ou roxa;
2. fundos e pseudo-elementos de primeiro plano não contêm gradiente radial
   azul/roxo local;
3. o material base mantém baixa opacidade e `backdrop-filter` no modo normal;
4. botões primários e aba selecionada conservam preenchimento azul sólido;
5. fallback de transparência mantém stage Prisma transparente e frame opaco;
6. contraste, foco, mobile 390px, no-JS e geometria do Prisma não regridem;
7. inspeção visual confirma que a luz atravessa os volumes e nasce no canvas.

## Fora de escopo

- alterar o print real do painel;
- modificar os componentes centrais do produto em `components/design-system`;
- redesenhar textos, estrutura, navegação ou animações;
- trocar azul, roxo, tipografia ou direção geral da marca;
- aplicar o experimento de marketing às telas autenticadas.

## Critério de aceite

Ao percorrer a landing, deve ser possível identificar uma única cena luminosa
contínua atrás do conteúdo. Nenhum card, balão, painel ou moldura pode parecer
uma lâmpada independente. As ações continuam claramente azuis; todo o resto
parece vidro passivo refletindo o mesmo ambiente.
