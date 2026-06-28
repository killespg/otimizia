import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MeuCRM — CRM simples para empreendedores",
  description:
    "Organize contatos, acompanhe seu funil de vendas e nunca perca um follow-up.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
