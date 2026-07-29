import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { CookieConsent } from "@/components/CookieConsent";
import { SiteAnalytics } from "@/components/SiteAnalytics";
import { siteUrl } from "@/lib/request-origin";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: "OtimizIA",
  description: "CRM multiprofissões para organizar contatos, vendas, tarefas e operações especializadas.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/otimizia-app-icon-2026.png",
    apple: "/otimizia-app-icon-2026.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#151419",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased dark`}>
      {/* Extensões de navegador escrevem atributos no <body> antes do React
          hidratar (bis_register, __processed_<uuid>__ e afins), o que dispara
          erro de hidratação em dev para a pessoa que tem a extensão, não para
          o visitante. suppressHydrationWarning vale só para os atributos deste
          elemento, um nível: qualquer divergência real dentro da árvore
          continua sendo reportada. */}
      <body suppressHydrationWarning>
        {children}
        <CookieConsent />
        <SiteAnalytics />
      </body>
    </html>
  );
}
