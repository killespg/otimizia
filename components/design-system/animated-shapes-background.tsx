"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

function Capsule({ className, width, height, rotate, delay }: { className: string; width: number; height: number; rotate: number; delay: number }) {
  return (
    <motion.div
      initial={false}
      animate={{ y: [0, 14, 0], x: [0, 6, 0] }}
      transition={{ y: { duration: 16, delay, repeat: Infinity, ease: "easeInOut" }, x: { duration: 21, delay, repeat: Infinity, ease: "easeInOut" } }}
      className={cn(
        "absolute rounded-full border border-od-accent/[0.14]",
        "bg-od-accent/[0.06]",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_60px_rgba(91,33,182,0.08)]",
        "backdrop-blur-[2px]",
        className,
      )}
      style={{ width, height, rotate }}
    />
  );
}

export function AnimatedShapesBackground({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <Capsule className="-right-36 top-20" width={560} height={116} rotate={17} delay={0.2} />
      <Capsule className="-left-48 top-[54%]" width={620} height={124} rotate={-11} delay={0.5} />
      <Capsule className="bottom-12 right-[8%] hidden md:block" width={360} height={76} rotate={-19} delay={0.8} />
      <Capsule className="left-[30%] top-16 hidden lg:block" width={210} height={52} rotate={-23} delay={0.65} />
    </div>
  );
}
