import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const sans = localFont({
  src: [
    {
      path: "./fonts/Vegur-Light.otf",
      weight: "300",
      style: "normal",
    },
    {
      path: "./fonts/Vegur-Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/Vegur-Bold.otf",
      weight: "700",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-sans",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "OtimizIA - CRM simples para quem vende sozinho",
  description:
    "Organize clientes, acompanhe vendas e lembre de chamar cada pessoa na hora certa.",
  icons: {
    icon: "/otimizia-mark.png",
    apple: "/otimizia-mark.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#5c22e8",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const themeGate = `(function(){try{var s=localStorage.getItem('theme');var dark=s?s==='dark':!!(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',dark);document.documentElement.style.colorScheme=dark?'dark':'light';}catch(e){}})();`;

  const motionGate = `(function(){try{var d=document.documentElement;d.classList.add('js');d.classList.add('motion');}catch(e){}})();`;

  const revealObserver = `(function(){try{var d=document.documentElement;if(!d.classList.contains('motion')||!('IntersectionObserver' in window))return;var els=[].slice.call(document.querySelectorAll('[data-reveal]'));var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('is-in');io.unobserve(e.target);}});},{threshold:0.15,rootMargin:'0px 0px -8% 0px'});els.forEach(function(el){io.observe(el);});setTimeout(function(){els.forEach(function(el){el.classList.add('is-in');});},3000);}catch(e){}})();`;

  return (
    <html
      lang="pt-BR"
      className={`${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeGate }} />
        <script dangerouslySetInnerHTML={{ __html: motionGate }} />
        {children}
        <script dangerouslySetInnerHTML={{ __html: revealObserver }} />
      </body>
    </html>
  );
}
