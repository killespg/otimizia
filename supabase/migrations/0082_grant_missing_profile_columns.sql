-- A 0072 trocou o UPDATE aberto em `profiles` e em `organizations` por uma
-- allowlist de colunas. A allowlist foi montada a partir do que o produto
-- gravava naquele dia, e colunas criadas antes dela — mas nunca listadas —
-- ficaram de fora sem que nada quebrasse no build: o erro só aparece em
-- runtime, como 42501 ("permission denied for table ..."), quando alguém
-- clica no botão. Foi assim com `avatar_path` na 0081, e esta migration fecha
-- os três casos restantes encontrados varrendo toda escrita feita com o client
-- do usuário.
--
-- Os grants por coluna são cumulativos: nenhum `revoke` aqui, porque isso
-- apagaria a allowlist inteira e derrubaria o resto do painel. Rodar esta
-- migration duas vezes é inofensivo — `grant` é idempotente por natureza.

-- Token do feed .ics da agenda. `regenerateCalendarFeed`
-- (app/(dashboard)/painel/configuracoes/notifications-actions.ts) grava um UUID
-- novo com o client do usuário quando a pessoa pede "Gerar novo link", para
-- revogar um endereço de calendário que vazou. Sem o grant, o botão falha para
-- todo mundo. Não é campo de cobrança nem de identidade: a coluna é `unique`,
-- a RLS de `profiles` restringe o UPDATE à própria linha (`auth.uid() = id`) e
-- o valor só governa o acesso ao calendário de quem o gerou.
grant update (calendar_ics_token) on public.profiles to authenticated;

-- Página pública do corretor (colunas criadas na 0064, antes da 0072).
-- `togglePublicPage` liga/desliga a vitrine e `regeneratePublicPageToken`
-- revoga o link antigo — ambas em
-- app/(dashboard)/painel/imoveis/advanced-actions.ts, ambas com o client do
-- usuário. São configuração de produto da organização, não assinatura: a RLS
-- `organizations_update_admin_editable` já exige `is_org_admin`, e a action
-- ainda passa por `requireRealEstate`, que confere workspace e cargo.
grant update (
  real_estate_public_page_enabled,
  real_estate_public_page_token
) on public.organizations to authenticated;

-- Deliberadamente NÃO entram aqui, e nenhuma coluna nova deve entrar sem o
-- mesmo escrutínio: `plan`, `plan_status`, `trial_ends_at`, `stripe_*`
-- (assinatura — só o webhook e as rotas de billing escrevem, com service role)
-- e `cpf`, `terms_accepted_at`, `is_admin`, `welcome_email_sent_at`
-- (identidade e estado de servidor). Quando o produto precisar gravar um
-- desses a partir do navegador, o caminho é uma função `security definer` que
-- valida a transição, como `public.complete_oauth_profile` faz para o CPF na
-- 0078 — não reabrir o grant.
