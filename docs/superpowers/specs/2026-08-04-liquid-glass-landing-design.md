# Landing Liquid Glass — especificação visual

## Objetivo

Transformar a landing do OtimizIA em uma experiência Liquid Glass contínua e premium, preservando conteúdo, rotas, prova funcional, acessibilidade e responsividade. A landing permanece no registro de marketing em `components/landing`; nenhuma experiência visual desta página deve alterar o material dos painéis autenticados.

## Direção aprovada

A direção aprovada é **imersiva equilibrada**: um canvas escuro contínuo sustenta toda a página, enquanto poucos volumes de vidro agrupam módulos realmente interativos ou decisivos. Títulos e textos editoriais continuam abertos sobre o canvas para evitar card spam e vidro sobre vidro.

### Paleta

- **Obsidian canvas:** `#09080d` — base da página.
- **Graphite depth:** `#15131b` — fallback e zonas de leitura.
- **Glass white:** branco entre 5,5% e 9% — preenchimento dos volumes.
- **Primary text:** `#ffffff`.
- **Secondary text:** `rgba(255,255,255,.72)`.
- **OtimizIA violet:** `#8757f0` — ação, foco e seleção.
- **Muted plum reflection:** `#6f315f` — luz ambiente, nunca segundo CTA.

Inter continua sendo a família tipográfica. A personalidade vem do ritmo, escala e material, não de trocar a fonte do produto.

## Assinatura visual

O elemento memorável será o **campo refrativo contínuo**: manchas amplas de violeta e ameixa atravessam a página atrás dos módulos. Os volumes Liquid Glass deixam esse campo aparecer por refração e saturação. A iluminação muda de posição ao longo da rolagem, mas não usa animação contínua obrigatória nem compete com a leitura.

Não haverá texto em gradiente, bordas violetas em todos os elementos ou aurora multicolorida genérica. A cor mais intensa permanece concentrada nos CTAs e estados selecionados.

## Arquitetura visual

### Canvas e seções

- `app/page.tsx` recebe um canvas único, sem alternância entre `bg-od-bg` e `bg-od-muted-surface`.
- As divisórias horizontais pesadas entre seções saem. Ritmo, espaço e deslocamento das luzes ambientais passam a separar os capítulos.
- Cada seção mantém âncora, `scroll-mt`, largura máxima e conteúdo atual.
- Um marcador semântico permite validar o canvas e os volumes de vidro sem acoplar testes à ordem exata de classes Tailwind.

### Navegação

- A navegação desktop e mobile vira um volume flutuante de vidro, afastado das bordas da viewport.
- Logo, links, entrada, criação de conta e menu móvel permanecem funcionalmente idênticos.
- O item ativo conserva o indicador móvel, agora apoiado em uma película translúcida sutil.
- O sheet mobile continua sendo overlay e mantém trava de foco, Escape e alvos de 44 px.

### Hero

- O hero permanece aberto, sem um card ao redor da promessa principal.
- A luz ambiente fica atrás do título e do CTA; formas decorativas perdem bordas e linhas que conflitem com a refração.
- “Começar grátis” usa o controle Liquid Glass tingido da ação primária.
- A prova social abaixo do hero vive em uma faixa de vidro suave única.

### Profissões e recursos

- O seletor de profissão vira controle segmentado Liquid Glass.
- O conteúdo da profissão ocupa um único stage translúcido. As categorias continuam organizadas em faixas internas, sem card por recurso.
- Exemplos do Tim usam controles/chips translúcidos de baixa ênfase.

### Demonstração do painel

- A moldura do preview é o maior volume de vidro da página e funciona como peça central de prova.
- O dashboard interno continua fiel ao produto e não recebe uma segunda camada de blur.
- A animação 3D existente é preservada com `prefers-reduced-motion`.

### Tim

- `SpotlightCard` e `AiComposer` passam a compartilhar um único stage de vidro.
- A composição continua deixando claro que Tim executa ações, não apenas responde.
- Campo, anexos, comandos e envio usam controles translúcidos internos; não são novos painéis.

### Preço, FAQ, sobre e CTA final

- O preço vira um único painel dividido internamente em teste e assinatura.
- O FAQ vira um volume único; cada pergunta continua sendo uma linha expansível.
- A comparação “O de sempre / No OtimizIA” permanece editorial, dentro de um stage suave único.
- O CTA final usa vidro com uma reflexão violeta localizada e botão primário tingido.
- O footer fica aberto e discreto para encerrar a página sem outro painel concorrente.

## Material

Serão criadas classes exclusivas da landing, apoiadas nos tokens canônicos:

- `.landing-liquid-page`: canvas e luzes ambientais.
- `.landing-liquid-nav`: chrome flutuante da navegação.
- `.landing-liquid-section`: seção aberta e transparente.
- `.landing-liquid-stage`: volume principal com blur, saturação, borda iluminada, sheen e fallback opaco.
- `.landing-liquid-stage--soft`: variação de menor contraste para prova social e conteúdo editorial.

Essas classes ficam em `app/globals.css`, mas só são ativadas sob `.landing-liquid-page`. Não será alterada a semântica global de `.glass`, `.panel`, `.od-chrome` ou das superfícies autenticadas.

## Responsividade e acessibilidade

- Nenhum volume pode gerar rolagem horizontal em 390 px.
- Alvos interativos permanecem com pelo menos 44 × 44 px.
- Texto secundário mantém contraste WCAG AA sobre o fallback e sobre o fundo refratado.
- `prefers-reduced-transparency` substitui blur por grafite opaco.
- `prefers-contrast: more` reforça bordas.
- `prefers-reduced-motion` elimina movimentos decorativos e preserva conteúdo.
- Conteúdo e CTAs essenciais continuam presentes sem JavaScript.

## Fora de escopo

- Alterar copy, preço, rotas, autenticação, Supabase ou comportamento das ações.
- Reutilizar o fundo da dashboard autenticada na landing.
- Promover componentes experimentais da landing para `components/design-system`.
- Transformar cada linha, recurso ou pergunta em card independente.

## Critérios de aceite

- A página usa canvas contínuo sem faixas sólidas alternadas e sem divisórias entre todos os capítulos.
- Navegação, seletor de profissão, preview, Tim, preço, FAQ, comparação e CTA final exibem material Liquid Glass perceptível.
- Hero, títulos de seção e footer permanecem abertos sobre o canvas.
- Não existe vidro sobre vidro no preview do dashboard.
- Landing não apresenta overflow horizontal em mobile e mantém alvos de toque mínimos.
- Fallbacks de transparência, contraste e movimento estão presentes.
- Testes de contrato, suíte Vitest, TypeScript, ESLint e E2E público da landing passam antes da entrega.
