"use client";

import { type ReactNode, useRef, useState, useSyncExternalStore } from "react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { LogoMark } from "@/components/design-system/logo";

const subscribe = () => () => {};

function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

export function LaptopOpeningScreen({
  children,
  caption,
}: {
  children: ReactNode;
  caption: string;
}) {
  const frameRef = useRef<HTMLElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const hydrated = useHydrated();
  const reduceMotion = useReducedMotion();
  const [fullyOpen, setFullyOpen] = useState(false);
  const { scrollYProgress } = useScroll({
    target: progressRef,
    offset: ["start start", "end start"],
  });
  const { scrollYProgress: entryProgress } = useScroll({
    target: frameRef,
    offset: ["start 20%", "start start"],
  });
  const rotateX = useTransform(scrollYProgress, [0, 0.45, 1], [-86, -54, 0]);
  const scaleX = useTransform(scrollYProgress, [0, 0.55, 1], [0.88, 0.95, 1]);
  const hardwareOpacity = useTransform(
    entryProgress,
    [0, 0.94, 1],
    [0, 0, 1],
  );
  const coverOpacity = useTransform(
    scrollYProgress,
    [0, 0.62, 0.92, 1],
    [1, 1, 0.55, 0],
  );
  const panelOpacity = useTransform(
    scrollYProgress,
    [0, 0.08, 0.5],
    [0, 0, 1],
  );

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const nextFullyOpen = latest >= 0.97;
    setFullyOpen((current) =>
      current === nextFullyOpen ? current : nextFullyOpen,
    );
  });

  const animateOpening = hydrated && !reduceMotion && !fullyOpen;

  return (
    <figure
      ref={frameRef}
      data-laptop-frame="true"
      className="landing-laptop-frame"
    >
      <span
        ref={progressRef}
        aria-hidden="true"
        className="landing-laptop-scroll-progress"
      />

      <div className="landing-laptop-sticky-scene">
        <motion.div
          data-laptop-hardware="true"
          className="landing-laptop-hardware"
          style={animateOpening ? { opacity: hardwareOpacity } : undefined}
        >
          <div className="landing-laptop-screen-track">
            {animateOpening ? (
              <motion.div
                data-laptop-screen="true"
                data-laptop-opening-screen="true"
                className="landing-laptop-screen"
                style={{ opacity: panelOpacity }}
              >
                {children}
              </motion.div>
            ) : (
              <div
                data-laptop-screen="true"
                data-laptop-opening-screen="true"
                className="landing-laptop-screen"
              >
                {children}
              </div>
            )}

            {animateOpening ? (
              <motion.span
                data-laptop-cover="true"
                aria-hidden="true"
                className="landing-laptop-cover"
                style={{
                  opacity: coverOpacity,
                  rotateX,
                  scaleX,
                  transformOrigin: "bottom center",
                  willChange: "transform",
                }}
              >
                <LogoMark size={56} className="landing-laptop-cover-mark" />
              </motion.span>
            ) : null}
          </div>

          <span
            data-laptop-base="true"
            aria-hidden="true"
            className="landing-laptop-base"
          >
            <span data-laptop-hinge="true" className="landing-laptop-hinge" />
            <span className="landing-laptop-lip" />
          </span>
        </motion.div>
      </div>

      <span aria-hidden="true" className="landing-laptop-scroll-tail" />

      <figcaption className="sr-only">{caption}</figcaption>
    </figure>
  );
}
