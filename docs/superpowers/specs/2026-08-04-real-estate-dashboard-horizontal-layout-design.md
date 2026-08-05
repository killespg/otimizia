# Dashboard imobiliário horizontal — especificação de layout

## Objetivo

Reorganizar a visão geral imobiliária para que a leitura siga a ordem busca da IA → resumo da operação → indicadores detalhados, mantendo dark mode, transparências e Liquid Glass sem alterar dados, permissões, links ou ações.

Esta especificação substitui apenas a topologia de layout do documento `2026-08-04-real-estate-dashboard-liquid-stage-design.md`. O comportamento funcional e as decisões de material continuam válidos.

## Hierarquia aprovada

1. Cabeçalho com saudação e ações primárias.
2. Busca contextual do Tim.
3. Quatro métricas em uma faixa horizontal imediatamente abaixo da busca.
4. Título e personalização da área de trabalho.
5. Indicadores imobiliários ocupando toda a largura útil.
6. Bandeja contextual de comissões e metas.

Em telas estreitas, a faixa de métricas deve quebrar para duas colunas e depois uma coluna quando necessário, sem provocar rolagem horizontal.

## Métricas

- Manter os quatro destinos e valores atuais.
- Usar uma única superfície de vidro contendo quatro células equivalentes no desktop.
- Evitar divisores pesados; separação deve vir de espaço, contraste sutil e estados de interação.
- Preservar alvo interativo mínimo de 44 px, foco visível e rótulos acessíveis.

## Indicadores

- O painel deve ocupar `width: 100%` e ficar abaixo das métricas.
- Conversão e carteira, Indicadores financeiros e Esforço operacional permanecem em três colunas no desktop.
- A superfície deve usar vidro mais denso que os cartões de resumo, com `backdrop-blur` e preenchimento escuro translúcido para legibilidade sobre a paisagem.
- Não reintroduzir grade de bordas ou cartões aninhados para cada linha.

## Sidebar desktop

- O painel flutuante deve permanecer visível durante a rolagem e sempre expandido em `md` ou maior.
- Remover apenas a persistência e o botão do estado recolhido. A largura permanece ajustável entre 256 e 360 px pela borda direita inteira, persistida por vertical, com arraste, teclado e duplo clique para restaurar 288 px.
- A área rolável usa thumb arredondado e translúcido, sem setas nas extremidades, com trilho invisível e faixa independente do redimensionador.
- No Chromium/Safari, os pseudo-elementos WebKit controlam a scrollbar sem interferência de `scrollbar-width`; Firefox usa o fallback padronizado.
- Exibir Visão geral e Tim, seguidos de todos os grupos de categoria com ícone, rótulo e seus destinos. No imobiliário: Imobiliário, Comercial e Gestão.
- A largura deve acomodar os rótulos sem competir excessivamente com a área de trabalho.
- Preservar o material translúcido, o reflexo inferior aprovado, a troca de workspace, configurações, logout e navegação mobile existente.

## Fora de escopo

- Alterar consultas, métricas, regras de autorização ou dados.
- Alterar a navegação mobile.
- Recriar o fundo da dashboard ou modificar a preferência de animação.
- Mudar o conteúdo das telas de destino.

## Refinamento premium aprovado

- Cada KPI recebe um contorno SVG abstrato, decorativo e `aria-hidden`; ele não comunica tendência real.
- Os valores grandes usam gradiente branco → slate, preservando contraste no dark mode.
- Previsão, recebido e meta exibem barras finas calculadas com os totais reais do período.
- O pulso violeta fica concentrado na busca do Tim, em Novo imóvel e no progresso financeiro.
- Ícones usam placa violeta translúcida + traço branco/cinza para simular duotone sem trocar a biblioteca Lucide.
- Cards podem subir 4 px no hover com glow suave, mas eliminam movimento quando `prefers-reduced-motion` está ativo.
- Iluminação 3D usa bordas superior/esquerda discretas. Na sidebar, o reflexo principal continua embaixo para não competir com as informações do cabeçalho.
- Sidebar e faixa de métricas reduzem o azul principalmente dessaturando o canvas no `backdrop-filter`; películas grafite ficam abaixo de 10% para preservar transparência, blur e refração.

## Critérios de aceite

- Os quatro cards são renderizados depois da busca do Tim e antes da área de trabalho.
- A sidebar desktop permanece sempre expandida, permite ajuste acessível de largura e preserva todos os rótulos das categorias.
- A faixa usa quatro colunas no desktop e não empurra os indicadores lateralmente.
- O painel de indicadores é irmão da faixa de métricas e ocupa a largura útil inteira.
- A sidebar desktop não pode ser recolhida/redimensionada e mostra todos os rótulos de categoria.
- Testes de contrato, typecheck, lint e testes visuais Liquid Glass continuam verdes; fixtures autenticadas ausentes devem ser reportadas como não verificadas.
