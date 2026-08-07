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
  const progressRef = useRef<HTMLSpanElement>(null);
  const hydrated = useHydrated();
  const reduceMotion = useReducedMotion();
  const [fullyOpen, setFullyOpen] = useState(false);
  const { scrollYProgress } = useScroll({
    target: progressRef,
    offset: ["start start", "end start"],
  });
  const rotateX = useTransform(scrollYProgress, [0, 0.45, 1], [-86, -54, 0]);
  const scaleX = useTransform(scrollYProgress, [0, 0.55, 1], [0.88, 0.95, 1]);
  const coverOpacity = useTransform(
    scrollYProgress,
    [0, 0.12, 0.34],
    [1, 0.72, 0],
  );

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const nextFullyOpen = latest >= 0.97;
    setFullyOpen((current) =>
      current === nextFullyOpen ? current : nextFullyOpen,
    );
  });

  const animateOpening = hydrated && !reduceMotion && !fullyOpen;

  return (
    <figure data-laptop-frame="true" className="landing-laptop-frame">
      <span
        ref={progressRef}
        aria-hidden="true"
        className="landing-laptop-scroll-progress"
      />

      <div className="landing-laptop-sticky-scene">
        <div className="landing-laptop-hardware">
          <div className="landing-laptop-screen-track">
            {animateOpening ? (
              <motion.div
                data-laptop-screen="true"
                data-laptop-opening-screen="true"
                className="landing-laptop-screen"
                style={{
                  rotateX,
                  scaleX,
                  transformOrigin: "bottom center",
                  willChange: "transform",
                }}
              >
                {children}
                <motion.span
                  data-laptop-cover="true"
                  aria-hidden="true"
                  className="landing-laptop-cover"
                  style={{ opacity: coverOpacity }}
                >
                  <LogoMark size={56} className="landing-laptop-cover-mark" />
                </motion.span>
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
          </div>

          <span
            data-laptop-base="true"
            aria-hidden="true"
            className="landing-laptop-base"
          >
            <span data-laptop-hinge="true" className="landing-laptop-hinge" />
            <span className="landing-laptop-lip" />
          </span>
        </div>
      </div>

      <span aria-hidden="true" className="landing-laptop-scroll-tail" />

      <figcaption className="sr-only">{caption}</figcaption>
    </figure>
  );
}
