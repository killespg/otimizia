import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
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
      <body>{children}</body>
    </html>
  );
}
