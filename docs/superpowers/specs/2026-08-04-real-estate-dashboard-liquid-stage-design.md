# Palco aberto para o dashboard imobiliario

Status: direcao C aprovada pelo usuario no comparador visual em 2026-08-04.

## Objetivo

Redesenhar a visao geral imobiliaria para que o Liquid Glass organize a
interface, em vez de apenas aparecer sobre uma grade convencional de cards e
divisores. O dashboard deve preservar os dados, filtros, links e permissoes
atuais, mas trocar a leitura de planilha por um palco aberto com poucos volumes
de vidro funcionais.

## Diagnostico

A tela atual combina uma paisagem expressiva e controles Liquid Glass com
paineis retangulares opacos, linhas horizontais, divisores verticais e bordas
internas. O resultado e uma sobreposicao de dois sistemas: o shell tenta parecer
fluido, enquanto o conteudo continua organizado como uma tabela de caixas.

As linhas que devem sair incluem:

- separadores horizontais entre saudacao, Tim e area de trabalho;
- divisores internos da faixa de metricas;
- bordas entre as tres colunas de indicadores;
- linhas entre cada indicador dentro das colunas;
- bordas de cabecalho em indicadores, comissoes e metas;
- qualquer `divide-x`, `divide-y`, `border-t` ou `border-b` usado apenas para
  desenhar a grade do dashboard.

A borda perimetral fina do Liquid Glass nao conta como divisor: ela continua
necessaria para definir o limite optico de controles e volumes flutuantes.

## Direcao aprovada: C, Palco aberto

O canvas com a paisagem continua visivel e participa da composicao. O vidro se
concentra onde ha navegacao, resumo ou interacao. Os indicadores detalhados
respiram diretamente no canvas, agrupados por tipografia e espacamento, sem um
card ao redor.

### 1. Shell e cabecalho

- A sidebar desktop permanece como um unico volume Liquid Glass claro.
- Busca, alertas e acoes superiores continuam como controles de vidro
  compactos, sem uma barra opaca por tras.
- Data, saudacao e resumo operacional ficam diretamente no canvas.
- `Agenda de visitas` e `Novo imovel` permanecem no cabecalho; o CTA primario
  continua sendo o unico controle tingido de violeta.
- O acesso ao Tim vira uma capsula Liquid Glass curta, alinhada ao fluxo do
  cabecalho. Ele nao ocupa mais uma faixa de largura total nem cria linhas acima
  e abaixo.

### 2. Rail de metricas

- `Imoveis ativos`, `Vitrines enviadas`, `Visitas` e `Comissao prevista` formam
  um unico rail Liquid Glass.
- No desktop, o rail e vertical e ocupa a coluna esquerda da area analitica.
- Cada metrica usa apenas espacamento, hierarquia tipografica e uma superficie
  interna muito sutil; nao ha divisores entre itens.
- Cada metrica preserva seus links, notas, valores reais e estados vazios.
- O rail usa os tokens existentes de vidro funcional, sem introduzir um novo
  material ou uma nova cor de acento.

### 3. Campo aberto de indicadores

- `Indicadores imobiliarios` fica diretamente no canvas, ao lado do rail.
- Conversao e carteira, indicadores financeiros e esforco operacional continuam
  sendo os tres grupos semanticos.
- Os grupos usam titulos, colunas e ritmo vertical. Nao usam cards, faixas,
  divisores ou fundos proprios.
- Cada linha de dado preserva rotulo, valor, nota e link atuais. O alinhamento
  entre rotulo e valor continua consistente para leitura rapida.
- `Baixar relatorio` permanece como acao secundaria compacta no cabecalho do
  campo aberto.
- `Personalizar painel` permanece um controle Liquid Glass e abre o mesmo filtro
  atual, sem alterar parametros de URL ou comportamento do formulario.

### 4. Bandeja contextual

- Comissoes e metas deixam de parecer dois cards independentes.
- Os dois assuntos formam uma unica bandeja Liquid Glass abaixo dos indicadores,
  com duas regioes definidas por espacamento e alinhamento, nunca por uma linha.
- Grafico, totais, progresso, links e estados vazios atuais permanecem.
- A bandeja e o segundo grande volume de vidro do conteudo; nenhum painel filho
  recebe outra camada de vidro.

## Hierarquia de material

1. Canvas: paisagem escurecida aprovada, sem outras manchas ou gradientes.
2. Conteudo aberto: saudacao e indicadores sem fundo proprio.
3. Vidro funcional: sidebar, controles, rail de metricas e bandeja contextual.
4. Vidro transitorio: popover de personalizacao e outros overlays existentes.

Nao existe vidro sobre vidro. O rail e a bandeja podem conter areas internas de
branco com 4% a 7,5% apenas para reforcar agrupamento, sem blur adicional, borda
ou sombra.

## Dados e comportamento

- A assinatura e as props de `RealEstateDashboard` permanecem inalteradas.
- Nenhuma metrica e inventada, estimada ou substituida por dado demonstrativo.
- Filtros `from`, `to` e `brokerFilter`, permissao de equipe e personalizacao
  mantem a logica atual.
- Links para imoveis, vitrines, visitas, comissoes e relatorio continuam
  navegaveis.
- Ausencia de dados continua explicita por meio das notas reais: nunca se cria
  progresso, tendencia ou comparacao ficticia para preencher espaco.

## Responsividade

### Desktop

- Rail de metricas com largura entre 200 e 240 px.
- Campo aberto ocupa o restante da largura em tres colunas semanticas.
- Bandeja contextual ocupa a largura do campo aberto e pode se alinhar ao rail
  quando a densidade de dados exigir.

### Tablet

- Rail passa a ser horizontal dentro de um unico volume de vidro.
- Indicadores usam duas colunas; o terceiro grupo quebra para a linha seguinte.
- Bandeja contextual permanece unica e reorganiza seu conteudo em duas linhas.

### Mobile

- O rail vira uma grade 2 x 2 dentro de um unico volume de vidro. Nao ha quatro
  cards separados nem rolagem horizontal obrigatoria.
- Os tres grupos de indicadores empilham na ordem Conversao, Financeiro e
  Operacao, separados apenas por espacamento.
- A bandeja empilha Comissoes e Metas no mesmo volume.
- Alvos de toque permanecem com no minimo 44 x 44 px, e o dock inferior nao
  cobre a ultima secao.

## Acessibilidade

- Texto principal e secundario devem manter WCAG AA sobre o pior trecho da
  paisagem.
- Valores nao dependem apenas de cor para comunicar estado.
- Foco visivel continua presente em links, botoes, summary e campos.
- `prefers-reduced-transparency` troca rail, bandeja, sidebar e overlays por
  superficies opacas coerentes, sem perder agrupamento.
- `prefers-contrast: more` reforca apenas os limites perimetrais e o foco; nao
  reintroduz a grade de divisores.

## Estados e erros

- Estados vazios usam texto orientador no fluxo, sem criar um card vazio.
- Erros de dados ou relatorio permanecem associados ao modulo afetado e usam
  mensagem direta; nao bloqueiam as outras metricas.
- Carregamento preserva as dimensoes do rail, das colunas e da bandeja para
  evitar deslocamento de layout.

## Criterios de aceitacao

- Em captura de tela inteira, nenhuma linha horizontal atravessa o conteudo.
- A estrutura e reconhecivel sem depender de bordas internas.
- Existem no maximo dois grandes volumes de vidro na area de conteudo: rail e
  bandeja contextual.
- Os indicadores detalhados aparecem diretamente sobre o canvas.
- A primeira leitura e saudacao, metricas, indicadores e contexto financeiro,
  nessa ordem.
- Todos os valores, links, filtros, acoes e permissoes do dashboard atual
  continuam funcionando.
- Desktop, tablet e mobile preservam a mesma ordem semantica.
- Contraste, transparencia reduzida, contraste aumentado e alvos de toque passam
  na verificacao automatizada e manual.

## Estrategia de verificacao

- Teste de componente para garantir que os dados e links existentes continuam
  renderizados com as mesmas props.
- Playwright publico para validar tokens de material, ausencia de grandes
  superficies opacas e fallbacks de acessibilidade.
- Playwright autenticado para validar layout real em desktop e mobile, filtros,
  links, abertura do painel de personalizacao e foco.
- Captura visual nos breakpoints 1440 px, 1024 px e 390 px.
- `typecheck`, `lint`, testes unitarios e `git diff --check` continuam como gate.

## Fora de escopo

- Alterar dados, calculos, schema, consultas ou permissoes.
- Redesenhar outras verticais nesta primeira entrega.
- Trocar a paisagem, a tipografia Inter ou o violeta da marca.
- Criar graficos, tendencias ou metas que nao existam nos dados atuais.
- Alterar a navegacao global, o dock mobile ou os fluxos de criacao de imovel.
