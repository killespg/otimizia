"use client";

import { useState } from "react";

type Address = {
  address_zip: string;
  address_street: string;
  address_number: string;
  address_neighborhood: string;
  address_city: string;
  address_state: string;
  latitude: string;
  longitude: string;
};

// RE-7xx (Fase 7): autofill de endereço por CEP via ViaCEP (viacep.com.br)
// — API pública brasileira, sem chave/credencial, por isso é a única peça
// de "geocodificação" que deu pra fazer sem depender de Google Maps/
// Mapbox (que exigiriam credencial que este ambiente não tem). ViaCEP
// devolve rua/bairro/cidade/UF, não latitude/longitude — por isso
// coordenadas continuam um campo manual (ver decisão no commit).
export function PropertyAddressFields({ defaultValues }: { defaultValues: Partial<Address> }) {
  const [address, setAddress] = useState<Address>({
    address_zip: defaultValues.address_zip ?? "",
    address_street: defaultValues.address_street ?? "",
    address_number: defaultValues.address_number ?? "",
    address_neighborhood: defaultValues.address_neighborhood ?? "",
    address_city: defaultValues.address_city ?? "",
    address_state: defaultValues.address_state ?? "",
    latitude: defaultValues.latitude ?? "",
    longitude: defaultValues.longitude ?? "",
  });
  const [loadingCep, setLoadingCep] = useState(false);

  async function lookupCep(rawCep: string) {
    const cep = rawCep.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setAddress((prev) => ({
          ...prev,
          address_street: data.logradouro || prev.address_street,
          address_neighborhood: data.bairro || prev.address_neighborhood,
          address_city: data.localidade || prev.address_city,
          address_state: data.uf || prev.address_state,
        }));
      }
    } catch {
      // Sem internet ou ViaCEP fora do ar — usuário preenche à mão, sem bloquear o formulário.
    } finally {
      setLoadingCep(false);
    }
  }

  return (
    <>
      <label className="block">
        <span className="label">CEP {loadingCep && <span className="text-ink-muted">(buscando...)</span>}</span>
        <input
          name="address_zip"
          value={address.address_zip}
          onChange={(e) => setAddress((prev) => ({ ...prev, address_zip: e.target.value }))}
          onBlur={(e) => lookupCep(e.target.value)}
          className="field mt-1.5"
        />
      </label>
      <label className="block">
        <span className="label">Rua</span>
        <input name="address_street" value={address.address_street} onChange={(e) => setAddress((prev) => ({ ...prev, address_street: e.target.value }))} className="field mt-1.5" />
      </label>
      <label className="block">
        <span className="label">Número</span>
        <input name="address_number" value={address.address_number} onChange={(e) => setAddress((prev) => ({ ...prev, address_number: e.target.value }))} className="field mt-1.5" />
      </label>
      <label className="block">
        <span className="label">Bairro</span>
        <input name="address_neighborhood" value={address.address_neighborhood} onChange={(e) => setAddress((prev) => ({ ...prev, address_neighborhood: e.target.value }))} className="field mt-1.5" />
      </label>
      <label className="block">
        <span className="label">Cidade</span>
        <input name="address_city" value={address.address_city} onChange={(e) => setAddress((prev) => ({ ...prev, address_city: e.target.value }))} className="field mt-1.5" />
      </label>
      <label className="block">
        <span className="label">UF</span>
        <input name="address_state" value={address.address_state} onChange={(e) => setAddress((prev) => ({ ...prev, address_state: e.target.value }))} className="field mt-1.5" maxLength={2} />
      </label>
      <label className="block">
        <span className="label">Latitude (opcional)</span>
        <input name="latitude" value={address.latitude} onChange={(e) => setAddress((prev) => ({ ...prev, latitude: e.target.value }))} placeholder="Ex.: -23.561684" className="field mt-1.5" />
      </label>
      <label className="block">
        <span className="label">Longitude (opcional)</span>
        <input name="longitude" value={address.longitude} onChange={(e) => setAddress((prev) => ({ ...prev, longitude: e.target.value }))} placeholder="Ex.: -46.655981" className="field mt-1.5" />
      </label>
    </>
  );
}
