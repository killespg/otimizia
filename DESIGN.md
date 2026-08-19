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
- Canvas: `#0b0d11`.
- Superfícies: base `#11151a`, primária `#15191f`, secundária `#1b2027`.
- Texto: `#f5f7fa`, `#98a2af`, `#7d8998`.
- Ação: `#2f6fcc`; hover: `#285aa5`; foco: `#7da7e0`.
- Raios: 9 px para controles, 11 px para grupos internos e 15 px para painéis. `999px` apenas para círculos, toggles e estados em cápsula.
- Alvo mínimo de toque: 44 × 44 px.

## Regras

1. Plano em repouso. Sombra só sinaliza elevação real ou interação.
2. Uma cor de ação. Verde, âmbar e vermelho comunicam estado, não decoração.
3. Nada de glassmorphism, gradiente decorativo, canvas ambiental, shader ou texto em gradiente no produto.
4. Não aninhar cards. Métricas relacionadas formam uma faixa ou painel com propósito.
5. Desktop usa relações e densidade; mobile reorganiza a mesma hierarquia.
6. Conteúdo continua visível sem JavaScript. JavaScript melhora interação e movimento.
7. `prefers-reduced-motion` deve ser respeitado e animação não bloqueia a entrada.
8. Estado vazio, erro, carregamento e permissão fazem parte do componente.

## Adaptação por plataforma

- Tokens, estados e chaves de navegação são semânticos e independem de CSS.
- O web converte o contrato para variáveis CSS; um futuro app mobile terá seu próprio adaptador e componentes nativos.
- Componentes React DOM não são compartilhados com o cliente nativo.
- Rotas de impressão e PDF usam papel branco, texto escuro e cobalto contido.

## Compatibilidade

As rotas antigas podem continuar redirecionando para `/painel`, mas não mantêm
uma segunda implementação visual. Toda funcionalidade real vive no shell
persistente de `/painel`.
