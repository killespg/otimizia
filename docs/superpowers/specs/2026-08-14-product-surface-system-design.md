# Sistema de superfícies do painel OtimizIA

## Objetivo

Eliminar a aparência quadrada e fragmentada das áreas autenticadas sem transformar cada bloco em card. Todas as rotas sob `/painel` devem usar o mesmo vocabulário visual: painéis externos com 15 px, grupos internos com 11 px, controles com 9 px, fundos sólidos neutros e azul apenas em ação, seleção e foco.

O trabalho é uma migração estrutural. Não será aplicado um seletor genérico sobre todo `<section>`, porque isso criaria cards aninhados, arredondaria seções abertas e quebraria superfícies funcionais como chat, calendário e configurações.

## Evidência atual

- O design system já define os raios canônicos em `app/globals.css`, mas a adoção é parcial.
- Há 54 superfícies completas com borda e fundo, sem raio, distribuídas em 22 arquivos.
- O padrão literal `border border-white/[0.09] bg-[#1e1d22]` aparece 35 vezes; 34 ocorrências não têm raio.
- Existem três vocabulários concorrentes (`panel`, `od-band` e `ui-surface`) e várias implementações locais de métricas, cabeçalhos e listas.
- A tela de agenda jurídica empilha quatro retângulos equivalentes, inclusive para filas vazias, e usa linhas em todos os níveis da hierarquia.

## Contrato visual

### Camadas

1. **Canvas**: fundo contínuo da aplicação, sem borda ou raio.
2. **Painel de dados ou formulário**: `--surface-primary`, borda `--border-default`, raio `--radius-panel` de 15 px, sem sombra em repouso.
3. **Grupo interno**: `--surface-secondary`, raio `--radius-inner` de 11 px. Serve para filtros, métricas relacionadas e agrupamentos internos; não recebe uma segunda moldura decorativa.
4. **Controle**: raio `--radius-control` de 9 px, alvo mínimo de 44 × 44 px.
5. **Estado em cápsula**: `--radius-round` somente para status, toggles, avatar e marcadores circulares.

### Espaçamento

A escala executável é 4, 8, 12, 16, 24, 32 e 48 px.

- título e descrição: 4–8 px;
- controles irmãos: 8–12 px;
- conteúdo interno: 16 px no mobile e 20–24 px no desktop;
- seções irmãs: 24 px;
- mudança de zona, como resumo para operação: 32 px;
- separação excepcional: 48 px.

Páginas usam `gap`, não margens locais acumuladas. O shell continua responsável pelos recuos externos responsivos já existentes.

### Linhas e agrupamento

- Borda externa existe somente quando delimita uma superfície real.
- Cabeçalhos de painel podem usar um divisor sutil quando o corpo rola ou contém tabela.
- Linhas de listas não recebem borda individual por padrão. Alternância tonal (`od-rows`) e hover comunicam continuidade.
- Tabelas mantêm divisores necessários para leitura de colunas, mas ficam recortadas pelo painel externo.
- Não há sombra em repouso. Elevação é reservada a dropdown, popover, modal, toast e outros overlays.

## Arquitetura de componentes

### Primitivas globais

`components/ui/surface.tsx` passa a concentrar:

- `Page`: largura máxima, stack e ritmo de página;
- `PageHeader`: título, descrição, breadcrumb/eyebrow e ações responsivas, sem borda inferior por padrão;
- `Surface`: base existente para superfícies semânticas;
- `DataPanel`: cabeçalho, toolbar e corpo de lista/tabela;
- `FormPanel`: superfície de formulário com o mesmo contrato externo;
- `InsetGroup`: agrupamento interno de 11 px;
- `Section`: seção aberta, sem card obrigatório.

`components/ui/data-display.tsx` mantém `MetricBand` e `Status`, corrigindo espaçamentos fora da escala. Métricas usam 2 colunas no mobile quando houver espaço e auto-fit no desktop.

`components/legal/legal-ui.tsx` deixa de manter versões paralelas de página, cabeçalho e métricas. Ele delega às primitivas globais e preserva apenas semântica específica do jurídico.

### Classes legadas

- `.panel` e `.card` continuam compatíveis e apontam para o contrato de painel de 15 px.
- `.od-band` permanece como grupo interno de 11 px.
- `rounded-md` não é usado como atalho semântico para painéis ou controles novos.
- Novas implementações usam as primitivas ou os tokens semânticos explícitos.

## Migração das abas

### Jurídico

- **Agenda e prazos**: uma faixa de métricas e um único `DataPanel` cronológico. Grupos com conteúdo recebem cabeçalho; filas vazias viram linhas compactas, sem quatro cards equivalentes.
- **Processos**: carteira e métricas usam as mesmas primitivas; ações adotam raio de controle.
- **Consulta DataJud**: formulário e resultado viram `FormPanel` e `DataPanel`.
- **Documentos e movimentações**: corrigir grupos encostados, manter 24 px entre seções e substituir superfícies quadradas.
- **Detalhe do processo**: painéis existentes permanecem, mas divisores repetidos são reduzidos e controles abaixo de 44 px são corrigidos.

### Financeiro

- Formulários de recebimento e criação usam `FormPanel`.
- Contas a receber e despesas permanecem tabelas dentro de `DataPanel`.
- Ações e consulta recebem hierarquia espacial distinta sem novos cards internos.

### CRM geral

- Funil, contatos, tarefas, equipe, calendário e métricas deixam de variar entre `flat` e `panel` por profissão.
- O tipo de conteúdo determina a primitiva; o workspace altera dados, rótulos e permissões, não o raio.
- Listas contínuas usam superfície externa única e linhas tonais.

### Operação de vendedor

- Produtos, coleções, pedidos, pós-venda e configurações operacionais migram as superfícies quadradas para `DataPanel`, `FormPanel` ou `InsetGroup`.
- Ícones e miniaturas não recebem moldura quadrada se cor, proximidade e alinhamento já comunicarem o grupo.

### Imobiliário

- Remover o override que reduz `.panel` para 11 px e o `border-radius: 0` de `.real-estate-flat-section` quando ela representa painel real.
- Mapa, calendário e tabelas mantêm suas superfícies funcionais; o contêiner externo recebe raio, não cada célula.

## Exceções deliberadas

- **Configurações**: continua como coluna de seções abertas; apenas avisos, perigo e grupos interativos usam superfície.
- **WhatsApp/chat**: conversa e lista podem ocupar planos contínuos. Compositor, busca e popovers usam controles e grupos arredondados, sem card ao redor de cada mensagem.
- **Calendários e kanban**: células/colunas internas não são arredondadas individualmente. O quadro externo usa painel, e controles usam raio de 9 px.
- **Landing, autenticação, PDFs e compartilhamentos públicos**: fora do escopo desta migração do painel autenticado.

## Responsividade e acessibilidade

- Todo botão, link de ação e controle tem área acionável mínima de 44 × 44 px em qualquer ponteiro.
- Ações de cabeçalho quebram linha e, no mobile, podem ocupar a largura disponível.
- Listas tabulares viram blocos rotulados no mobile quando a leitura horizontal não for essencial.
- Tabelas reais usam `overflow-x: auto` dentro do painel.
- `overflow: hidden` recorta o raio apenas na superfície externa; menus e popovers usam portal ou posicionamento que escape do recorte.
- Foco visível usa o token `--focus-ring`; contraste mantém WCAG AA conforme os tokens existentes.
- Nenhuma animação nova é necessária para a migração. Interações existentes continuam respeitando `prefers-reduced-motion`.

## Estratégia de implementação

1. Fortalecer primitivas, tokens e testes de contrato.
2. Migrar o jurídico, usando agenda e prazos como caso de referência visual.
3. Migrar financeiro e CRM geral.
4. Migrar vendedor e imobiliário.
5. Remover branches visuais `flat` que não representam diferença funcional.
6. Fazer varredura final de superfícies com borda + fundo sem primitiva/raio e registrar apenas exceções deliberadas.

Cada etapa deve preservar comportamento, autorização, RLS, dados e navegação. A migração altera composição e classes, não consultas ou regras de negócio.

## Verificação

- Testes de contrato das primitivas e testes estáticos das rotas migradas.
- Typecheck e lint focados por etapa.
- Build de produção ao concluir a migração.
- Capturas em desktop e mobile das abas representativas: prazos, processos, DataJud, financeiro, funil, tarefas, produtos, pedidos, mapa e WhatsApp.
- Auditoria visual: raios 15/11/9, ausência de cards aninhados, redução de linhas, estados vazios compactos e alvos de 44 px.
- Varredura mecânica final para superfícies completas sem raio e valores fora da escala de 4 px.
- Teste de navegação autenticada para confirmar que nenhuma superfície recortou dropdowns ou popovers.

## Critérios de aceite

- Toda superfície real de nível de página em `/painel` usa raio de 15 px, salvo exceção documentada.
- Grupos internos usam 11 px; controles usam 9 px; pills usam somente raio redondo.
- Não há superfície completa com borda e fundo sem raio fora das exceções registradas.
- O mesmo tipo de conteúdo tem o mesmo tratamento em qualquer workspace.
- A agenda jurídica não exibe quatro retângulos equivalentes para uma fila útil e três vazias.
- Configurações, chat, calendário e kanban não viram grades de cards.
- Alvos interativos são de pelo menos 44 × 44 px.
- Não há alteração de comportamento, permissão, dados ou rotas.
