"use client";

import * as React from "react";

interface AmbientParticlesProps {
  className?: string;
  color?: string;
  /** Uma partícula a cada N pixels² de viewport. Maior = mais esparso. */
  density?: number;
  /** Teto absoluto, pra tela ultrawide não virar campo de estrelas. */
  maxParticles?: number;
  speed?: number;
}

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  /** Fase do cintilar, pra cada ponto respirar em tempo próprio. */
  phase: number;
  twinkleSpeed: number;
};

/**
 * Poeira de fundo da área autenticada. Diferente do NeuralBackground, aqui não
 * há rastro nem preenchimento de fundo: o canvas fica transparente e só desenha
 * pontos, então ele compõe sobre o canvas escuro do shell em vez de criar outra
 * superfície. É textura, não elemento de marca — se ficar perceptível como
 * animação, está alto demais.
 */
export function AmbientParticles({
  className,
  color = "#8b5cf6",
  density = 9000,
  maxParticles = 220,
  speed = 1,
}: AmbientParticlesProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    let width = 1;
    let height = 1;
    let particles: Particle[] = [];
    let animationFrame = 0;
    let isRunning = false;
    let lastFrame = 0;
    let elapsedSeconds = 0;
    // Mesma referência do NeuralBackground: mantém a velocidade estável
    // independente da taxa de quadros do monitor.
    const motionReferenceStepMs = 1000 / 60;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const makeParticle = (): Particle => ({
      x: Math.random() * width,
      y: Math.random() * height,
      // Deriva lenta e sem direção dominante: o olho não deve conseguir
      // apontar "pra onde" o campo está indo.
      vx: (Math.random() - 0.5) * 0.05 * speed,
      vy: (Math.random() - 0.5) * 0.05 * speed,
      radius: 0.6 + Math.random() * 1.0,
      alpha: 0.16 + Math.random() * 0.34,
      phase: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.15 + Math.random() * 0.35,
    });

    const drawFrame = () => {
      context.clearRect(0, 0, width, height);
      context.fillStyle = color;

      for (const particle of particles) {
        const twinkle = reduceMotion
          ? 1
          : 0.65 + Math.sin(elapsedSeconds * particle.twinkleSpeed + particle.phase) * 0.35;
        context.globalAlpha = particle.alpha * twinkle;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fill();
      }

      context.globalAlpha = 1;
    };

    const advance = (frameScale: number) => {
      for (const particle of particles) {
        particle.x += particle.vx * frameScale;
        particle.y += particle.vy * frameScale;

        // Reentra pelo lado oposto: campo contínuo, sem borda visível.
        if (particle.x < 0) particle.x += width;
        else if (particle.x > width) particle.x -= width;
        if (particle.y < 0) particle.y += height;
        else if (particle.y > height) particle.y -= height;
      }
    };

    const animate = (now: number) => {
      if (document.hidden) {
        isRunning = false;
        return;
      }

      const elapsed = lastFrame === 0 ? motionReferenceStepMs : now - lastFrame;
      lastFrame = now;
      // Trava em 2 passos: voltar de uma aba oculta não deve teleportar o campo.
      const frameScale = Math.min(elapsed / motionReferenceStepMs, 2);
      elapsedSeconds += Math.min(elapsed, 100) / 1000;
      advance(frameScale);
      drawFrame();
      animationFrame = window.requestAnimationFrame(animate);
    };

    const startAnimation = () => {
      if (reduceMotion || isRunning || document.hidden) return;
      isRunning = true;
      lastFrame = 0;
      animationFrame = window.requestAnimationFrame(animate);
    };

    const stopAnimation = () => {
      window.cancelAnimationFrame(animationFrame);
      isRunning = false;
    };

    const resize = () => {
      width = Math.max(1, window.innerWidth);
      height = Math.max(1, window.innerHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const target = Math.round((width * height) / density);
      particles = Array.from({ length: Math.min(target, maxParticles) }, makeParticle);

      // Com movimento reduzido o campo existe, só não se move.
      drawFrame();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) stopAnimation();
      else startAnimation();
    };

    resize();
    startAnimation();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopAnimation();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [color, density, maxParticles, speed]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-ambient-particles="true"
      className={`pointer-events-none fixed inset-0 z-0 h-full w-full ${className ?? ""}`}
    />
  );
}

export default AmbientParticles;
