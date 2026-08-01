"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import { Suspense, useEffect, useRef, useState } from "react";
import type { ConsentCategories } from "@/lib/consent/consent";
import { CONSENT_CHANGED_EVENT, readConsent } from "@/lib/consent/consent-browser";

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
const FACEBOOK_PIXEL_ID = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue?: unknown[] };
    _fbq?: unknown;
  }
}

// Nenhum script de terceiro entra na página antes do "sim" correspondente:
// o gate é a ausência da tag, não uma flag que o script consulta depois de
// já ter carregado e possivelmente gravado cookie.
export function SiteAnalytics() {
  const [consent, setConsent] = useState<ConsentCategories>({ analytics: false, marketing: false });

  useEffect(() => {
    const apply = () => {
      const current = readConsent();
      setConsent({
        analytics: current?.analytics ?? false,
        marketing: current?.marketing ?? false,
      });
    };
    apply();
    window.addEventListener(CONSENT_CHANGED_EVENT, apply);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, apply);
  }, []);

  return (
    <>
      {consent.analytics && GA_ID && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());gtag('config','${GA_ID}',{anonymize_ip:true});`}
          </Script>
        </>
      )}

      {consent.marketing && GOOGLE_ADS_ID && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`} strategy="afterInteractive" />
          <Script id="google-ads-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());gtag('config','${GOOGLE_ADS_ID}');`}
          </Script>
        </>
      )}

      {consent.marketing && FACEBOOK_PIXEL_ID && (
        <Script id="facebook-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${FACEBOOK_PIXEL_ID}');fbq('track','PageView');`}
        </Script>
      )}

      <Suspense fallback={null}>
        <PageViews consent={consent} />
      </Suspense>
    </>
  );
}

// Navegação no App Router não recarrega a página, então o page_view automático
// das tags só conta a primeira. useSearchParams força CSR bailout na rota
// inteira se não estiver dentro de <Suspense> — daí o wrapper acima.
function PageViews({ consent }: { consent: ConsentCategories }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // A página em que as tags já contaram sozinhas. Começa preenchida para não
  // duplicar a primeira visita, e não muda quando o consentimento é aceito no
  // meio da sessão — nesse momento as tags entram e contam a página atual.
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    const query = searchParams.toString();
    const page = query ? `${pathname}?${query}` : pathname;
    if (lastSent.current === page) return;

    const isFirst = lastSent.current === null;
    lastSent.current = page;
    if (isFirst) return;

    if (consent.analytics && GA_ID) {
      window.gtag?.("event", "page_view", { page_path: page });
    }
    if (consent.marketing && FACEBOOK_PIXEL_ID) {
      window.fbq?.("track", "PageView");
    }
  }, [pathname, searchParams, consent.analytics, consent.marketing]);

  return null;
}
