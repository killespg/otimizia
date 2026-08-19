import * as React from "react";
import { cn } from "@/lib/utils/utils";
import { Panel } from "./panel";

const logos = ["Corretor de imóveis", "Escritório de advocacia", "Vendedor autônomo"];

/**
 * Faixa de público-alvo. Lista as profissões que o produto atende, não logos
 * de clientes (ainda não há). Honesto em vez de simular prova social: o
 * rótulo acima, na landing, já diz "Serve para quem trabalha sozinho e para
 * equipe inteira", e estes são os grupos concretos.
 */
export function LogoMarquee({ bare = false }: { bare?: boolean; fadeColor?: string }) {
  const content = (
    <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
      {logos.map((logo) => (
        <span key={logo} className="whitespace-nowrap text-sm font-semibold text-od-text-2">
          {logo}
        </span>
      ))}
    </div>
  );

  if (bare) {
    return <div className="py-5">{content}</div>;
  }

  return <Panel className={cn("relative overflow-hidden py-5")}>{content}</Panel>;
}
