"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

const LINKS = [
  ["#recursos", "Recursos"],
  ["#painel", "O painel"],
  ["#ia", "Sócio-assistente"],
  ["#planos", "Planos"],
  ["#duvidas", "Dúvidas"],
  ["#sobre", "Sobre nós"],
] as const;

/**
 * Header transparente no topo, com blur ao rolar (data-scrolled é ligado por
 * LandingEffects). No celular o menu é um dialog (bottom sheet) com Esc,
 * toque fora e fechamento ao escolher um link.
 */
export function LandingNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="oz-header" data-open={open}>
      <div className="oz-container oz-header-bar">
        <Link href="/" aria-label="OtimizIA, início" className="oz-logo">
          <Image src="/otimizia-logo-2026-dark.png" alt="OtimizIA" width={111} height={24} priority unoptimized />
        </Link>

        <nav className="oz-nav" aria-label="Seções">
          {LINKS.map(([href, label]) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
        </nav>

        <div className="oz-header-actions">
          <Link href="/login" className="oz-nav-login oz-login oz-btn-ghost oz-btn-sm">
            Entrar
          </Link>
          <Link href="/signup" className="oz-btn oz-btn-sm">
            Criar conta
          </Link>
          <button
            type="button"
            className="oz-burger"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
            aria-controls="oz-menu"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
          </button>
        </div>
      </div>

      {open ? (
        <>
          <button type="button" tabIndex={-1} aria-hidden="true" className="oz-sheet-backdrop" onClick={() => setOpen(false)} />
          <div id="oz-menu" role="dialog" aria-label="Menu" className="oz-sheet">
            {LINKS.map(([href, label]) => (
              <a key={href} href={href} className="oz-sheet-link" onClick={() => setOpen(false)}>
                {label}
              </a>
            ))}
            <div className="oz-sheet-actions">
              <Link href="/login" className="oz-btn-ghost oz-btn-sm">
                Entrar
              </Link>
              <Link href="/signup" className="oz-btn oz-btn-sm">
                Criar conta
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </header>
  );
}
