# GlassButton na sidebar — design aprovado

**Data:** 2026-08-04  
**Escopo:** navegação desktop compartilhada em `TwoLevelNav`

## Objetivo

Integrar o componente `GlassButton` recebido ao sistema atual e aplicar sua linguagem visual nos controles clicáveis da sidebar, preservando o Liquid Glass existente, a arquitetura de navegação e a semântica HTML.

## Contexto técnico

- O projeto já usa React 19, Next.js 16, TypeScript, Tailwind CSS 4 e o alias `@/components`.
- O diretório compartilhado correto é `components/ui`.
- `class-variance-authority` ainda precisa ser instalada.
- A sidebar compartilhada mistura links de navegação, botões de divulgação, envio de formulário e o separador de largura. Um componente que sempre renderiza `<button>` não pode substituir links diretamente.

## Arquitetura do componente

Criar `components/ui/glass-button.tsx` com três partes públicas:

1. `GlassButton`: renderiza `<button>` para ações reais.
2. `GlassButtonLink`: renderiza `next/link` para navegação.
3. Variantes compartilhadas de tamanho e aparência, construídas com `cva`.

Ambos compartilham o mesmo volume externo, conteúdo interno e sombra/reflexo. O componente aceita `className`, `contentClassName`, `size` e uma variante visual `nav`, além dos atributos nativos correspondentes. Refs devem apontar para o elemento interativo real.

## Aplicação na sidebar

Aplicar a variante `nav` em:

- destinos globais;
- itens das categorias;
- itens de submenu;
- Configurações;
- Sair;
- botões de expandir ou recolher submenu.

Não aplicar em:

- seletor de workspace;
- logomarca;
- trilho de redimensionamento;
- scrollbar.

Links continuam com `href`, prefetch e `aria-current`. O logout continua dentro do formulário e preserva o estado pendente. O botão de divulgação mantém `aria-expanded`, rótulo acessível e alvo mínimo de 44 px.

## Material visual

A variante `nav` adapta o componente recebido ao produto:

- repouso quase transparente, sem sombra decorativa forte;
- borda e brilho internos discretos;
- hover com preenchimento branco translúcido e reflexo um pouco mais claro;
- item ativo com película violeta moderada e contraste de texto AA;
- foco visível usando o acento existente;
- transições entre 150 e 200 ms, neutralizadas por `prefers-reduced-motion` já global;
- sem vidro aninhado perceptível: o botão lê como relevo funcional dentro do volume único da sidebar.

O CSS fica restrito às classes do componente. A demo isolada pode existir como arquivo de exemplo, mas não cria rota pública nem adiciona o fundo pontilhado ao produto.

## Responsividade e comportamento

- A mudança é restrita à sidebar desktop (`md` ou maior).
- O dock e o sheet mobile continuam usando sua implementação atual.
- Rótulos longos permanecem truncados.
- Badges, ícones duotone e submenu continuam alinhados.
- O ajuste de largura entre 256 e 360 px não muda.

## Estados e falhas

- `disabled` reduz contraste e remove o cursor de ação.
- `aria-disabled`, `aria-current` e `aria-expanded` permanecem no elemento interativo.
- O estado pendente de Sair continua sob responsabilidade de `PendingButton`; a integração reutiliza as variantes visuais sem remover seu comportamento.
- Nenhum provider, asset remoto ou imagem é necessário.

## Validação

- Teste unitário do componente para elemento, variantes, ref e classes de conteúdo.
- Contrato da navegação para confirmar `GlassButtonLink` nos links e variante compartilhada nos botões.
- Testes existentes de destinos, badges, submenu, logout e sidebar redimensionável continuam verdes.
- TypeScript, ESLint e suíte completa do Vitest.
- E2E Liquid Glass confirma foco, navegação, ausência de overflow e material no estado ativo/hover quando a fixture autenticada estiver disponível.

## Critérios de aceite

- `class-variance-authority` instalada e registrada no lockfile.
- `GlassButton` e `GlassButtonLink` ficam em `components/ui`.
- Todos os controles de navegação previstos usam a linguagem compartilhada.
- Nenhum link é convertido em `<button>` e nenhum botão é envolvido por link.
- Mobile, redimensionador, scrollbar e seletor de workspace permanecem funcionais.
- Não há console errors, falhas de tipo, lint ou testes.
