"use client";

import { useEffect, useState } from "react";

// Lê o segredo do fragmento da URL (#new_key=.../#new_secret=...) só no
// navegador — o fragmento nunca é enviado ao servidor, então isso é a
// única forma de mostrar o valor uma vez sem persistir em texto puro em
// lugar nenhum (nem log de acesso do servidor).
export function NewSecretBanner() {
  const [secret, setSecret] = useState<{ label: string; value: string } | null>(null);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const [key, value] = hash.split("=");
    if (value) {
      setSecret({ label: key === "new_key" ? "Chave de API" : "Secret do webhook", value: decodeURIComponent(value) });
      history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  if (!secret) return null;

  return (
    <div className="rounded-lg border border-warning-300 bg-warning-50 p-4">
      <p className="text-sm font-black text-warning-800">{secret.label} criado(a) — copie agora</p>
      <p className="mt-1 text-xs font-semibold text-warning-700">
        Por segurança, isso não aparece de novo depois que você sair desta página.
      </p>
      <code className="mt-2 block break-all rounded-md bg-white px-3 py-2 text-xs font-bold text-ink">
        {secret.value}
      </code>
    </div>
  );
}
