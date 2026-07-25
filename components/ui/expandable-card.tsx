"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExpandableCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: string;
  src: string;
  description: string;
  children?: React.ReactNode;
  classNameExpanded?: string;
}

export function ExpandableCard({ title, src, description, children, className, classNameExpanded }: ExpandableCardProps) {
  const [active, setActive] = React.useState(false);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const id = React.useId();
  const titleId = `card-title-${id}`;

  React.useEffect(() => {
    if (!active) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setActive(false);
    }
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) setActive(false);
    }
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [active]);

  React.useEffect(() => {
    if (!active) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [active]);

  return (
    <>
      <AnimatePresence>{active ? <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-black/65 backdrop-blur-sm" /> : null}</AnimatePresence>
      <AnimatePresence>
        {active ? (
          <div className="fixed inset-0 z-[80] grid place-items-center p-4 sm:p-8" role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <motion.div layoutId={`card-${title}-${id}`} ref={cardRef} className={cn("relative flex max-h-[calc(100vh-64px)] w-full max-w-[760px] flex-col overflow-auto bg-[#141117] shadow-[0_24px_80px_rgba(0,0,0,.5)] [scrollbar-width:none]", classNameExpanded)}>
              <motion.div layoutId={`image-${title}-${id}`} className="relative shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-48 w-full object-cover object-center opacity-65 sm:h-60" />
                <div className="absolute inset-0 bg-black/25" />
              </motion.div>
              <div className="relative -mt-12 px-6 pb-8 sm:px-8">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <motion.p layoutId={`description-${description}-${id}`} className="text-[11px] font-medium text-od-text/60">{description}</motion.p>
                    <motion.h3 id={titleId} layoutId={`title-${title}-${id}`} className="mt-2 text-[25px] font-semibold tracking-[-0.02em] text-white sm:text-[30px]">{title}</motion.h3>
                  </div>
                  <motion.button type="button" aria-label="Fechar pré-visualização" layoutId={`button-${title}-${id}`} className="grid size-9 shrink-0 place-items-center bg-white/[0.06] text-white/55 hover:bg-white/[0.1] hover:text-white" onClick={() => setActive(false)}>
                    <motion.span animate={{ rotate: 45 }}><Plus size={17} /></motion.span>
                  </motion.button>
                </div>
                <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-8 text-[12px] leading-relaxed text-white/45">{children}</motion.div>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      <motion.button
        type="button"
        layoutId={`card-${title}-${id}`}
        onClick={() => setActive(true)}
        className={cn("block w-full overflow-hidden bg-white/[0.018] text-left transition-colors hover:bg-white/[0.03]", className)}
        aria-label={`Visualizar ${title}`}
      >
        <motion.div layoutId={`image-${title}-${id}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="h-32 w-full object-cover object-center opacity-55 grayscale-[25%]" />
        </motion.div>
        <div className="flex items-center justify-between gap-4 px-4 py-4">
          <div className="min-w-0">
            <motion.p layoutId={`description-${description}-${id}`} className="truncate text-[9px] font-medium text-od-text/48">{description}</motion.p>
            <motion.h3 layoutId={`title-${title}-${id}`} className="mt-1.5 truncate text-[12px] font-semibold text-white/68">{title}</motion.h3>
          </div>
          <motion.span layoutId={`button-${title}-${id}`} className="grid size-7 shrink-0 place-items-center text-white/30"><Plus size={15} /></motion.span>
        </div>
      </motion.button>
    </>
  );
}
