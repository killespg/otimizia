import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { CookieConsent } from "@/components/site/CookieConsent";
import { SiteAnalytics } from "@/components/site/SiteAnalytics";
import { siteUrl } from "@/lib/utils/request-origin";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: "OtimizIA",
  description: "CRM multiprofissões com uma IA integrada, no painel personalizado pela sua profissão.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/otimizia-app-icon-2026.png",
    apple: "/otimizia-app-icon-2026.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "OtimizIA",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#170f2c",
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
        {/* Refração de verdade, não só blur+brilho: desloca os pixels do que
            está atrás em vez de só borrar — é o que separa vidro real de
            "wash borrado". Consumida por .od-chrome/.glass/.glass-soft via
            filter: url(#od-glass-distortion) num pseudo-elemento dedicado
            (nunca no elemento com texto, senão o texto também distorce).
            NÃO aplicar em .panel/.card/bg-od-surface: duas tentativas (filtro
            completo e uma versão sem feSpecularLighting) estouraram o
            navegador com dezenas de instâncias por página — tela em branco
            nas duas (2026-08-03). Ver nota em app/globals.css. */}
        <svg aria-hidden="true" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
          <filter id="od-glass-distortion" x="-20%" y="-20%" width="140%" height="140%" filterUnits="objectBoundingBox">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.018" numOctaves="2" seed="7" result="turbulence" />
            <feGaussianBlur in="turbulence" stdDeviation="4" result="softMap" />
            <feSpecularLighting in="softMap" surfaceScale="4" specularConstant="0.9" specularExponent="90" lightingColor="#fff" result="specLight">
              <fePointLight x="-120" y="-160" z="220" />
            </feSpecularLighting>
            <feComposite in="specLight" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="litImage" />
            <feDisplacementMap in="SourceGraphic" in2="softMap" scale="22" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>
        {children}
        <CookieConsent />
        <SiteAnalytics />
      </body>
    </html>
  );
}
