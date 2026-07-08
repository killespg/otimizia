import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Outfit } from "next/font/google";
import { InstallAppPrompt } from "@/components/InstallAppPrompt";
import "./globals.css";

// Geométrica e arredondada como a Vegur (que ela substitui). font-black
// aponta pra 800 (ver tailwind.config.ts) em vez do 900 nativo da Outfit,
// que ficava pesado demais nos ~160 usos de font-black pelo app.
const sans = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
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
  applicationName: "OtimizIA",
  title: "OtimizIA - CRM simples para quem vende sozinho",
  description:
    "Organize clientes, acompanhe vendas e lembre de chamar cada pessoa na hora certa.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "OtimizIA",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/otimizia-mark.png",
    apple: "/otimizia-mark.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  interactiveWidget: "resizes-content",
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

  const heroInteraction = `(function(){function init(){try{var stage=document.querySelector('[data-interactive-hero]');if(!stage||stage.dataset.heroReady==='true')return;stage.dataset.heroReady='true';var copy=stage.querySelector('[data-hero-copy]');var triggers=[].slice.call(stage.querySelectorAll('[data-hero-trigger]'));var targets=[].slice.call(stage.querySelectorAll('[data-preview-target]'));function setState(state,description){stage.dataset.heroState=state;targets.forEach(function(el){el.classList.toggle('is-active',el.dataset.previewTarget===state);});triggers.forEach(function(el){var on=el.dataset.heroTrigger===state;el.classList.toggle('is-active',on);el.setAttribute('aria-pressed',on?'true':'false');});if(copy&&description)copy.textContent=description;}triggers.forEach(function(btn){btn.addEventListener('pointerenter',function(){setState(btn.dataset.heroTrigger,btn.dataset.description);});btn.addEventListener('focus',function(){setState(btn.dataset.heroTrigger,btn.dataset.description);});btn.addEventListener('click',function(){setState(btn.dataset.heroTrigger,btn.dataset.description);});});targets.forEach(function(el){el.addEventListener('pointerenter',function(){var match=triggers.find(function(btn){return btn.dataset.heroTrigger===el.dataset.previewTarget;});setState(el.dataset.previewTarget,match&&match.dataset.description);});});stage.addEventListener('pointermove',function(e){var r=stage.getBoundingClientRect();var x=(e.clientX-r.left)/Math.max(1,r.width);var y=(e.clientY-r.top)/Math.max(1,r.height);stage.style.setProperty('--hero-pointer-x',(x*100).toFixed(1)+'%');stage.style.setProperty('--hero-pointer-y',(y*100).toFixed(1)+'%');stage.style.setProperty('--hero-tilt-x',((0.5-y)*5.5).toFixed(2)+'deg');stage.style.setProperty('--hero-tilt-y',((x-0.5)*-7).toFixed(2)+'deg');});stage.addEventListener('pointerleave',function(){stage.style.setProperty('--hero-tilt-x','0deg');stage.style.setProperty('--hero-tilt-y','0deg');});setState(stage.dataset.heroState||'sales','Pipeline e valor aberto ganham destaque.');}catch(e){}}if(document.readyState==='complete'){setTimeout(init,500);}else{addEventListener('load',function(){setTimeout(init,500);},{once:true});}})();`;

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
        <InstallAppPrompt />
        <script dangerouslySetInnerHTML={{ __html: revealObserver }} />
        <script dangerouslySetInnerHTML={{ __html: heroInteraction }} />
      </body>
    </html>
  );
}
