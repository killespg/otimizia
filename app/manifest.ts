import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OtimizIA",
    short_name: "OtimizIA",
    description: "CRM simples com IA para organizar clientes, vendas e lembretes.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0b14",
    theme_color: "#5c22e8",
    icons: [
      {
        src: "/otimizia-app-icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/otimizia-app-icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
