# Sidebar Liquid Glass Reflection Design

## Objetivo

Dar mais iluminacao e reflexo a sidebar desktop sem aumentar sua opacidade, sem competir com o conteudo e sem transformar o chrome funcional em uma superficie decorativa.

## Direcao aprovada

Aplicar a intensidade B, Apple equilibrado. A sidebar continua sendo um unico volume translúcido e recebe tres sinais de material:

1. Um highlight branco mais presente na borda superior.
2. Um reflexo diagonal amplo e suave, usando o sheen ja definido pelo design system.
3. Um glow azul interno discreto, derivado da paisagem da dashboard.

O resultado deve ser percebido como luz atravessando vidro, nao como gradiente colorido aplicado sobre a navegacao.

## Composicao do material

- Manter `--od-glass-fill`, `--od-glass-border` e o blur atuais para preservar a paridade de transparencia com os controles Liquid Glass.
- Reativar somente `::after` em `.product-nav-glass-shell` como camada optica exclusiva da sidebar.
- Compor essa camada com `--od-glass-sheen` e um radial azul de baixa opacidade, ancorado no canto inferior esquerdo.
- Reforcar o highlight superior por `box-shadow` inset, sem adicionar uma sombra externa ampla.
- Manter `pointer-events: none`, `border-radius: inherit` e confinamento pelo `contain: paint` existente.
- Nao animar o reflexo. A sidebar e chrome persistente e deve permanecer visualmente estavel.

## Estados e acessibilidade

- Em `prefers-reduced-transparency: reduce`, ocultar a camada de reflexo e conservar o fallback opaco atual.
- Em `prefers-contrast: more`, manter a borda reforcada ja existente e reduzir o glow para nao prejudicar a leitura.
- Icones, textos, focos, targets e navegacao permanecem inalterados.
- A mudanca se aplica somente a sidebar desktop; dock mobile, controles e overlays nao mudam.

## Validacao

- Atualizar o teste Liquid Glass para confirmar que a sidebar possui reflexo proprio sem alterar `backgroundImage`, `borderColor` e `backdropFilter` compartilhados com o controle Personalizar painel.
- Confirmar que `::after` esta ativo na sidebar normal e oculto com transparencia reduzida.
- Rodar o E2E Liquid Glass em desktop e mobile, `git diff --check` e verificar o dev local.

## Fora de escopo

- Alterar dimensoes, raio, layout ou conteudo da sidebar.
- Adicionar movimento, brilho violeta, neon ou novas cores ao design system.
- Mudar a iluminacao de cards, topbar, dock mobile ou controles contextuais.
