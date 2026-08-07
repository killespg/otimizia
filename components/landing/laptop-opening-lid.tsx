"use client";

import { useRef, useSyncExternalStore } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { LogoMark } from "@/components/design-system/logo";

const subscribe = () => () => {};

function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

export function LaptopOpeningLid() {
  const trackRef = useRef<HTMLSpanElement>(null);
  const hydrated = useHydrated();
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start 94%", "center 52%"],
  });

  const rotateX = useTransform(scrollYProgress, [0, 0.52, 1], [0, -48, -96]);
  const opacity = useTransform(scrollYProgress, [0, 0.72, 1], [1, 1, 0]);
  const y = useTransform(scrollYProgress, [0, 1], [0, 8]);

  return (
    <span ref={trackRef} aria-hidden="true" className="landing-laptop-opening-track">
      {hydrated && !reduceMotion ? (
        <motion.span
          data-laptop-opening-lid="true"
          className="landing-laptop-opening-lid"
          style={{
            rotateX,
            opacity,
            y,
            transformPerspective: 1200,
            transformOrigin: "bottom center",
          }}
        >
          <LogoMark size={48} className="landing-laptop-opening-mark" />
        </motion.span>
      ) : null}
    </span>
  );
}
