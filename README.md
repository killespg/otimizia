# OtimizIA — nova base

Base local reconstruída do OtimizIA. O backend original foi preservado e o
frontend anterior foi removido. Toda interface adicionada a partir daqui deve
ser construída exclusivamente com o design system atual e com as regras deste
documento.

## O que foi preservado

- Rotas HTTP em `app/api/`.
- Assistente de IA e ferramentas do CRM em `lib/ai/`.
- Integrações com Supabase, Stripe, Resend, OpenAI, Anthropic, Evolution,
  DataJud e Autentique.
- Webhooks, tarefas agendadas, relatórios e feed de calendário.
- Regras de negócio dos workspaces jurídico, imobiliário e CRM geral.
- Migrations, RLS e configuração do Supabase em `supabase/`.
- Scripts de importação e seed em `scripts/`.
- Testes unitários e de integração que não dependem da interface.

## O que foi removido da origem

- Páginas públicas, autenticação visual e área autenticada.
- Componentes React de interface e hooks exclusivos do navegador.
- CSS, componentes, imagens e padrões visuais do frontend anterior.
- Projeto Android/Capacitor.
- Testes end-to-end da interface e Playwright.

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

```text
app/api/             endpoints, webhooks e cron jobs
lib/                 domínio, integrações e serviços
lib/ai/              assistente e ferramentas operacionais
lib/supabase/        clientes server/admin, middleware e tipos
supabase/migrations/ schema, funções e políticas RLS
scripts/             importadores e seeds
test/                testes de integração do backend
```

## Interface atual

A nova interface começa pela dashboard jurídica em:

```text
GET /dashboard-juridico
```

### Módulos do produto jurídico

- `/dashboard-juridico` — visão operacional do escritório
- `/dashboard-juridico/processos` — carteira processual e detalhe do caso
- `/dashboard-juridico/clientes` — clientes e relacionamento
- `/dashboard-juridico/agenda` — audiências, compromissos e prazos
- `/dashboard-juridico/documentos` — documentos, revisão e assinatura
- `/dashboard-juridico/financeiro` — honorários, recebíveis, pagamentos e despesas
- `/dashboard-juridico/equipe` — equipe, cargos e escopo de acesso
- `/dashboard-juridico/socio-assistente` — assistência contextual do escritório
- `/dashboard-juridico/configuracoes` — preferências e integrações

Ela é uma implementação nova sobre o backend preservado. Não reutilizar telas,
componentes ou decisões visuais do frontend removido.

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

## Observação de arquitetura

O projeto continua usando Next.js como servidor HTTP para manter as rotas já
existentes e hospedar a nova interface. O frontend novo deve evoluir de forma
gradual, sem misturar novamente a base visual antiga com os serviços preservados.

## Pendência herdada

O clone ainda usa Next.js `14.2.15`, como o repositório de origem. O
`npm audit --omit=dev` recomenda uma atualização principal do Next para tratar
vulnerabilidades conhecidas. Essa migração deve ser feita em uma etapa própria,
porque altera APIs do framework e merece validação de todas as rotas.
