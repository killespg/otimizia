import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OtimizIA",
    short_name: "OtimizIA",
    description: "CRM multiprofissões para contatos, vendas e lembretes.",
    start_url: "/painel",
    display: "standalone",
    background_color: "#0B0D11",
    theme_color: "#0B0D11",
    lang: "pt-BR",
    icons: [
      { src: "/otimizia-app-icon-2026.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/otimizia-app-icon-2026-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
