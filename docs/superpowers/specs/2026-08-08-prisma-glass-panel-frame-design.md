# Prisma Glass Panel Frame Design

## Goal

Substituir completamente a moldura de notebook da seção `#painel` por uma moldura panorâmica de vidro, mantendo o print real nítido, estático e separado do título em todas as larguras.

## Chosen direction

O usuário escolheu **A · Prisma Glass** na comparação visual. A direção combina:

- uma borda fina azul inspirada na cor da logo;
- roxo apenas como luz secundária;
- vidro translúcido discreto ao redor do produto;
- cantos contínuos, sem base, tampa, dobradiça, câmera ou controles de navegador;
- uma linha de brilho concentrada na borda superior;
- sombra azul difusa atrás do painel, sem transformar o print.

## Structure

`DashboardScreenshot` passa a renderizar uma figura simples composta por:

1. moldura externa `data-prisma-panel-frame`;
2. viewport interno `data-dashboard-screenshot-viewport`;
3. o mesmo arquivo original `painel-imobiliario-mariana.png`;
4. legenda acessível em `figcaption` visualmente oculto;
5. indicação “Arraste para explorar” somente quando houver rolagem horizontal no mobile.

`LaptopOpeningScreen` deixa de participar dessa seção e deve ser removido caso não possua outros consumidores. As regras CSS e seletores exclusivos de tampa, base, dobradiça e cena sticky também deixam de existir.

## Layout behavior

### Desktop

- O print ocupa toda a largura útil da moldura e mantém sua proporção original.
- A moldura usa raio entre `18px` e `22px`, padding entre `6px` e `10px` e borda de `1px`.
- O título permanece no fluxo normal, seguido por um espaço mínimo de `32px` antes da moldura.
- Não há palco sticky, scroll-scrub, perspectiva ou transformação 3D.

### Mobile

- Título e moldura permanecem no fluxo normal e nunca se sobrepõem.
- A moldura começa pelo menos `20px` depois do fim do título.
- O viewport do print limita sua própria altura; o conteúdo pode rolar horizontalmente sem criar rolagem horizontal na página.
- O print continua com resolução suficiente para leitura e não recebe `scale`, `rotate`, `translate` ou `matrix3d`.

## Motion and progressive enhancement

A moldura e o print são estáticos em todos os estados. Não há entrada animada, transformação vinculada ao scroll ou dependência de JavaScript para exibir o produto. A seção entregue por SSR e sem JavaScript possui a mesma geometria da versão hidratada.

## Visual tokens

- Luz dominante: azul da logo.
- Luz secundária: violeta em menor intensidade.
- Centro da moldura: escuro e neutro para preservar o contraste do print.
- Superfície externa: vidro com transparência suficiente para a iluminação de fundo atravessar sem lavar a imagem.
- Nenhum elemento deve sugerir notebook, tablet, monitor ou janela de navegador.

## Accessibility and resilience

- Preservar o texto alternativo atual do print.
- Manter foco e rolagem horizontal acessíveis por toque e teclado quando necessários.
- O conteúdo essencial permanece visível sem JavaScript.
- A página não ganha overflow horizontal.
- A moldura não pode cobrir o título, a navegação ou o conteúdo seguinte.

## Acceptance criteria

- Não existem `data-laptop-cover`, `data-laptop-base`, `data-laptop-hinge` ou `data-laptop-hardware` na página.
- `data-prisma-panel-frame` envolve o print real e está visível em desktop e mobile.
- O topo da moldura fica pelo menos `20px` abaixo do fim do título em viewports de `390px` e `660px`.
- O frame e o print mantêm `transform: none` durante toda a rolagem.
- O arquivo original continua servido sem recompressão do Next Image.
- A landing continua funcional com JavaScript desativado e com movimento reduzido.
- Os testes responsivos confirmam ausência de overflow horizontal da página.

## Verification

- Atualizar os testes E2E da landing para exigir a ausência completa do notebook e a presença da Prisma Glass.
- Adicionar regressão nos viewports `390x844` e `660x694` medindo a distância entre título e moldura.
- Executar a suíte E2E da landing em desktop e mobile.
- Executar typecheck, ESLint direcionado e testes unitários.
- Validar visualmente a seção fechada em `#painel` no servidor local.

## Out of scope

- Alterar o conteúdo do print.
- Reintroduzir mockup navegável.
- Aplicar Prisma Glass aos componentes centrais do produto.
- Modificar outras seções da landing além dos ajustes necessários para o espaçamento de `#painel`.
