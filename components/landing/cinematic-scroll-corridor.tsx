"use client";

import { type ReactNode, useRef, useSyncExternalStore } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

const subscribe = () => () => {};

function useHydrated() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

export function CinematicScrollCorridor({ children }: { children: ReactNode }) {
  const corridorRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const hydrated = useHydrated();
  const { scrollYProgress } = useScroll({
    target: corridorRef,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [24, -24]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.985, 1.02, 0.995]);
  const animate = hydrated && !reduceMotion;

  return (
    <div ref={corridorRef} className="landing-cinematic-corridor">
      <motion.div
        style={animate ? { y, scale, willChange: "transform" } : { y: 0, scale: 1 }}
        className="landing-cinematic-corridor-track"
      >
        {children}
      </motion.div>
    </div>
  );
}
