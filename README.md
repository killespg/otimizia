# OtimizIA

CRM para empreendedor solo brasileiro: centraliza clientes, vendas em etapas e
lembretes para que a pessoa lembre de chamar cada cliente na hora certa. Além do
CRM geral, atende duas verticais com regras próprias — advocacia e imobiliário.

Next.js (App Router) + TypeScript + Tailwind + Supabase, em produção na Vercel.
O produto é inteiro em português do Brasil.

Toda interface deve ser construída com o design system atual e com as regras
deste documento.

## Rodar localmente

```bash
npm install
copy .env.example .env.local
npm run dev
```

Verificação do serviço:

```text
GET http://localhost:3000/api/health
```

## Comandos

```bash
npm run typecheck
npm test
npm run build
```

Os testes de integração exigem um ambiente Supabase configurado:

```bash
npm run test:integration
```

## Estrutura

Mapa de onde cada coisa mora, pra quem não é programador conseguir se achar.

**`app/`** — cada pasta ali dentro é literalmente um endereço do site (o
Next.js usa a própria estrutura de pastas como as rotas). Não é reorganizada
por conveniência: mexer numa pasta de `app/` muda ou quebra uma página.

- `app/(auth)/` — telas de entrada: login, cadastro, esqueci/nova senha
- `app/(dashboard)/painel/` — a área logada inteira (ver seção "Interface" abaixo)
- `app/api/` — endpoints que o site chama por trás dos panos: webhooks (Stripe,
  WhatsApp/Evolution, Autentique), cron jobs (lembretes, resumo diário,
  sincronização do DataJud) e ações que não são página
- `app/globals.css` — cores, espaçamentos, raios e demais tokens visuais do produto

**`components/`** — as peças visuais (React), agrupadas por assunto:

| Pasta | O que tem |
|---|---|
| `components/design-system/` | Peças reutilizáveis da marca: navegação, cabeçalho, logo, fundos animados |
| `components/landing/` | Seções da página inicial pública (hero, planos, perguntas frequentes) |
| `components/auth/` | Campos e botões das telas de login/cadastro |
| `components/dashboard/` | Widgets de personalização do painel |
| `components/site/` | Avisos do site inteiro (cookies, instalar o app, analytics) |
| `components/tim/` | A interface do Tim, o assistente de IA (chat, voz, anexos) |
| `components/legal/` | Telas e blocos da vertical jurídica (prazos, processos, documentos) |
| `components/real-estate/` | Telas e blocos da vertical imobiliária |
| `components/seller/` | Telas e blocos da vertical de vendedor autônomo |
| `components/ui/` | Botões e utilidades genéricas usadas em mais de uma vertical |

**`lib/`** — a lógica por trás das telas (regras de negócio, cálculos,
integrações com serviços externos), também agrupada por assunto:

| Pasta | O que configura |
|---|---|
| `lib/ai/` | O assistente Tim: conversa, ferramentas que ele pode acionar, voz |
| `lib/supabase/` | Conexão com o banco de dados (Supabase): login, permissões, tipos |
| `lib/crm/` | Negociações, funil de vendas, convites, lembretes |
| `lib/workspace/` | Organizações, workspaces habilitadas, preferências do painel |
| `lib/billing/` | Planos, assinatura e cobrança (Stripe) |
| `lib/account/` | Conta do usuário: exclusão, exportação de dados, conta demo |
| `lib/people/` | Profissões e papéis de cada pessoa na organização |
| `lib/law/` | Regras da vertical jurídica: prazos, processos, consulta ao DataJud |
| `lib/real-estate/` | Regras da vertical imobiliária: match, comissões, qualidade do anúncio |
| `lib/seller/` | Regras da vertical de vendedor autônomo |
| `lib/whatsapp/` | Integração com o WhatsApp via Evolution API |
| `lib/integrations/` | Outros serviços externos: captcha (Turnstile), e-mail, notificações push |
| `lib/consent/` | Consentimento de cookies |
| `lib/utils/` | Funções pequenas e genéricas (formatação, CPF, datas, CSV, compressão de imagem) |

**Outras pastas:**

- `supabase/migrations/` — histórico de mudanças no banco de dados; nunca é
  reorganizado, só cresce
- `scripts/` — scripts de manutenção: importar dados, criar contas de teste,
  gerar chaves
- `public/` e `assets/` — imagens e ícones do site
- `test/` — testes de integração e ponta a ponta do produto (os testes
  unitários ficam junto de cada arquivo em `lib/`, como `arquivo.test.ts`)
- Configurações na raiz (`next.config.mjs`, `tsconfig.json`, `eslint.config.mjs`,
  etc.) — um arquivo por ferramenta, cada um no lugar que a própria ferramenta
  exige; não movemos esses por convenção do ecossistema Next.js/TypeScript

## Interface

A área autenticada vive sob `/painel`, com a navegação montada conforme a
profissão e as workspaces habilitadas para a organização.

- `/painel` — painel operacional, abre no que está atrasado e no que é hoje
- `/painel/contatos`, `/painel/funil`, `/painel/tarefas` — o núcleo do CRM
- `/painel/assistente` — o Tim, sócio-assistente, com voz e anexos
- `/painel/whatsapp` — canal de atendimento pela Evolution API
- `/painel/financeiro`, `/painel/metricas`, `/painel/equipe`
- `/painel/juridico/*` — processos, prazos, documentos e consulta ao DataJud
- `/painel/imoveis/*` — imóveis, visitas, propostas, match e comissões
- `/painel/configuracoes` — preferências, integrações e conta

Fora do painel: a landing em `/`, o fluxo de entrada em `/login` e `/signup`,
as páginas públicas de compartilhamento em `/share/*` e os documentos legais.

## Acordo visual — evitar “cara de IA”

Este acordo é obrigatório para qualquer pessoa ou agente que criar ou alterar
uma tela do OtimizIA. “Deixar bonito” não é o objetivo isolado: a interface deve
parecer um produto profissional, específico para o trabalho do usuário e
coerente com a identidade do OtimizIA.

### Princípios

1. **Produto antes da decoração.** A hierarquia deve nascer das tarefas, dados e
   decisões reais do usuário. Elementos não podem existir apenas para preencher
   espaço ou causar impacto visual.
2. **Usar somente o design system atual.** Não recuperar componentes, CSS,
   layouts ou convenções do frontend antigo. Uma referência externa pode
   orientar estrutura, nunca substituir nossa linguagem visual.
3. **Identidade sem ruído.** Roxo, marca e cápsulas animadas são elementos de
   identidade. Devem estar presentes, mas não transformar cada superfície em
   gradiente, brilho ou cartão promocional.
4. **Denso não significa comprimido.** Informação operacional pode ser compacta,
   porém precisa de tipografia legível, altura de linha, margens e separação
   suficientes. Não tentar colocar toda a aplicação na primeira dobra.
5. **O domínio decide a interface.** No jurídico, processos, prazos, audiências,
   movimentações, responsáveis e recebíveis precisam ter significado correto.
   Não usar métricas genéricas apenas porque são comuns em dashboards.

### Sidebar acordada

- Manter navegação hierárquica com grupo principal expansível.
- Subabas devem ser recuadas e conectadas por um trilho vertical.
- O item ativo usa marcador e contraste local dentro do grupo.
- Módulos recolhíveis usam seta e preservam a hierarquia.
- Não achatar a navegação em uma lista simples sem autorização explícita.
- Não envolver o seletor do escritório em um cartão ou pill decorativo.

### Cápsulas animadas

- As cápsulas são parte da identidade visual e não devem ser removidas.
- A animação deve ser lenta, contínua e respeitar `prefers-reduced-motion`.
- Elas ficam no fundo, sem prejudicar contraste, leitura ou interação.
- Devem continuar visíveis; reduzir sua opacidade até desaparecer também quebra
  a identidade.

### Bordas, cartões e botões

- Bordas servem para estrutura: separar regiões, colunas, tabelas e estados.
- Não colocar cada seletor, ação ou informação dentro de uma caixa arredondada.
- Evitar sequências de cards iguais para métricas simples.
- Evitar pills, badges e botões contornados quando texto, alinhamento ou uma
  divisória resolvem a hierarquia.
- Ações primárias podem ter preenchimento da marca, com raio discreto. Ações
  secundárias devem ser mais planas e silenciosas.
- Cantos arredondados não podem ser o principal recurso de composição.

### Padrões proibidos

- Saudação gigante como hero de dashboard.
- Fileira de cards genéricos com ícone, número e variação percentual.
- Gradientes e glows aplicados indiscriminadamente.
- Blocos promocionais de “assistente” ocupando a navegação.
- Texto genérico como “Aqui está o resumo do seu dia” quando não agrega contexto.
- Gráficos decorativos sem decisão ou ação associada.
- Excesso de badges coloridos e status inventados.
- Bordas arredondadas em volta de todos os controles.
- Tipografia pequena e espaçamento reduzido para forçar tudo acima da dobra.

### Checklist antes de considerar uma tela pronta

- [ ] A tela parece um produto específico em uso, e não um template de dashboard?
- [ ] Cada bloco ajuda o usuário a decidir ou executar algo?
- [ ] A sidebar hierárquica acordada foi preservada?
- [ ] As cápsulas estão visíveis e não atrapalham o conteúdo?
- [ ] As bordas organizam a estrutura em vez de decorar componentes?
- [ ] Há poucos cards, pills, badges, gradientes e glows?
- [ ] Tipografia, linhas e margens têm espaço suficiente em desktop e mobile?
- [ ] O conteúdo e os valores representam corretamente o domínio do negócio?
- [ ] A tela foi validada renderizada, não apenas pelo código?
- [ ] `npm run typecheck`, `npm run lint`, testes relevantes e build passaram?

Se uma alteração contrariar este acordo, ela precisa ser discutida explicitamente
antes de ser implementada. Não reinterpretar silenciosamente uma decisão visual
já aprovada.

## Deploy

`useotimizia.com`, na Vercel, a partir da branch de produção. Não há staging: o
push na branch de produção vai direto pro ar. O runbook obrigatório antes de
qualquer push que vá pra produção está em [docs/DEPLOY_SAFETY.md](docs/DEPLOY_SAFETY.md).

As tarefas agendadas (sincronização do DataJud, lembretes, resumo diário) são
crons da Vercel declarados em `vercel.json` e autenticados por `CRON_SECRET`.
