# Design System OtimizIA — fonte oficial

Este repositório funcional é a única fonte de verdade do produto em produção.
O catálogo em `../otidesignsystem-main` é uma bancada de referência e
experimentação; nenhuma peça de lá entra no CRM sem ser incorporada aqui.

## Registros separados

- `components/design-system`: shell, navegação e primitivas reutilizáveis do produto.
- `components/landing`: linguagem de marca e marketing. Não define o produto.
- Componentes de cada vertical ficam próximos do domínio (`legal`,
  `real-estate`, `seller`) e usam os mesmos tokens centrais.

## Tokens canônicos

Os valores executáveis vivem em `app/globals.css`.

- Fonte: Inter.
- Canvas: fallback azul-marinho `#07142d` com a paisagem aprovada em
  `public/backgrounds/dashboard-landscape.webp`: magenta à esquerda, azul/ciano
  à direita e centro escuro para sustentar a leitura dos dados. Uma película
  `rgba(9,10,14,.56)` reduz a luminosidade sem apagar as cores da imagem.
  A paisagem é servida em WebP e trocada por `dashboard-landscape-mobile.webp`
  abaixo de 768 px — 31 KB e 7 KB, contra 1,4 MB do master PNG, que fica fora
  do versionamento e só serve para regerar as variantes. Navegador sem WebP
  cai no marinho, que já é o fallback aprovado.
- Superfícies de conteúdo: `--od-content-surface` e
  `--od-content-surface-muted`. Translúcidas (`rgba(42,55,81,.88)` /
  `rgba(36,48,71,.86)`), sem blur nem sombra ampla. Os fallbacks sólidos
  (`--od-surface-solid` / `--od-muted-surface-solid`) cobrem controles nativos
  como o popup de `<select>`.
  Ficam na mesma família do canvas, e não em cinza. Até 2026-08-06 eram um
  grafite de saturação 11% sobre um canvas de saturação 73%: o matiz já estava
  quase certo, mas saturação baixa demais sobre fundo azul saturado lê como
  cinza — dava a impressão de sobra do frontend antigo. A luminosidade não
  mudou, então o contraste do texto continua o mesmo: 12,7:1 no branco, 8,4:1
  no secundário e 5,4:1 no terciário.
- Material funcional: `--od-glass-fill`, `--od-glass-border` e os filtros
  `--od-glass-*-blur`. É reservado a navegação, busca, ações e overlays.
- Borda de conteúdo: branco a 13% em repouso, sem violeta decorativo.
- Texto: `#fff`, `rgba(255,255,255,.78)`, `rgba(255,255,255,.58)`.
- Acento: `#8757f0`; hover: `#a78bfa`. Identidade da marca — não trocar por
  paletas de referência externas (ex. tokens genéricos de templates de
  design system) sem decisão explícita; a cor já carrega reconhecimento de
  marca em toda a base.
- Raios: 12, 16, 20, 24, 28, 32 e 36 px (escala `--radius-sm` a `--radius-4xl`,
  todo `rounded-*` do Tailwind puxa daqui). `999px` (pill) em botões, tags,
  círculos reais e na barra de navegação inferior flutuante do mobile.
  Corrigido em 2026-08-02: a escala anterior (4-8px) lia como formulário
  denso, não como vidro curvo — cantos grandes e contínuos são a assinatura
  visual do material.
- Alvo mínimo de toque: 44 × 44 px.
- Ações: `.btn` (primária, acento), `.btn-secondary` (contorno sobre
  transparente) e `.btn-soft` (pílula sobre o preenchimento do vidro) —
  a secundária padrão do painel. `.btn-soft` era usada em 13 arquivos sem
  nunca ter sido definida na troca do design system: salvar preferências,
  exportar dados e instalar o app renderizavam como texto solto. Definida em
  2026-08-06.

## Regras

1. Conteúdo em repouso é estável e legível. Vidro sinaliza a camada funcional
   que flutua sobre o conteúdo.
2. Uma cor de ação. Verde, âmbar e vermelho comunicam estado, não decoração.
3. Nada de gradiente decorativo ou texto em gradiente no produto. Sheen e
   refração pertencem somente ao material Liquid Glass funcional.
   Exceção única, aprovada em 2026-08-05: o botão do Tim na barra do celular
   usa `bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-800`. Ele é
   a única ação flutuante do produto e o gradiente é o que a separa das abas
   de navegação ao redor. A exceção é dele; não abre precedente para cards,
   faixas de métrica ou tipografia.
4. Não aninhar cards. Métricas relacionadas formam uma faixa ou painel com propósito.
   4a. Lista longa não leva régua por item. O traço de 1px servia ao design
   anterior, de superfícies opacas, onde era a única coisa capaz de marcar onde
   um registro terminava; repetido quarenta vezes vira listra. No vidro a
   separação vem do material: `.od-rows` alterna 2,2% de branco entre as
   linhas, o que marca o registro e preserva o que a régua tinha de útil —
   seguir a linha até a coluna da direita. Só a partir de `sm`, porque no
   celular a linha ocupa a largura toda e não há coluna distante para seguir.
   Contraste medido na faixa: 11,9:1 no branco e 5,2:1 no terciário.
   Régua continua valendo para estrutura: cabeçalho de tabela, cabeçalho de
   painel e fronteira entre seções — e uma só por fronteira, nunca duas.
   Corpo de tabela segue a mesma regra: `<tbody className="od-rows">` e nenhum
   `border-b` por célula. Aplicado ao relatório do funil e aos dois
   pré-visualizadores de CSV em 2026-08-06.
   4b. Configurações não é pilha de card. Cada seção era um `.panel` com as
   bordas laterais removidas, o que deixava só uma régua em cima e outra
   embaixo: doze seções viravam vinte e quatro traços horizontais. Agora
   `.settings-hub` zera borda, fundo e raio das seções em todos os workspaces —
   título, espaço e as faixas `.od-band` de dentro dão a fronteira. A única
   exceção é a zona de risco, que ganha plano vermelho a 8%.
5. Desktop usa relações e densidade; mobile reorganiza a mesma hierarquia.
6. Conteúdo continua visível sem JavaScript. JavaScript melhora interação e movimento.
7. `prefers-reduced-motion` deve ser respeitado e animação não bloqueia a entrada.
8. Estado vazio, erro, carregamento e permissão fazem parte do componente.

## Material: liquid glass

O produto segue a hierarquia do Liquid Glass da Apple: vidro é uma camada
funcional acima do conteúdo, não o material de cada card. O canvas fornece
cor e profundidade; o chrome refrata esse contexto; os dados permanecem
calmos e previsíveis.

- **Chrome persistente** (`.od-chrome`, `.liquid-glass-dock`): shell único da
  navegação desktop e dock flutuante mobile. Rail e painel de detalhe são
  divisões internas do mesmo volume, nunca dois vidros encostados. A sidebar
  desktop replica o vidro claro dos controles (`--od-glass-fill` a 7,5% e blur
  de 16 px), sem a película fumê usada por drawers e outros chromes densos.
- **Controles** (`.liquid-glass-control`): busca, grupos de ações e comandos
  contextuais. A variação tingida fica restrita à ação primária.
- **Overlays** (`.glass`, `.glass-soft`, `.assistant-sheet`, `.voice-panel`,
  `.mobile-create-menu`): menus, sheets e modais acima de conteúdo rolável.
  Não levam preenchimento chapado: a cor vem do que está atrás, já borrado, e
  por cima ficam só o grão e o `--od-glass-reflection`. O branco a 7,5% que
  havia aqui deixava o painel leitoso e foi retirado em 2026-08-05.
  **O reflexo mora sempre na metade de baixo** — faixa especular entrando pela
  quina inferior direita e fio claro na borda inferior. O topo do painel é onde
  fica a maior parte da informação, e brilho ali disputa com a leitura; por isso
  o realce superior de 48% do `--od-glass-highlight` não vale para overlays,
  que ficam com um traço de 10% só para fechar a quina. `.od-chrome` mantém o
  realce no topo: navegação não carrega texto na borda.
  Contraste reverificado após a mudança: pior caso 5,37:1 e as linhas do topo
  entre 9,6:1 e 11:1, todas acima de AA.
- **Conteúdo** (`.panel`, `.card`, `.card-quiet`, `.panel-soft` e tokens
  `bg-od-surface`): superfície grafite neutra sem `backdrop-filter`, com borda
  discreta, raio de 12–16 px e sem sombra ampla. Não existe vidro sobre vidro.
  A faixa de métricas do painel imobiliário não é exceção a isso: as células
  (`.real-estate-metric-card`) não têm `backdrop-filter` próprio — são divisões
  do volume de vidro do rail, com um preenchimento mínimo só para separar a
  célula. Desde 2026-08-05 o rail usa a mesma transparência dos overlays
  (`saturate(140%)`, sem película escura) e o reflexo embaixo.
  Valor de métrica é branco sólido, nunca gradiente: em gradiente a ponta
  cinza media 2,52:1 contra o vidro, abaixo de AA-large. Em branco sólido são
  9,61:1, e o rótulo fica em 5,52:1.

O material tem fallback opaco quando `backdrop-filter` não existe e respeita
`prefers-reduced-transparency`; `prefers-contrast` reforça todas as bordas.
Movimento respeita `prefers-reduced-motion`.
Textos e ícones nunca entram nas camadas de distorção. Qualquer mudança de
opacidade deve reverificar contraste WCAG AA e os alvos mínimos de 44 px.

### Landing: canvas emissivo, vidro passivo

Na landing, azul e roxo decorativos nascem somente no canvas
(`.landing-cinematic-page::before` e `.landing-cinematic-light-*`). Placas,
stages, Prisma, navegação e CTA móvel usam preenchimento preto de até 30%,
reflexo branco de até 8% e nenhuma sombra colorida externa. Azul sólido fica
restrito a ação, seleção e foco; o marketing não altera os componentes centrais
do produto.

## Paridade entre as verticais

O shell é o mesmo nas quatro áreas; o que muda é o domínio. Uma peça que não
fala de imóvel, processo ou produto pertence a `components/design-system` e
vale para todas. Auditoria de 2026-08-07 encontrou quatro coisas que tinham
ficado só onde nasceram:

- `AccountSettingsButton` (era `QuickSettingsButton`, em
  `components/real-estate/`): identidade, avisos, Configurações, Equipe e Sair.
  As outras três topbars tinham só um link seco para `/painel/configuracoes`.
- Sino da topbar: genérico e jurídico desenhavam uma bolinha fixa, que aparecia
  com ou sem lembrete atrasado — indicador que não informa nada é pior que
  nenhum. Passaram a usar o contador real, como vendedor e imobiliário.
- Tela cheia: faltava só no genérico.
- `WorkspaceSwitcher`: o jurídico era a única vertical que não recebia
  `workspaceKey`/`workspaceOptions`, então quem atua em mais de uma área não
  tinha caminho para sair do painel do escritório.

`OperationSummaryButton` continua no imobiliário de propósito: visitas,
propostas e comissões são contagens daquele domínio, não do shell.

## Identidade de quem está usando

`UserAvatar` (`components/design-system/user-avatar.tsx`) é o único desenho da
identidade do usuário no produto. Com foto, a imagem preenche o círculo; sem
foto, continua a pastilha de iniciais. Está nos seis lugares que antes
reimplementavam iniciais à mão — topbar do escritório, do vendedor, do jurídico
e do imobiliário, rodapé da navegação, configurações rápidas e cabeçalho da
visão geral —, com regras que divergiam entre si (uns pegavam as duas primeiras
palavras, outros a primeira e a última). A regra agora é uma: primeira e última.
Quem chama define tamanho, fundo e tipografia pelo `className`; o componente só
garante o círculo e o recorte.

A foto vive no bucket público `profile-photos`, uma pasta por usuário, e o
perfil guarda o caminho (`avatar_path`), não a URL — só o caminho permite apagar
o arquivo antigo na troca. `<img>` em vez de `next/image`: o avatar aparece no
layout de toda tela em seis tamanhos, e não há o que otimizar num quadrado de
32 a 48 px.

## Preferências que saíram

Estilo do painel (`glow`/`clean`/`compact`/`executive`) e cor de destaque
(`purple`/`violet`/`cyan`/`pink`) foram removidos em 2026-08-06. Eram gravados
no perfil, aplicados como `dashboard-board-*`/`dashboard-accent-*` no DOM e
oferecidos ao Tim como parâmetro de ferramenta — mas nenhuma regra de CSS
existia para essas classes, e o `--dashboard-accent-strong` que o gráfico de
receita lia nunca foi definido. Escolher estilo ou cor não mudava um pixel em
área nenhuma. O gráfico passou a usar `--od-accent` e `--od-accent-hover`.
Uma cor de ação é regra do sistema (regra 2); paleta por usuário contradizia
isso e não volta.

## Compatibilidade

As rotas antigas podem continuar redirecionando para `/painel`, mas não mantêm
uma segunda implementação visual. Toda funcionalidade real vive no shell
persistente de `/painel`.
