# Handoff — sessão de design system, acesso e landing

Olá! Este documento resume uma sessão longa de trabalho no `headless-base`, para
quem for continuar daqui — humano ou agente. A intenção é economizar o seu tempo
de arqueologia e, principalmente, evitar que decisões sejam desfeitas sem
querer, porque várias delas contrariam o que o código parecia dizer antes.

Tudo já está commitado e publicado em `killespg/otimizia`, branch
`headless-base`. Estado ao final: `tsc --noEmit` limpo, ESLint com 0 erros
(26 avisos pré-existentes), 229 testes passando.

---

## 1. As correções que mais importam

São bugs sistêmicos: se você mexer nessas áreas sem saber deles, vai reintroduzi-los.

### 1.1. Duas regras de CSS estavam anulando utilities do Tailwind

`app/globals.css` tinha dois resets **fora de `@layer`**. No Tailwind 4, CSS sem
layer vence qualquer layer, inclusive `@layer utilities`. O efeito era silencioso
e amplo:

| Regra | O que ela anulava |
|---|---|
| `a { color: inherit }` | toda classe `text-*` de cor aplicada a `<a>`, no app inteiro |
| `button, input, select, textarea { font: inherit }` | toda classe de tamanho e peso de fonte nesses elementos (`font` é atalho) |

Medido no navegador: um `<button class="text-[11px] font-semibold">` computava
`16px/400`, enquanto o mesmo `<span>` computava `11px/600`.

Os dois foram para dentro de `@layer base`. **Se precisar adicionar um reset
global, coloque-o em `@layer base`** — senão ele volta a ganhar das utilities.

### 1.2. A área jurídica estava aberta para qualquer conta

`canViewLegal(role, isAdmin)` libera qualquer `isAdmin`, e as páginas passavam
`orgRole === "admin"`. Como todo cliente é admin da própria organização,
**qualquer conta abria `/painel/juridico`**. Uma conta de corretora via o
dashboard jurídico inteiro dentro do shell imobiliário.

Foi introduzido um primeiro fator explícito, `hasLegalWorkspace` em
`lib/law-office.ts`, aplicado num layout único em `app/(dashboard)/painel/juridico/`
que cobre as nove rotas aninhadas. Duas rotas de API também foram fechadas —
`watched-processes/mark-seen` não tinha gate de workspace nenhum.

A checagem usa `profession_types` (plural), não a workspace ativa, para não
quebrar quem é advogado **e** corretor. Cobertura em `lib/law-office.test.ts`.

### 1.3. Profissões incompletas saíram do cadastro

Das nove selecionáveis, só três têm shell e painel próprios: vendedor autônomo,
advocacia e corretor. As outras seis foram retiradas do cadastro.

**O cuidado aqui é importante:** `normalizeProfession` validava contra
`PROFESSION_OPTIONS` e cai em `autonomous_seller` quando não reconhece. Filtrar
aquela lista teria rebaixado todo usuário existente de profissão desativada para
vendedor autônomo — troca de workspace silenciosa, na primeira leitura do perfil.

Por isso os papéis foram separados em `lib/professions.ts`:

- `PROFESSION_OPTIONS` — o que aparece para escolher
- `ASSIGNABLE_PROFESSION_OPTIONS` — toda profissão válida, usada por
  `normalizeProfession` e pelo seletor de workspace

Para reativar uma profissão, basta adicioná-la ao `SIGNUP_ENABLED`.

---

## 2. Sistema visual

### 2.1. Escada de superfícies por valor

Os quatro planos escuros ficavam em L 0.163 / 0.195 / 0.212 / 0.234 (OKLCH) —
passos de 0.018 a 0.031, abaixo do que o olho separa. Sem contraste de valor, a
estrutura da tela dependia só do matiz roxo.

Agora o passo é ~0.045: `--od-sidebar #0b0a0f`, `--od-bg #151419`,
`--od-muted-surface #1f1e24`, `--od-surface #2a292f`. A rampa de texto foi
recalculada junto, porque clarear as superfícies derrubava o contraste do texto
silencioso. **Pior caso da rampa hoje: 4.53 sobre a superfície mais clara** —
se mexer nos planos, refaça essa conta.

### 2.2. Acento devolvido ao papel de ação

Havia 189 usos de `text-violet-300`/`violet-200` como decoração contra 12 de
`bg-od-accent` como ação — razão de 16 para 1. Pior: a lavanda decorativa tem
L 0.811, mais clara que o texto secundário (0.68) e que o próprio CTA (0.606).
A hierarquia estava invertida.

Hoje há **zero ocorrências de `violet-*` da paleta do Tailwind** em `app`,
`components` e `lib`. O acento sobrou em ação, seleção, foco e nas poucas
superfícies tingidas que o DESIGN.md permite. O mapeamento usado, caso precise
aplicar em código novo:

- metadado, eyebrow, ícone decorativo → `od-text-3`
- ênfase dentro de frase → `od-text` (o peso carrega)
- link de seção e hover → `od-text-2` / `od-text`
- chip de ícone → tint neutro
- ação, seleção, foco, item ativo → `od-accent`

### 2.3. Estrutura por papel, não por workspace

O workspace imobiliário tinha uma decisão anterior de achatar tudo, com a classe
`.real-estate-flat-section` exigida por teste em dez telas. Sem nenhuma
superfície, módulo acionável ficava "voando" sobre o canvas.

A regra passou a ser por papel: módulo com ação própria dentro (formulário, lista
com botão) usa `.panel`; cabeçalho, filtro, KPI e faixa de consulta continuam
abertos. As duas classes convivem, e o guard em
`lib/frontend-route-parity.test.ts` cobre as duas pontas.

Vale notar que `.panel` já existia no `globals.css` — prefira-a a escrever
`rounded-xl border bg-od-surface` à mão.

### 2.4. Navegação unificada

As quatro navegações tinham a mesma lógica duplicada e já divergiam entre si
(altura 36 vs 44px, fonte 13 vs 14, raio 4 vs 6). Foram extraídas para
`components/design-system/product-nav-groups.tsx`, que concentra grupos
recolhíveis, submenu e itens fixados. Cada vertical só declara seus grupos e um
`namespace`, que prefixa as chaves de `localStorage` — a preferência de uma
vertical não vaza para outra.

---

## 3. Landing

A landing **não existia** no headless: `app/page.tsx` tinha cinco linhas e só
redirecionava para `/painel`. Foi trazida do catálogo em `otidesignsystem-main` e
depois retrabalhada bastante.

Estrutura atual, em faixas de largura total com superfície alternada:

1. Hero (faixa própria, sem moldura)
2. Prova social — segmentos atendidos
3. **Recursos** — três abas por profissão, 15 itens cada, em lista com ícones
4. **O painel** — preview navegável do produto
5. **Sócio-assistente**
6. **Planos** — R$ 39,90/mês + R$ 10 por pessoa extra
7. **Perguntas frequentes**
8. CTA e rodapé

Pontos que merecem atenção:

- **O preview em `components/landing/dashboard-preview.tsx` é um mock desenhado
  à mão.** Ele espelha o painel real hoje, mas não acompanha o produto: se você
  mexer no dashboard, a landing continua mostrando a versão antiga e nada avisa.
  Ficou como dívida conhecida; a sugestão em aberto é um guard ligando os rótulos
  do mock às telas reais.
- **Conteúdo é verificável, não promessa.** As features saíram do inventário de
  rotas e integrações (DataJud, Evolution, Autentique, feed `.ics`, push,
  `parse-filters`), e o preço saiu de `/upgrade`. O marquee mostrava nomes de
  empresa inventados sugerindo clientes que não existem; foi trocado pelos
  segmentos atendidos. Por favor, mantenha esse critério.
- **`components/landing/` é registro `brand`**, separado de `design-system/` de
  propósito: o DESIGN.md pede que hero animado, nav flutuante e afins não
  influenciem tokens nem componentes de produto.
- **`Reveal` começa em opacidade 0**, então com JavaScript desativado o bloco não
  aparece. Hero, navegação, preço e as duas ações ficaram fora dele de propósito.

---

## 4. Armadilhas encontradas no caminho

Custaram tempo. Deixo registrado para não custar de novo:

- **Variantes responsivas nomeadas e arbitrárias não se misturam.**
  `2xl:max-w-[1480px]` vencia `min-[1800px]:max-w-[1720px]` numa tela de 2560,
  porque a ordem emitida não segue o valor do breakpoint. Use um tipo só por
  propriedade.
- **Classe montada em runtime não existe para o Tailwind.** `size-${n}` nunca
  gera CSS; o compilador só enxerga literais.
- **`position: sticky` morre com `overflow-hidden` em qualquer ancestral.**
- **`ShaderBackground` é `fixed inset-0`** — usá-lo dentro de um card faz ele
  cobrir a página inteira.
- **Ícone do lucide é função**, e função não atravessa a fronteira
  servidor → cliente. Passar `icon` como prop de um server component derruba a
  rota; declare os itens num wrapper `"use client"`.
- **Efeito colateral dentro de updater de `setState`** dispara duas vezes em
  StrictMode. Calcule fora e chame o setter com o valor.
- **Reescrever arquivos com Python no Windows converte LF em CRLF**, o que quebrou
  um teste que compara com `\n`. Se automatizar edições, normalize os fins de
  linha depois.

---

## 5. Em aberto

Sugestões, sem urgência:

1. O default branch do repositório ainda é `claude/saas-creation-marketing-a49v4f`
   (o frontend antigo). Trocar para `headless-base` é decisão do dono, feita na
   UI do GitHub.
2. Guard ligando o mock da landing às telas reais (seção 3).
3. `AppSplash` usa `z-[999]` e `pointer-events: auto`, enquanto o `globals.css`
   define uma escala semântica (`--z-dropdown` … `--z-tooltip`) que nunca foi
   adotada.
4. Cobertura visual desigual: as telas verificadas no navegador foram as que a
   conta demo de corretora alcança. Vendedor, jurídico e navegação genérica
   passaram só por verificação estática.
5. `DESIGN.md` vive em `otidesignsystem-main`, não aqui. Algumas decisões desta
   sessão (poeira de fundo como camada ambiente, estrutura por papel) ainda não
   foram registradas lá.

Bom trabalho e obrigado por continuar daqui.
