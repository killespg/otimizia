import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/request-origin";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Área logada, APIs e links de compartilhamento por token. O /share
        // não é secreto por obscuridade só: é um link que o corretor manda
        // para um cliente e que não faz sentido virar resultado de busca.
        disallow: ["/api/", "/painel", "/onboarding", "/upgrade", "/share/", "/reset-password"],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
