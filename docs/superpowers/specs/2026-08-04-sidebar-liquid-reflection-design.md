# Canvas Balance and Sidebar Liquid Reflection Design

## Objetivo

Reduzir a dominancia azul do canvas e dar mais iluminacao e reflexo a sidebar desktop sem aumentar sua opacidade, competir com o conteudo ou transformar o chrome funcional em uma superficie decorativa.

## Direcao aprovada

Aplicar a direcao C aprovada: fundo mais neutro e sidebar com reflexo branco/prateado concentrado no rodape. A sidebar continua sendo um unico volume translúcido e recebe dois sinais de material:

1. Um highlight branco na borda inferior, distante da area mais densa de informacoes.
2. Um reflexo radial amplo e suave, surgindo abaixo do volume.

O canvas mantém azul apenas como luz lateral secundaria. O centro e a maior parte da area de trabalho leem como grafite quase preto. O resultado da sidebar deve ser percebido como luz branca atravessando vidro, nao como gradiente colorido aplicado sobre a navegacao.

## Balanceamento do canvas

- Preservar o bitmap azul bilateral e sua geometria aprovada.
- Substituir a pelicula azul-marinho atual por `rgba(9, 10, 14, 0.56)`, um grafite quase neutro que reduz saturacao percebida sem apagar o relevo.
- Manter o centro como a regiao mais escura e calma da dashboard.
- Conservar azul e ciano somente nas bordas da paisagem, em intensidade secundaria ao conteudo.
- Nao adicionar magenta, violeta, gradientes decorativos ou novas cores ao canvas.

## Composicao do material

- Manter `--od-glass-fill`, `--od-glass-border` e o blur atuais para preservar a paridade de transparencia com os controles Liquid Glass.
- Reativar somente `::after` em `.product-nav-glass-shell` como camada optica exclusiva da sidebar.
- Compor essa camada com um reflexo radial branco de ate 26% de opacidade, ancorado em `50% 108%`; nao usar luz no topo, azul, violeta ou outra cor.
- Manter a camada em `opacity: 0.72`, suficiente para leitura optica sem formar uma faixa branca sobre os itens.
- Mover o highlight inset de `0 1px` para `0 -1px`, iluminando a borda inferior sem adicionar uma nova sombra externa.
- Manter `pointer-events: none`, `border-radius: inherit` e confinamento pelo `contain: paint` existente.
- Nao animar o reflexo. A sidebar e chrome persistente e deve permanecer visualmente estavel.

## Estados e acessibilidade

- Em `prefers-reduced-transparency: reduce`, ocultar a camada de reflexo e conservar o fallback opaco atual.
- Em `prefers-contrast: more`, manter a borda reforcada ja existente e reduzir o sheen para nao prejudicar a leitura.
- Icones, textos, focos, targets e navegacao permanecem inalterados.
- A mudanca se aplica somente a sidebar desktop; dock mobile, controles e overlays nao mudam.

## Validacao

- Atualizar o teste Liquid Glass para confirmar que a sidebar possui reflexo branco proprio sem alterar `backgroundImage`, `borderColor` e `backdropFilter` compartilhados com o controle Personalizar painel.
- Atualizar o contrato da paisagem para verificar uma pelicula grafite neutra e manter azul predominante apenas no bitmap lateral.
- Confirmar que `::after` esta ativo na sidebar normal e oculto com transparencia reduzida.
- Rodar o E2E Liquid Glass em desktop e mobile, `git diff --check` e verificar o dev local.

## Fora de escopo

- Alterar dimensoes, raio, layout ou conteudo da sidebar.
- Adicionar movimento, brilho azul ou violeta, neon ou novas cores ao design system.
- Mudar a iluminacao de cards, topbar, dock mobile ou controles contextuais.
