import Link from "next/link";
import { PendingButton } from "@/components/ui/PendingButton";
import { PropertyAddressFields } from "@/components/real-estate/PropertyAddressFields";
import { Field, FormSection, Select, TransactionAndPriceFields } from "@/components/real-estate/PropertyForm";
import { RealEstatePageHeader } from "@/components/real-estate/real-estate-ui";
import { getActiveOrgId } from "@/lib/workspace/org";
import { isRealEstateV2Enabled, REAL_ESTATE_PROPERTY_TYPES } from "@/lib/real-estate/real-estate";
import { createClient } from "@/lib/supabase/server";
import type { Contact } from "@/lib/supabase/types";
import { IconPlus } from "../../icons";
import { createProperty } from "../actions";

export default async function NovoImovelPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const orgId = await getActiveOrgId(supabase, user!.id);
  const [{ data: contacts }, { data: org }] = await Promise.all([
    supabase
      .from("contacts")
      .select("id, name")
      .eq("org_id", orgId)
      .eq("workspace_key", "real_estate_broker")
      .order("name"),
    supabase.from("organizations").select("real_estate_v2_enabled").eq("id", orgId).maybeSingle(),
  ]);
  const contactList = (contacts ?? []) as Pick<Contact, "id" | "name">[];
  // RE-004: campos de proprietário/captação (Fase 0) só aparecem pra quem
  // já foi liberado — rollout progressivo por organização.
  const v2Enabled = isRealEstateV2Enabled(org);

  return (
    <div className="max-w-5xl space-y-6">
      <RealEstatePageHeader eyebrow="Imobiliário / Carteira" title="Novo imóvel" description="Cadastre os dados principais — fotos e vitrine você adiciona depois de salvar." />

      <section className="panel p-5 sm:p-6">
        <form action={createProperty} className="divide-y divide-line">
          <input type="hidden" name="status" value="ativo" />

          <FormSection
            title="Sobre o imóvel"
            description="O título é a primeira coisa que o cliente vê na vitrine e na listagem — capriche nele."
            className="pb-5"
          >
            <Field name="title" label="Título" required placeholder="Ex.: Apartamento 3 quartos - Zona Sul" className="md:col-span-2" />
            <Select name="property_type" label="Tipo de imóvel" required options={REAL_ESTATE_PROPERTY_TYPES} />
          </FormSection>

          <FormSection
            title="Transação e preço"
            description="Clique em Venda, Aluguel ou Ambos — só o(s) campo(s) de preço correspondente(s) aparece(m) abaixo."
            className="py-5"
          >
            <TransactionAndPriceFields defaultTransactionType="venda" />
          </FormSection>

          <FormSection
            title="Características"
            description="Quartos, banheiros, vagas e área aparecem na listagem e na vitrine, ajudando o cliente a comparar imóveis."
            className="py-5"
          >
            <Field name="bedrooms" label="Quartos" type="number" />
            <Field name="bathrooms" label="Banheiros" type="number" />
            <Field name="parking_spots" label="Vagas" type="number" />
            <Field name="area_m2" label="Área (m²)" />
          </FormSection>

          <FormSection
            title="Endereço"
            description={
              v2Enabled
                ? "Digite o CEP e o resto se preenche sozinho. Bairro e cidade aparecem na vitrine pública; rua e número ficam só na sua carteira."
                : "Bairro e cidade aparecem na vitrine pública; rua e número ficam só na sua carteira — o cliente nunca vê o endereço exato."
            }
            className="py-5"
          >
            {v2Enabled ? (
              <PropertyAddressFields defaultValues={{}} />
            ) : (
              <>
                <Field name="address_street" label="Rua" className="md:col-span-2" />
                <Field name="address_number" label="Número" />
                <Field name="address_neighborhood" label="Bairro" />
                <Field name="address_city" label="Cidade" />
                <Field name="address_state" label="UF" placeholder="Ex.: SP" />
                <Field name="address_zip" label="CEP" placeholder="Ex.: 01310-000" hint="Opcional — ajuda a localizar o imóvel, mas não aparece na vitrine." />
              </>
            )}
          </FormSection>

          {v2Enabled && (
            <FormSection
              title="Captação"
              description="Ajuda a lembrar de onde veio o imóvel e quem é o dono — não aparece na vitrine pro cliente."
              className="py-5"
            >
              <label className="block">
                <span className="label">Proprietário (opcional)</span>
                <select name="owner_contact_id" defaultValue="" className="field mt-1.5">
                  <option value="">Sem vincular</option>
                  {contactList.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name}
                    </option>
                  ))}
                </select>
              </label>
              <Field name="capture_source" label="Origem da captação" placeholder="Ex.: Indicação, portal, prospecção" />
            </FormSection>
          )}

          <FormSection
            title="Descrição"
            description="Esse texto some junto com as fotos quando você compartilhar o imóvel em uma vitrine."
            className="pt-5"
          >
            <label className="block md:col-span-2">
              <span className="label">Texto para a vitrine (opcional)</span>
              <textarea id="description" name="description" maxLength={2000} rows={4} className="field mt-1.5 min-h-24 resize-y" />
            </label>
          </FormSection>

          <div className="pt-5">
            <PendingButton className="btn" pendingLabel="Salvando">
              <IconPlus className="h-4 w-4" />
              Salvar imóvel
            </PendingButton>
          </div>
        </form>
      </section>

      <Link href="/imoveis" className="nav-item inline-block text-sm font-semibold text-brand-700 hover:underline">
        Voltar para a carteira
      </Link>
    </div>
  );
}
