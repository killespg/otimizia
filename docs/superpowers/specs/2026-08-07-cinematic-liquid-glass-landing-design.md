# Landing Liquid Glass cinematográfica — especificação de design

## Status

Direção aprovada em 2026-08-07: **híbrido cinematográfico**, com referência visual de 65% da linguagem “Corredor de vidro” e 35% da linguagem “Prisma editorial”. Essa proporção expressa prioridade — movimento e profundidade dominam, tipografia e placas precisas organizam — e não será tratada como métrica numérica de CSS. A landing pode ser reorganizada para sustentar essa narrativa, desde que preserve rotas, verdade comercial, acessibilidade e a separação entre marketing e produto autenticado.

## Objetivo

Transformar a landing pública do OtimizIA em uma experiência Liquid Glass imersiva e memorável que apresente rapidamente o produto real. A página deve contar uma história contínua — o que exige atenção, o que Tim executa e como o negócio avança — em vez de parecer uma sequência de seções independentes.

O redesign deve melhorar percepção de valor e clareza de conversão sem repetir os problemas da primeira versão imersiva: vidro leitoso, contraste insuficiente, excesso de gradientes, card spam e movimento decorativo sem função.

## Limites do trabalho

- A experiência visual fica restrita a `app/page.tsx` e `components/landing`.
- Nenhum componente experimental da landing será promovido para `components/design-system`.
- O material do painel autenticado, suas rotas, permissões, dados e integrações não muda.
- Títulos, descrições e ordem das seções podem ser reescritos para melhorar a narrativa.
- Preço, período de teste, capacidades, profissões atendidas e demais alegações comerciais só podem usar fatos já sustentados pelo produto.
- Login, signup, âncoras públicas, preferências de cookies e redirecionamento de usuário autenticado permanecem funcionais.

## Princípios

1. **Um ambiente, não várias vitrines.** O canvas e a iluminação atravessam a página inteira.
2. **Vidro conta a história.** Os volumes aparecem como capítulos e provas interativas, não como recipiente automático de todo conteúdo.
3. **Produto antes da enumeração.** O visitante vê o painel real na primeira rolagem, antes de receber uma lista extensa de recursos.
4. **Tipografia segura a clareza.** O corredor pode ser expressivo; títulos, corpo e CTAs continuam firmes e fáceis de ler.
5. **Sem vidro sobre vidro.** Cada zona tem um único material dominante; componentes internos usam divisões e preenchimentos leves.
6. **Movimento explica progressão.** As transições reforçam “Hoje → Tim → Negócios” e desaparecem quando movimento reduzido é solicitado.

## Narrativa e ordem da página

### 1. Navegação flutuante

- `LandingNav` permanece acima do conteúdo como um único volume de vidro afastado das bordas.
- Logo, links, entrar, criar conta e menu mobile mantêm suas ações atuais.
- O item ativo deve acompanhar a seção visível; não permanece fixo no primeiro destino.
- O sheet mobile mantém foco contido, Escape, bloqueio de rolagem e alvos mínimos de 44 px.

### 2. Hero aberto

- O hero não recebe um card externo.
- A promessa principal usa composição editorial em até três linhas, com largura controlada e um CTA primário dominante.
- O CTA secundário aponta para a demonstração do produto.
- Três placas diagonais de vidro — **Hoje**, **Tim** e **Negócios** — ocupam a lateral ou o fundo do hero e antecipam os capítulos seguintes.
- As placas são conteúdo de orientação, não métricas inventadas. Seus textos derivam de ações observáveis do produto.
- A iluminação azul elétrica da logo começa atrás das placas; o roxo aparece apenas como profundidade secundária, mantendo o centro de leitura mais escuro.

### 3. Produto na primeira rolagem

- `#painel` vem imediatamente depois do hero e parece emergir dele, com uma transição de profundidade em vez de uma nova faixa sólida.
- Um print real do painel imobiliário substitui o mockup navegável e apresenta produto, dados e densidade visual autênticos.
- O print ocupa a tela de um notebook grafite construído na interface, com bezel fino, câmera discreta e base metálica; o hardware substitui o antigo volume de vidro externo para evitar molduras concorrentes.
- Antes de `#painel` entrar na viewport, o notebook parece fisicamente fechado: a base permanece parada e a tampa grafite, marcada pela logo OtimizIA, repousa sobre a dobradiça.
- A âncora `#painel` aponta para o palco do notebook, não para o início da seção; assim, título e estado fechado já entram enquadrados, sem deslocar o hardware para compensar o espaço reservado pela tampa.
- Conforme o scroll desce, a mesma tampa gira da posição quase horizontal até a vertical, com perspectiva longa e limitada para comunicar profundidade sem ampliar o plano sobre a página. Durante o giro, o exterior grafite desaparece e revela o print real por dentro.
- O título permanece visível no espaço superior durante o estado fechado, e o trilho reserva apenas a altura natural do hardware mais o curso da animação; não há um viewport vazio acima do notebook.
- A largura cresce discretamente durante a abertura, sem ultrapassar a moldura. Ao terminar, toda transformação é removida para preservar a nitidez do texto do produto.
- Com movimento reduzido ou sem JavaScript, o notebook aparece aberto e estático.
- Em mobile, o preview usa enquadramento adaptado, sem escala ilegível, corte de ações ou rolagem horizontal da página.

### 4. Corredor “Hoje → Tim → Negócios”

- Os três conceitos apresentados no hero reaparecem como marcadores de capítulo durante a rolagem.
- **Hoje:** enquadra prioridades, compromissos e clientes que precisam de resposta.
- **Tim:** demonstra execução por voz ou texto usando o `AiComposer`, sem repetir a mesma promessa em vários blocos.
- **Negócios:** conecta conversas, funil, pedidos, processos ou imóveis ao próximo passo comercial.
- As placas se deslocam lateralmente e mudam de profundidade conforme cada capítulo entra, mas não precisam ser o mesmo nó DOM “morfando” pela página. Repetir a assinatura visual de forma coordenada é suficiente e mais robusto.

### 5. Profissões

- `FeatureTabs` vem depois da prova do produto e responde “como isso muda para o meu trabalho?”.
- O seletor vira um controle segmentado Liquid Glass.
- O conteúdo selecionado ocupa um único stage amplo, com faixas internas e sem card individual para cada recurso.
- Termos reais das verticais permanecem específicos: vendas, jurídico e imobiliário não são reduzidos a um funil genérico.

### 6. Conversão

- `Pricing`, FAQ, `About` e CTA final formam o último ambiente refrativo da página.
- Preço continua sendo um único painel dividido internamente entre teste e assinatura.
- FAQ continua sendo uma lista expansível dentro de um único volume.
- `About` mantém comparação editorial, sem transformar cada linha em card.
- O CTA final recebe a reflexão azul mais intensa depois do hero.
- O footer fica aberto sobre o canvas e encerra o movimento visual.

## Sistema visual

### Paleta

- Canvas azul-noite: `#050916`.
- Profundidade grafite azulada: `#091124`.
- Azul da logo: `#4d71ff` como cor dominante da landing, incluindo luz, ação, seleção e foco.
- Azul claro: `#91a9ff` para estados de hover, ênfase tipográfica e reflexos.
- Roxo da logo: `#5d3aff` como apoio em aproximadamente 20% do peso cromático.
- Violeta do produto: `#8757f0` permanece somente dentro do preview, preservando a interface autenticada real.
- Texto principal: branco.
- Texto secundário: branco com opacidade ajustada pelo contraste medido sobre cada fundo real.

Não haverá texto em gradiente, arco-íris, ciano decorativo, bordas coloridas em todos os volumes ou múltiplas auroras concorrentes. A combinação azul e roxo deriva diretamente dos pixels da logo, não de um gradiente SaaS genérico.

### Tipografia

- Inter permanece como única família.
- H1: `clamp(40px, 7vw, 76px)`, peso 800, tracking nunca menor que `-0.04em`, até três linhas.
- H2: `clamp(30px, 4.2vw, 48px)`.
- Corpo de destaque: `clamp(16px, 1.4vw, 19px)` com máximo de 65 caracteres por linha.
- O tamanho não substitui hierarquia: cada capítulo começa com rótulo curto, título, prova e ação ou demonstração.

### Materiais

As regras novas ficam escopadas sob `.landing-cinematic-page` e não alteram `.glass`, `.panel`, `.od-chrome` ou tokens globais do produto.

- `.landing-cinematic-page`: canvas contínuo, isolamento e campos de luz.
- `.landing-cinematic-light`: luz ambiente ampla, desfocada e sem conteúdo.
- `.landing-cinematic-nav`: chrome flutuante da navegação.
- `.landing-cinematic-plate`: placas diagonais “Hoje / Tim / Negócios”.
- `.landing-cinematic-stage`: grandes volumes de prova, preview e conversão.
- `.landing-cinematic-stage--quiet`: variação menos refrativa para leitura longa.

Um stage usa uma única borda iluminada, preenchimento grafite translúcido, saturação moderada e reflexão localizada. Elementos internos usam divisores ou preenchimentos discretos, nunca outro `backdrop-filter`.

### Iluminação

- Existem no máximo dois campos cromáticos simultâneos: azul da logo dominante e roxo da logo secundário, em proporção visual aproximada de 80/20.
- A luz muda de posição entre os capítulos, mas o centro atrás de parágrafos permanece escuro.
- Reflexos aparecem principalmente nas bordas inferior e lateral dos volumes, longe do início dos textos.
- A composição não usa glow pulsante, spotlight seguindo o mouse ou gradiente independente por seção.

## Movimento

- O hero usa uma entrada inicial de até 500 ms para texto e placas, sem atrasar foco, clique ou conteúdo essencial.
- A rolagem desloca cada placa no máximo 32 px, limita escala ao intervalo de `0.98` a `1.02` e mantém opacidade de conteúdo em pelo menos `0.72`.
- O preview do produto aproxima-se visualmente do visitante na transição do hero, mas não fica preso em um trecho longo de scroll.
- Capítulos entram por posição e profundidade, não apenas por fade.
- Nenhuma animação essencial roda em loop.
- `prefers-reduced-motion: reduce` remove transforms dependentes de scroll e entrega imediatamente o estado final.
- JavaScript melhora a coreografia; conteúdo, links e CTAs permanecem presentes sem ele.

## Responsividade

### Mobile — 390 px como referência mínima

- O hero empilha texto antes das placas.
- As placas podem cruzar apenas o limite do quadro decorativo interno do hero. Esse quadro usa clipping local; o documento nunca cria overflow horizontal.
- Os três capítulos viram uma sequência vertical, sem parallax lateral obrigatório.
- Preview, seletor de profissões, FAQ e preço preservam alvos de 44 × 44 px.
- O CTA fixo mobile não cobre CTA final, preferências de cookies nem controles do preview.

### Tablet e desktop

- Entre 768 e 1199 px, placas e texto dividem a dobra sem reduzir a legibilidade do título.
- A partir de 1200 px, a composição é assimétrica e usa o corredor diagonal completo.
- Em telas ultrawide, o conteúdo mantém teto de largura; a luz pode ocupar a viewport, mas texto e produto não se esticam indefinidamente.

## Acessibilidade e fallbacks

- Texto normal atinge pelo menos 4,5:1 e texto grande pelo menos 3:1 sobre o pixel renderizado do fundo real.
- Placeholder e texto secundário não recebem exceção de contraste.
- `prefers-reduced-transparency` troca os stages por grafite opaco, sem remover fronteiras ou hierarquia.
- `prefers-contrast: more` reforça bordas e reduz interferência das luzes.
- Foco visível usa o azul da landing sem depender somente de cor; o preview mantém o violeta canônico do produto.
- A ordem de leitura do DOM acompanha a narrativa visual; placas deslocadas não alteram a sequência semântica.
- Elementos decorativos ficam com `aria-hidden`; placas com conteúdo real permanecem legíveis para tecnologia assistiva.

## Arquitetura de componentes

- `app/page.tsx` controla ordem, âncoras e composição dos capítulos.
- `components/landing/hero.tsx` recebe a nova composição editorial e as placas iniciais.
- `components/landing/cinematic-scroll-corridor.tsx` coordena somente progresso de rolagem e transforms das placas; copy, dados e navegação continuam nos componentes semânticos da página.
- `DashboardScreenshot`, `FeatureTabs`, `AiComposer`, `Pricing`, `FaqAccordion` e `About` preservam suas responsabilidades e recebem apenas a nova moldura visual necessária.
- `app/globals.css` recebe classes exclusivamente prefixadas por `landing-cinematic-` e ajustes dos tokens `lp-*` já exclusivos da landing.
- O bloco antigo `.landing-liquid-*` só permanece se ainda houver uso comprovado; seletores mortos são removidos antes da nova camada para não manter duas implementações concorrentes.
- Componentes apagados no refactor de 2026-08-07 não serão restaurados apenas para recuperar efeitos antigos; novas abstrações precisam corresponder à narrativa aprovada.

## Comportamento em falhas

- Sem suporte a `backdrop-filter`, stages usam grafite opaco e borda clara.
- Sem JavaScript, nenhuma seção fica escondida por estado inicial de animação.
- Se `IntersectionObserver` ou a coreografia de scroll não estiver disponível, navegação e conteúdo funcionam em ordem normal.
- O preview continua com seu estado inicial utilizável mesmo que interações opcionais não carreguem.

## Verificação

Antes da entrega:

1. Executar contratos específicos da landing e atualizar testes que validem a nova ordem sem acoplá-los a uma sequência frágil de classes Tailwind.
2. Executar `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd test` e `npm.cmd run build`.
3. Validar em navegador a 390, 768 e 1440 px.
4. Conferir ausência de overflow horizontal, alvos de 44 px, âncoras, navegação ativa, menu mobile, tabs, preview, FAQ, CTAs, cookies e redirecionamento autenticado.
5. Medir contraste sobre pixels renderizados nas zonas mais claras do vidro.
6. Validar `prefers-reduced-motion`, `prefers-reduced-transparency`, `prefers-contrast: more` e a experiência essencial sem JavaScript.

## Critérios de aceite

- A landing lê como um único corredor imersivo e não como faixas alternadas.
- “Hoje → Tim → Negócios” é compreensível no hero e reaparece na progressão da página.
- O print real do painel surge na primeira rolagem, inteiro no desktop e explorável horizontalmente dentro da moldura no celular.
- A direção visual combina movimento cinematográfico com tipografia editorial firme.
- Não há vidro aninhado, texto em gradiente, card por recurso ou auroras concorrentes.
- Copy e alegações comerciais são verdadeiras para o produto atual.
- Landing e produto autenticado continuam visual e estruturalmente isolados.
- Mobile, contraste, fallbacks e movimento reduzido passam pelas verificações definidas acima.

## Fora de escopo

- Alterar Supabase, autenticação, billing, preço, integrações ou permissões.
- Redesenhar qualquer rota autenticada.
- Criar ilustrações remotas, vídeos pesados ou dependência de stock para sustentar o hero.
- Introduzir um sistema global de glass diferente do já usado pelo produto.
