-- Mesmo padrão de 0008 (profiles): impede que qualquer membro altere direto
-- os campos de cobrança/plano da organização via anon/authenticated + JWT.
-- Billing só muda por rotas server (checkout, portal, webhook) com o admin
-- client. Edição normal fica limitada ao nome da organização.
revoke update on public.organizations from anon, authenticated;
grant update (name) on public.organizations to authenticated;

drop policy if exists "organizations_update_admin" on public.organizations;
create policy "organizations_update_admin_editable" on public.organizations
  for update using (public.is_org_admin(id)) with check (public.is_org_admin(id));
