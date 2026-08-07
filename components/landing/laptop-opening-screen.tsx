"use client";

import {
  type ReactNode,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";

const subscribe = () => () => {};

function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

export function LaptopOpeningScreen({ children }: { children: ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const hydrated = useHydrated();
  const reduceMotion = useReducedMotion();
  const [fullyOpen, setFullyOpen] = useState(false);
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start 94%", "center 52%"],
  });
  const scaleY = useTransform(scrollYProgress, [0, 0.55, 1], [0.08, 0.48, 1]);
  const scaleX = useTransform(scrollYProgress, [0, 0.55, 1], [0.94, 0.98, 1]);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const nextFullyOpen = latest >= 0.97;
    setFullyOpen((current) =>
      current === nextFullyOpen ? current : nextFullyOpen,
    );
  });

  const animateOpening = hydrated && !reduceMotion && !fullyOpen;

  return (
    <div ref={trackRef} className="landing-laptop-screen-track">
      {animateOpening ? (
        <motion.div
          data-laptop-screen="true"
          data-laptop-opening-screen="true"
          className="landing-laptop-screen"
          style={{
            scaleX,
            scaleY,
            transformOrigin: "bottom center",
            willChange: "transform",
          }}
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
    </div>
  );
}
