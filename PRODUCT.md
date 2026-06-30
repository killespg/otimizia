# Product

## Register

product

## Users

Empreendedores individuais brasileiros — autônomos, freelancers e donos de
pequenos negócios que vendem por conta própria (consultores, prestadores de
serviço, profissionais liberais, pequenos comércios).

Não são vendedores de time grande nem usuários de CRM corporativo. Muitos estão
saindo da planilha e do WhatsApp espalhado, e podem nunca ter usado um CRM. Usam
o produto **em trânsito, no celular**, entre atendimentos — abrem para registrar
um cliente, mover uma venda ou checar quem precisa de resposta hoje.

**Job to be done:** "Lembra de mim na hora certa e me mostra com clareza o que
fazer a seguir, sem eu ter que aprender uma ferramenta complicada."

## Product Purpose

OtimizIA é um CRM simples que centraliza clientes, vendas em etapas e lembretes
para que o empreendedor solo **lembre de chamar cada cliente na hora certa**.

O sucesso se mede no uso diário: o usuário abre o app, vê imediatamente os
clientes de hoje e os atrasados, age, e fecha. Cada tela existe para reduzir o
risco de "esquecer de chamar o cliente". O painel, as vendas e as conversas
servem a esse núcleo — não o contrário.

Stack: Next.js (App Router) + TypeScript + Tailwind + Supabase (Postgres + Auth,
com RLS por usuário). Idioma do produto: **português do Brasil**.

## Brand Personality

Amigável e acolhedor, mas profissional. Tom de **fintech brasileira humana**
(referência de sentimento: Nubank) — próximo, encorajador, com copy direta em
português coloquial e claro, e cor usada com propósito. O produto deve fazer o
autônomo se sentir no controle e acompanhado, não auditado.

Três palavras: **acolhedor · claro · confiável.**

Voz: parceiro de negócio, não software corporativo. Frases curtas, segunda
pessoa ("você"), zero jargão de vendas enterprise.

## Anti-references

- **CRM corporativo (Salesforce e similares):** pesado, mil abas, configuração
  infinita, feito para times. Intimida o autônomo — o oposto do objetivo.
- **Planilha / Excel:** frio, genérico, sem orientação. É exatamente do que o
  usuário está fugindo; o produto deve guiar, não apresentar uma grade vazia.
- **Dashboard "IA genérico":** gradientes coloridos em tudo, vidro decorativo
  (glassmorphism por padrão), cards idênticos repetidos, o template "número
  gigante + label". O visual atual herda parte disso e deve ser **repensado**
  para superfícies sólidas, limpas e legíveis — efeitos guardados para momentos
  pontuais, nunca como base.
- **App infantil/exagerado:** excesso de cor, emojis e animação. "Amigável" não
  pode descambar em "não-profissional"; o autônomo precisa confiar a carteira de
  clientes a ele.

## Design Principles

1. **O retorno é o herói.** Toda tela puxa o usuário para "quem eu preciso
   chamar hoje?". O que está atrasado/para hoje tem o maior peso visual; o resto
   apoia.
2. **Guiar, nunca apresentar uma grade vazia.** Estados vazios ensinam o próximo
   passo (cadastre o primeiro cliente, crie a primeira venda). Fugir da
   sensação de planilha.
3. **Calma sob densidade.** É uma ferramenta de trabalho repetido — clareza,
   contraste forte e hierarquia previsível vencem o efeito visual. Familiaridade
   é uma vantagem, não um defeito.
4. **Acolhimento vem da copy e do uso de cor com propósito, não de decoração.**
   O tom humano mora nas palavras e em cor aplicada com intenção (status, ação,
   estado), não em gradientes e vidro de fundo.
5. **Mobile é o caso principal, não a adaptação.** Pensar o toque, a leitura sob
   luz variável e a navegação com o polegar primeiro; o desktop é o caso
   confortável.

## Accessibility & Inclusion

- **Mobile-first é a prioridade declarada.** Alvos de toque ≥44px, layouts que
  funcionam no celular em trânsito, leitura confortável sob luz forte (logo,
  contraste real importa muito).
- **Contraste:** mirar WCAG AA — corpo de texto ≥4.5:1, texto grande ≥3:1. O
  visual atual (texto cinza sobre vidro translúcido) viola isso em vários
  pontos e deve ser corrigido na migração para superfícies sólidas.
- **Status da venda não deve depender só de cor** (ganho/perdido/etc.): usar
  rótulo + ícone/forma junto da cor (apoio a daltonismo).
- **prefers-reduced-motion** já é respeitado em `globals.css`; manter a
  alternativa de crossfade/sem deslocamento em qualquer animação nova.
