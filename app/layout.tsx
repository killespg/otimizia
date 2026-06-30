import type { Metadata } from "next";
import { Schibsted_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// Corpo / UI — grotesco neutro e legível.
const sans = Schibsted_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

// Títulos — serifada editorial de caráter (o diferencial fora do "SaaS de IA").
// Micro-rótulos, números, etiquetas — monoespaçada.
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "OtimizIA — CRM simples para quem vende sozinho",
  description:
    "Organize clientes, acompanhe vendas e lembre de chamar cada pessoa na hora certa.",
  icons: {
    icon: "/otimizia-mark.png",
    apple: "/otimizia-mark.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Ativa o movimento só quando há JS e o usuário não pediu redução de
  // movimento. Roda antes da pintura do conteúdo → sem flash, sem travar em branco.
  const motionGate = `(function(){try{var d=document.documentElement;d.classList.add('js');if(!window.matchMedia||!matchMedia('(prefers-reduced-motion: reduce)').matches){d.classList.add('motion');}}catch(e){}})();`;

  // Revela [data-reveal] conforme entram na viewport (só com .motion ativo).
  // Failsafe de 3s garante que nada fica invisível para quem não rola (crawlers).
  const revealObserver = `(function(){try{var d=document.documentElement;if(!d.classList.contains('motion')||!('IntersectionObserver' in window))return;var els=[].slice.call(document.querySelectorAll('[data-reveal]'));var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('is-in');io.unobserve(e.target);}});},{threshold:0.15,rootMargin:'0px 0px -8% 0px'});els.forEach(function(el){io.observe(el);});setTimeout(function(){els.forEach(function(el){el.classList.add('is-in');});},3000);}catch(e){}})();`;

  return (
    <html
      lang="pt-BR"
      className={`${sans.variable} ${mono.variable}`}
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: motionGate }} />
        {children}
        <script dangerouslySetInnerHTML={{ __html: revealObserver }} />
      </body>
    </html>
  );
}
