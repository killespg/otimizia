# Apple Liquid Glass no painel do OtimizIA

Status: aprovado pelo usuario em 2026-08-04.

## Objetivo

Levar a linguagem Apple Liquid Glass a todo o shell persistente de `/painel`,
comecando pelo dashboard imobiliario usado como referencia visual. O trabalho e
uma mudanca de apresentacao: rotas, dados, acoes, formularios, permissoes,
integracoes e regras de negocio devem permanecer iguais.

Liquid Glass nao significa aplicar blur em todos os cards. Seguindo a orientacao
da Apple, o vidro forma uma camada funcional unica para navegacao e controles que
flutua sobre o conteudo. Metricas, tabelas, formularios e paineis de dados ficam
na camada de conteudo, usando materiais estaveis e legiveis.

Referencias oficiais:

- Apple Human Interface Guidelines, Materials:
  https://developer.apple.com/design/human-interface-guidelines/materials
- WWDC25, Meet Liquid Glass:
  https://developer.apple.com/videos/play/wwdc2025/219/

## Abordagens consideradas

1. **Liquid Glass funcional, fiel a Apple — escolhida.** Vidro apenas no shell,
   navegacao, controles agrupados, menus, sheets e popovers. Conteudo usa
   material padrao. Entrega hierarquia clara, melhor desempenho e menos ruido.
2. **Vidro em todas as superficies — rejeitada.** E o estado visual atual:
   `.panel` e cards tambem recebem blur, brilho e transparencia. Produz vidro
   aninhado, bordas demais e baixa hierarquia; contraria o HIG.
3. **Maquiagem cosmetica — rejeitada.** Manter a estrutura atual e apenas trocar
   opacidade, blur e raios. E mais barata, mas continua parecendo glassmorphism
   generico e nao resolve a separacao entre controles e conteudo.

## Escopo

### Incluido

- Shell compartilhado de `/painel` para vendedor, juridico e imobiliario.
- Rail, painel lateral de detalhe, topbar, busca, acoes globais e avatar.
- Navegacao mobile, dock, menus, drawers, modais, sheets e popovers.
- Controles primarios e secundarios que flutuam sobre conteudo.
- Tokens de material, contraste, raio, sombra, movimento e fallbacks.
- Migracao do dashboard imobiliario como primeira tela de referencia.
- Ajustes mecanicos nas demais telas para consumir os tokens corretos.

### Fora do escopo

- Alterar a landing de marketing para copiar o shell do produto.
- Mudar fluxos, rotas, permissoes, dados, metricas ou textos de negocio.
- Reescrever componentes funcionais sem necessidade visual.
- Simular APIs nativas exclusivas de SwiftUI, UIKit ou AppKit.
- Aplicar refração SVG a dezenas de cards de conteudo.

## Arquitetura visual

O produto passa a ter tres camadas sem sobreposicao semantica.

### 1. Canvas e conteudo

- O canvas continua escuro, com luz ambiente muito discreta e localizada.
- `.panel`, `.card`, `.card-quiet`, faixas de metricas, tabelas e formularios
  deixam de usar `backdrop-filter`, grao, sheen e refração.
- Superficies de conteudo usam cor solida ou material padrao quase opaco, borda
  de baixo contraste e raio moderado. Divisores internos organizam dados sem
  criar um card para cada valor.
- Texto e dados financeiros mantem contraste WCAG AA no pior fundo possivel.

### 2. Liquid Glass funcional

- `.od-chrome` representa vidro regular para navegacao e controles persistentes.
- `.glass` representa vidro regular transitorio para menus, popovers e sheets.
- Nao se mistura variante regular e clear na mesma tela. Clear nao sera usado na
  primeira entrega porque o dashboard nao e conteudo de midia rica.
- A cor violeta tinge somente acao primaria, selecao e foco. Vidro neutro domina
  a navegacao; estados de sucesso, aviso e perigo continuam semanticos.
- O material combina blur adaptativo, saturacao moderada, highlight especular,
  borda interna e sombra de separacao. Refração SVG fica limitada a poucos
  elementos funcionais simultaneos.

### 3. Feedback e movimento

- Hover e press alteram luz, escala e tint de forma curta, sem mover layout.
- Controles agrupados podem materializar, unir ou separar com transicoes de
  160–240 ms e easing organico.
- Menus surgem a partir do controle de origem; drawers e sheets preservam foco,
  retorno de foco e fechamento por Escape.
- `prefers-reduced-motion`, `prefers-contrast` e
  `prefers-reduced-transparency` recebem fallbacks sem animacao, mais opacos e
  com bordas de maior contraste.

## Shell desktop

- Rail e painel lateral deixam de parecer duas placas de vidro encostadas. Eles
  formam um unico grupo flutuante, com divisao interna e raios concentricos.
- O grupo recebe inset do viewport para revelar conteudo por baixo e reforcar a
  elevacao, sem sacrificar a area util.
- O redimensionamento do painel lateral continua funcionando e persiste no
  `localStorage`; estado recolhido, ativo e submenu preservam a logica atual.
- A topbar nao vira uma faixa inteira de vidro. Busca, alertas e acoes formam
  grupos compactos de controles Liquid Glass sobre o canvas.
- O conteudo principal ganha padding que respeita o shell flutuante e nunca fica
  escondido sob navegacao, trial banner ou safe areas.

## Shell mobile

- A navegacao inferior usa um unico dock Liquid Glass, elevado da safe area.
- Acoes principais e Tim ficam agrupados; o menu expandido usa um sheet regular,
  nunca vidro sobre vidro.
- Alvos de toque continuam com no minimo 44 x 44 px.
- O dock pode reduzir presenca durante rolagem para priorizar conteudo, mas deve
  reaparecer imediatamente ao inverter a direcao ou receber foco.
- Nenhuma acao existente pode desaparecer por causa da compactacao.

## Dashboard imobiliario de referencia

- Cabecalho, saudacao e contexto permanecem diretamente no canvas.
- `Agenda de visitas`, `Novo imovel`, `Personalizar painel` e busca viram
  controles Liquid Glass agrupados por proximidade e funcao.
- A faixa de quatro metricas vira uma superficie de conteudo unica, com divisores
  internos e sem brilho especular em cada celula.
- Indicadores imobiliarios, comissoes e metas usam material padrao consistente;
  valores e estados ficam mais importantes que a superficie.
- O fundo animado pode permanecer configuravel, mas com luminosidade e saturacao
  limitadas para nao reduzir contraste nem competir com os dados.

## Componentes e tokens

- Manter os contratos existentes de `TwoLevelNav`, topbars e `MobileAppNav`.
- Centralizar semantica em tokens de `chrome`, `control`, `popover`, `content` e
  `content-muted`; classes antigas passam a mapear para um desses papeis.
- Evitar um componente React novo quando uma classe/token resolve; criar um
  wrapper somente se ele garantir agrupamento, foco ou animacao que CSS sozinho
  nao consegue expressar.
- Remover a regra global que transforma todo `bg-od-surface` em vidro. O nome da
  superficie deve indicar seu papel, nao disparar um efeito caro implicitamente.
- Preservar fallback solido para navegadores sem `backdrop-filter` e para modos
  de acessibilidade.

## Desempenho e seguranca visual

- Limitar refração SVG a chrome persistente e ao overlay transitorio ativo.
- Nunca combinar `filter: url(...)` e `backdrop-filter` em listas de cards.
- Evitar `background-attachment: fixed` no mobile quando causar repintura cara.
- Medir rolagem, abertura de menu e resize com o dashboard preenchido.
- Se a refração causar tela branca, queda perceptivel de frame rate ou artefato,
  usar blur, tint e highlight sem deslocamento de pixels; fidelidade funcional e
  legibilidade vencem o efeito.

## Preservacao de produto

- Todas as rotas e links atuais continuam disponiveis.
- Formularios mantem actions, nomes de campos, estados pendentes e erros.
- RLS, papeis, filtros por workspace e visibilidade financeira nao mudam.
- A migracao e feita no shell compartilhado e em tokens; nao se duplicam telas
  por vertical e nao se reintroduz o frontend antigo.

## Validacao

### Automatizada

- `npm run typecheck`, lint e suite Vitest.
- Testes de paridade do shell atualizados para contratos semanticos, sem afirmar
  strings de classes obsoletas.
- Playwright para navegacao desktop, resize/recolhimento da sidebar, busca,
  menus, dock mobile, safe areas e alvos de toque.
- Verificar ausencia de overflow em 390 px, 1024 px, 1440 px e 1920 px.

### Visual e interativa

- Dashboard imobiliario em 1920 px comparado com a captura de origem.
- Checar contraste sobre todas as zonas do fundo ambiente.
- Confirmar que nao existe vidro aninhado, borda dupla ou topbar em faixa.
- Confirmar fallback com transparencia reduzida, contraste aumentado e movimento
  reduzido.
- Testar uma rota representativa de cada vertical dentro do shell autenticado.

## Criterios de aceite

- A primeira leitura visual e de um app Apple contemporaneo, nao de um template
  de glassmorphism.
- Vidro aparece principalmente onde a pessoa toca ou navega.
- Dados continuam legiveis e mais importantes que os recipientes.
- Sidebar, topbar e mobile formam uma camada funcional coerente e responsiva.
- Nenhuma rota, acao, permissao ou dado se perde.
- Typecheck, lint e testes relevantes passam; qualquer verificacao autenticada
  nao executada e reportada explicitamente.
