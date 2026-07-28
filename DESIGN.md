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
- Canvas: `#151419`.
- Superfície: `#2a292f`; superfície secundária: `#1f1e24`.
- Texto: `#f5f4f7`, `#b2b0b7`, `#928f98`.
- Acento: `#8757f0`; hover: `#a78bfa`.
- Raios: 4, 4, 4, 6 e 8 px. `999px` apenas para círculos reais.
- Alvo mínimo de toque: 44 × 44 px.

## Regras

1. Plano em repouso. Sombra só sinaliza elevação real ou interação.
2. Uma cor de ação. Verde, âmbar e vermelho comunicam estado, não decoração.
3. Nada de glassmorphism, gradiente decorativo ou texto em gradiente no produto.
4. Não aninhar cards. Métricas relacionadas formam uma faixa ou painel com propósito.
5. Desktop usa relações e densidade; mobile reorganiza a mesma hierarquia.
6. Conteúdo continua visível sem JavaScript. JavaScript melhora interação e movimento.
7. `prefers-reduced-motion` deve ser respeitado e animação não bloqueia a entrada.
8. Estado vazio, erro, carregamento e permissão fazem parte do componente.

## Compatibilidade

As rotas antigas podem continuar redirecionando para `/painel`, mas não mantêm
uma segunda implementação visual. Toda funcionalidade real vive no shell
persistente de `/painel`.
