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
  `--od-content-surface-muted`. Usam grafite frio translúcido
  (`rgba(54,55,68,.88)` / `rgba(47,49,62,.86)`), sem blur nem sombra ampla.
  Os fallbacks sólidos (`--od-surface-solid` / `--od-muted-surface-solid`)
  cobrem controles nativos como o popup de `<select>`.
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

O material tem fallback opaco quando `backdrop-filter` não existe e respeita
`prefers-reduced-transparency`; `prefers-contrast` reforça todas as bordas.
Movimento respeita `prefers-reduced-motion`.
Textos e ícones nunca entram nas camadas de distorção. Qualquer mudança de
opacidade deve reverificar contraste WCAG AA e os alvos mínimos de 44 px.

## Compatibilidade

As rotas antigas podem continuar redirecionando para `/painel`, mas não mantêm
uma segunda implementação visual. Toda funcionalidade real vive no shell
persistente de `/painel`.
