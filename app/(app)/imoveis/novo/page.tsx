import Link from "next/link";
import { PendingButton } from "@/components/PendingButton";
import { getActiveOrgId } from "@/lib/org";
import { isRealEstateV2Enabled, REAL_ESTATE_PROPERTY_TYPES } from "@/lib/real-estate";
import { createClient } from "@/lib/supabase/server";
import type { Contact } from "@/lib/supabase/types";
import { IconPlus } from "../../icons";
import { createProperty } from "../actions";

export default async function NovoImovelPage() {
  const supabase = createClient();
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
    <div className="max-w-3xl space-y-4 sm:space-y-5">
      <header className="enter">
        <p className="text-sm font-black text-brand-700">Carteira</p>
        <h1 className="mt-2 text-[clamp(1.55rem,6vw,2.6rem)] font-black leading-[1.02] tracking-[-0.04em] text-ink">
          Novo imóvel
        </h1>
        <p className="mt-2 text-sm font-medium leading-relaxed text-ink-soft">
          Cadastre os dados principais — fotos e vitrine você adiciona depois de salvar.
        </p>
      </header>

      <section className="panel p-5 sm:p-6">
        <form action={createProperty} className="grid gap-3 md:grid-cols-2">
          <Field name="title" label="Título" required placeholder="Ex.: Apartamento 3 quartos - Zona Sul" className="md:col-span-2" />
          <Select name="property_type" label="Tipo de imóvel" required options={REAL_ESTATE_PROPERTY_TYPES} />
          <Select
            name="transaction_type"
            label="Transação"
            required
            options={[
              { value: "venda", label: "Venda" },
              { value: "aluguel", label: "Aluguel" },
              { value: "venda_aluguel", label: "Venda ou aluguel" },
            ]}
          />
          <input type="hidden" name="status" value="ativo" />
          <Field name="price" label="Preço de venda (R$)" placeholder="Ex.: 450000" />
          <Field name="rent_price" label="Preço de aluguel (R$)" placeholder="Ex.: 2500" />
          <Field name="condo_fee" label="Condomínio (R$)" />
          <Field name="iptu" label="IPTU (R$)" />
          <Field name="bedrooms" label="Quartos" type="number" />
          <Field name="bathrooms" label="Banheiros" type="number" />
          <Field name="parking_spots" label="Vagas" type="number" />
          <Field name="area_m2" label="Área (m²)" />
          <Field name="address_street" label="Rua" />
          <Field name="address_number" label="Número" />
          <Field name="address_neighborhood" label="Bairro" />
          <Field name="address_city" label="Cidade" />
          <Field name="address_state" label="UF" placeholder="Ex.: SP" />
          <Field name="address_zip" label="CEP" />
          {v2Enabled && (
            <>
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
            </>
          )}
          <div className="md:col-span-2">
            <label className="label" htmlFor="description">
              Descrição
            </label>
            <textarea id="description" name="description" maxLength={2000} rows={4} className="field mt-1.5 min-h-24 resize-y" />
          </div>
          <div className="md:col-span-2">
            <PendingButton className="btn" pendingLabel="Salvando">
              <IconPlus className="h-4 w-4" />
              Salvar imóvel
            </PendingButton>
          </div>
        </form>
      </section>

      <Link href="/imoveis" className="nav-item inline-block text-sm font-black text-brand-700 hover:underline">
        Voltar para a carteira
      </Link>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  required = false,
  placeholder,
  className = "",
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={"block " + className}>
      <span className="label">
        {label}
        {required && (
          <>
            <span className="ml-1 text-brand-700">*</span>
            <span className="sr-only"> obrigatório</span>
          </>
        )}
      </span>
      <input name={name} required={required} type={type} placeholder={placeholder} className="field mt-1.5" />
    </label>
  );
}

function Select({
  name,
  label,
  options,
  required = false,
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <select name={name} required={required} className="field mt-1.5" defaultValue="">
        <option value="" disabled>
          Selecione
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
