import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/utils/request-origin";

// Só o que é público e indexável. Painel, onboarding e páginas de
// compartilhamento por token ficam de fora — as duas primeiras exigem login e
// a última é um link privado que não deve acabar num buscador.
const PUBLIC_ROUTES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/signup", changeFrequency: "monthly", priority: 0.8 },
  { path: "/login", changeFrequency: "yearly", priority: 0.5 },
  { path: "/termos", changeFrequency: "yearly", priority: 0.3 },
  { path: "/privacidade", changeFrequency: "yearly", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const lastModified = new Date();

  return PUBLIC_ROUTES.map((route) => ({
    url: `${base}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
