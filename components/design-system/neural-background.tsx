"use client";

import * as React from "react";

interface NeuralBackgroundProps {
  className?: string;
  color?: string;
  backgroundColor?: string;
  trailOpacity?: number;
  particleCount?: number;
  speed?: number;
  interactive?: boolean;
}

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
};

export default function NeuralBackground({
  className,
  color = "#6366f1",
  backgroundColor = "#171320",
  trailOpacity = 0.15,
  particleCount = 600,
  speed = 1,
  interactive = false,
}: NeuralBackgroundProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !container || !context) return;

    let width = 1;
    let height = 1;
    let particles: Particle[] = [];
    let animationFrameId = 0;
    let isRunning = false;
    let lastFrame = 0;
    // Keep the established motion speed while rendering on every display frame.
    const motionReferenceStepMs = 1000 / 20;
    const mouse = { x: -1000, y: -1000 };
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const makeParticle = (): Particle => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: 0,
      vy: 0,
      age: Math.random() * 180,
      life: Math.random() * 200 + 140,
    });

    const resetParticle = (particle: Particle) => {
      particle.x = Math.random() * width;
      particle.y = Math.random() * height;
      particle.vx = 0;
      particle.vy = 0;
      particle.age = 0;
      particle.life = Math.random() * 200 + 140;
    };

    const updateParticle = (particle: Particle, frameScale: number) => {
      const angle =
        (Math.cos(particle.x * 0.005) + Math.sin(particle.y * 0.005)) * Math.PI;

      particle.vx += Math.cos(angle) * 0.2 * speed * frameScale;
      particle.vy += Math.sin(angle) * 0.2 * speed * frameScale;

      if (interactive) {
        const dx = mouse.x - particle.x;
        const dy = mouse.y - particle.y;
        const distance = Math.hypot(dx, dy);
        const interactionRadius = 150;

        if (distance < interactionRadius) {
          const force = (interactionRadius - distance) / interactionRadius;
          particle.vx -= dx * force * 0.05 * frameScale;
          particle.vy -= dy * force * 0.05 * frameScale;
        }
      }

      particle.x += particle.vx * frameScale;
      particle.y += particle.vy * frameScale;
      const damping = Math.pow(0.95, frameScale);
      particle.vx *= damping;
      particle.vy *= damping;
      particle.age += frameScale;

      if (particle.age > particle.life) resetParticle(particle);
      if (particle.x < 0) particle.x = width;
      if (particle.x > width) particle.x = 0;
      if (particle.y < 0) particle.y = height;
      if (particle.y > height) particle.y = 0;
    };

    const drawParticle = (particle: Particle) => {
      const alpha = 1 - Math.abs(particle.age / particle.life - 0.5) * 2;
      context.globalAlpha = Math.max(0.12, alpha);
      context.fillRect(particle.x, particle.y, 1.35, 1.35);
    };

    const paintBackground = (alpha: number) => {
      context.globalAlpha = alpha;
      context.fillStyle = backgroundColor;
      context.fillRect(0, 0, width, height);
      context.globalAlpha = 1;
    };

    const drawFrame = (frameScale: number) => {
      const frameTrailOpacity = 1 - Math.pow(1 - trailOpacity, frameScale);
      paintBackground(frameTrailOpacity);
      context.fillStyle = color;
      particles.forEach((particle) => {
        updateParticle(particle, frameScale);
        drawParticle(particle);
      });
      context.globalAlpha = 1;
    };

    const animate = (now: number) => {
      if (document.hidden) {
        isRunning = false;
        return;
      }

      const elapsed = lastFrame === 0 ? motionReferenceStepMs : now - lastFrame;
      lastFrame = now;
      const frameScale = Math.min(elapsed / motionReferenceStepMs, 2);
      drawFrame(frameScale);
      animationFrameId = window.requestAnimationFrame(animate);
    };

    const startAnimation = () => {
      if (reduceMotion || isRunning || document.hidden) return;
      isRunning = true;
      lastFrame = 0;
      animationFrameId = window.requestAnimationFrame(animate);
    };

    const stopAnimation = () => {
      window.cancelAnimationFrame(animationFrameId);
      isRunning = false;
    };

    const resize = () => {
      const bounds = container.getBoundingClientRect();
      width = Math.max(1, Math.round(bounds.width));
      height = Math.max(1, Math.round(bounds.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 1);

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const responsiveCount =
        width < 640 ? Math.ceil(particleCount * 0.3) : particleCount;
      particles = Array.from({ length: responsiveCount }, makeParticle);

      paintBackground(1);
      if (reduceMotion) {
        context.fillStyle = color;
        particles.forEach(drawParticle);
        context.globalAlpha = 1;
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      mouse.x = event.clientX - bounds.left;
      mouse.y = event.clientY - bounds.top;
    };

    const handlePointerLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    const handleVisibilityChange = () => {
      if (document.hidden) stopAnimation();
      else startAnimation();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    if (interactive) {
      container.addEventListener("pointermove", handlePointerMove);
      container.addEventListener("pointerleave", handlePointerLeave);
    }

    resize();
    startAnimation();

    return () => {
      stopAnimation();
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [backgroundColor, color, interactive, particleCount, speed, trailOpacity]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`relative size-full overflow-hidden ${className ?? ""}`}
      style={{ backgroundColor }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 block size-full" />
    </div>
  );
}
