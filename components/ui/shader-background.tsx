"use client";

import { useEffect, useRef } from "react";

const VERTEX_SHADER = `
  attribute vec4 aVertexPosition;
  void main() {
    gl_Position = aVertexPosition;
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;
  uniform vec2 iResolution;
  uniform float iTime;

  const float overallSpeed = 0.15;
  const float gridSmoothWidth = 0.015;
  const float axisWidth = 0.05;
  const float majorLineWidth = 0.025;
  const float minorLineWidth = 0.0125;
  const float majorLineFrequency = 5.0;
  const float minorLineFrequency = 1.0;
  const vec4 gridColor = vec4(0.5);
  const float scale = 5.0;
  const vec4 lineColor = vec4(0.4, 0.2, 0.8, 1.0);
  const float minLineWidth = 0.01;
  const float maxLineWidth = 0.2;
  const float lineSpeed = 1.0 * overallSpeed;
  const float lineAmplitude = 1.0;
  const float lineFrequency = 0.2;
  const float warpSpeed = 0.2 * overallSpeed;
  const float warpFrequency = 0.5;
  const float warpAmplitude = 1.0;
  const float offsetFrequency = 0.5;
  const float offsetSpeed = 1.33 * overallSpeed;
  const float minOffsetSpread = 0.6;
  const float maxOffsetSpread = 2.0;
  const int linesPerGroup = 16;

  #define drawCircle(pos, radius, coord) smoothstep(radius + gridSmoothWidth, radius, length(coord - (pos)))
  #define drawSmoothLine(pos, halfWidth, t) smoothstep(halfWidth, 0.0, abs(pos - (t)))
  #define drawCrispLine(pos, halfWidth, t) smoothstep(halfWidth + gridSmoothWidth, halfWidth, abs(pos - (t)))
  #define drawPeriodicLine(freq, width, t) drawCrispLine(freq / 2.0, width, abs(mod(t, freq) - (freq) / 2.0))

  float drawGridLines(float axis) {
    return drawCrispLine(0.0, axisWidth, axis)
          + drawPeriodicLine(majorLineFrequency, majorLineWidth, axis)
          + drawPeriodicLine(minorLineFrequency, minorLineWidth, axis);
  }

  float drawGrid(vec2 space) {
    return min(1.0, drawGridLines(space.x) + drawGridLines(space.y));
  }

  float random(float t) {
    return (cos(t) + cos(t * 1.3 + 1.3) + cos(t * 1.4 + 1.4)) / 3.0;
  }

  float getPlasmaY(float x, float horizontalFade, float offset) {
    return random(x * lineFrequency + iTime * lineSpeed) * horizontalFade * lineAmplitude + offset;
  }

  void main() {
    vec2 fragCoord = gl_FragCoord.xy;
    vec4 fragColor;
    vec2 uv = fragCoord.xy / iResolution.xy;
    // Cada eixo normalizado pela sua própria dimensão: sem isso, em telas
    // retrato (celular) a faixa de fios fica espremida num filete no centro
    // com muito vazio em cima/embaixo. Assim ela preenche a altura em
    // qualquer proporção. (A verticalFade já concentra o brilho no centro,
    // então no desktop o resultado visível praticamente não muda.)
    vec2 space = (fragCoord - iResolution.xy / 2.0) / iResolution.xy * 2.0 * scale;

    float horizontalFade = 1.0 - (cos(uv.x * 6.28) * 0.5 + 0.5);
    float verticalFade = 1.0 - (cos(uv.y * 6.28) * 0.5 + 0.5);

    space.y += random(space.x * warpFrequency + iTime * warpSpeed) * warpAmplitude * (0.5 + horizontalFade);
    space.x += random(space.y * warpFrequency + iTime * warpSpeed + 2.0) * warpAmplitude * horizontalFade;

    vec4 lines = vec4(0.0);
    vec4 bgColor1 = vec4(0.1, 0.1, 0.3, 1.0);
    vec4 bgColor2 = vec4(0.3, 0.1, 0.5, 1.0);

    for(int l = 0; l < linesPerGroup; l++) {
      float normalizedLineIndex = float(l) / float(linesPerGroup);
      float offsetTime = iTime * offsetSpeed;
      float offsetPosition = float(l) + space.x * offsetFrequency;
      float rand = random(offsetPosition + offsetTime) * 0.5 + 0.5;
      float halfWidth = mix(minLineWidth, maxLineWidth, rand * horizontalFade) / 2.0;
      float offset = random(offsetPosition + offsetTime * (1.0 + normalizedLineIndex)) * mix(minOffsetSpread, maxOffsetSpread, horizontalFade);
      float linePosition = getPlasmaY(space.x, horizontalFade, offset);
      float line = drawSmoothLine(linePosition, halfWidth, space.y) / 2.0 + drawCrispLine(linePosition, halfWidth * 0.15, space.y);

      float circleX = mod(float(l) + iTime * lineSpeed, 25.0) - 12.0;
      vec2 circlePosition = vec2(circleX, getPlasmaY(circleX, horizontalFade, offset));
      float circle = drawCircle(circlePosition, 0.01, space) * 4.0;

      line = line + circle;
      lines += line * lineColor * rand;
    }

    fragColor = mix(bgColor1, bgColor2, uv.x);
    fragColor *= verticalFade;
    fragColor.a = 1.0;
    fragColor += lines;

    gl_FragColor = fragColor;
  }
`;

export default function ShaderBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.dataset.shaderStatus = "initializing";

    const gl = canvas.getContext("webgl");
    if (!gl) {
      return startCanvasFallback(canvas);
    }

    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vertexShader || !fragmentShader) {
      canvas.dataset.shaderStatus = "compile-error";
      return;
    }

    const shaderProgram = gl.createProgram();
    if (!shaderProgram) return;

    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      console.error("Shader program link error:", gl.getProgramInfoLog(shaderProgram));
      canvas.dataset.shaderStatus = "link-error";
      gl.deleteProgram(shaderProgram);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      return;
    }

    const positionBuffer = gl.createBuffer();
    if (!positionBuffer) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );

    const positionLocation = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    const resolutionLocation = gl.getUniformLocation(shaderProgram, "iResolution");
    const timeLocation = gl.getUniformLocation(shaderProgram, "iTime");
    const startedAt = performance.now();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let animationFrame = 0;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const draw = (now: number) => {
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(shaderProgram);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      gl.uniform1f(timeLocation, (now - startedAt) / 1000);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(positionLocation);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      canvas.dataset.shaderStatus = "running";
    };

    const render = (now: number) => {
      draw(now);
      animationFrame = window.requestAnimationFrame(render);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    if (reducedMotion) draw(performance.now());
    else animationFrame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resizeCanvas);
      gl.deleteBuffer(positionBuffer);
      gl.deleteProgram(shaderProgram);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-dashboard-shader="plasma-wires"
      className="pointer-events-none fixed inset-0 z-[1] h-full w-full opacity-50"
    />
  );
}

function loadShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  console.error("Shader compile error:", gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
  return null;
}

function startCanvasFallback(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");
  if (!context) {
    canvas.dataset.shaderStatus = "canvas-unavailable";
    return;
  }

  const overallSpeed = 0.15;
  const scale = 5;
  const lineSpeed = overallSpeed;
  const lineFrequency = 0.2;
  const warpSpeed = 0.2 * overallSpeed;
  const warpFrequency = 0.5;
  const warpAmplitude = 1;
  const offsetFrequency = 0.5;
  const offsetSpeed = 1.33 * overallSpeed;
  const minOffsetSpread = 0.6;
  const maxOffsetSpread = 2;
  const linesPerGroup = 16;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const startedAt = performance.now();
  let width = 1;
  let height = 1;
  let animationFrame = 0;
  let horizontalBackground: CanvasGradient;
  let verticalShade: CanvasGradient;

  const random = (value: number) =>
    (Math.cos(value) + Math.cos(value * 1.3 + 1.3) + Math.cos(value * 1.4 + 1.4)) / 3;

  const getPlasmaY = (x: number, horizontalFade: number, offset: number, time: number) =>
    random(x * lineFrequency + time * lineSpeed) * horizontalFade + offset;

  const resizeCanvas = () => {
    width = Math.max(1, window.innerWidth);
    height = Math.max(1, window.innerHeight);
    canvas.width = width;
    canvas.height = height;

    horizontalBackground = context.createLinearGradient(0, 0, width, 0);
    horizontalBackground.addColorStop(0, "rgb(26 26 77)");
    horizontalBackground.addColorStop(1, "rgb(77 26 128)");

    verticalShade = context.createLinearGradient(0, 0, 0, height);
    verticalShade.addColorStop(0, "rgba(0, 0, 0, 1)");
    verticalShade.addColorStop(0.146, "rgba(0, 0, 0, 0.8)");
    verticalShade.addColorStop(0.25, "rgba(0, 0, 0, 0.5)");
    verticalShade.addColorStop(0.354, "rgba(0, 0, 0, 0.2)");
    verticalShade.addColorStop(0.5, "rgba(0, 0, 0, 0)");
    verticalShade.addColorStop(0.646, "rgba(0, 0, 0, 0.2)");
    verticalShade.addColorStop(0.75, "rgba(0, 0, 0, 0.5)");
    verticalShade.addColorStop(0.854, "rgba(0, 0, 0, 0.8)");
    verticalShade.addColorStop(1, "rgba(0, 0, 0, 1)");
  };

  const getLinePoint = (lineIndex: number, x: number, time: number) => {
    const uvX = x / width;
    const horizontalFade = 1 - (Math.cos(uvX * Math.PI * 2) * 0.5 + 0.5);
    const baseSpaceX = ((x - width / 2) / width) * 2 * scale;
    let effectiveX = baseSpaceX;
    let spaceY = 0;
    let rand = 0;
    let halfWidth = 0.01;

    for (let iteration = 0; iteration < 2; iteration += 1) {
      const offsetTime = time * offsetSpeed;
      const offsetPosition = lineIndex + effectiveX * offsetFrequency;
      rand = random(offsetPosition + offsetTime) * 0.5 + 0.5;
      halfWidth = 0.01 + (0.2 - 0.01) * rand * horizontalFade;
      halfWidth /= 2;
      const spread = minOffsetSpread + (maxOffsetSpread - minOffsetSpread) * horizontalFade;
      const offset = random(offsetPosition + offsetTime * (1 + lineIndex / linesPerGroup)) * spread;
      const linePosition = getPlasmaY(effectiveX, horizontalFade, offset, time);
      spaceY =
        linePosition -
        random(effectiveX * warpFrequency + time * warpSpeed) *
          warpAmplitude *
          (0.5 + horizontalFade);
      effectiveX =
        baseSpaceX +
        random(spaceY * warpFrequency + time * warpSpeed + 2) *
          warpAmplitude *
          horizontalFade;
    }

    const xPixelsPerSpace = width / (2 * scale);
    const yPixelsPerSpace = height / (2 * scale);
    return {
      x,
      y: height / 2 - spaceY * yPixelsPerSpace,
      rand,
      width: Math.max(0.7, halfWidth * 2 * xPixelsPerSpace),
    };
  };

  const drawBackground = () => {
    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";
    context.fillStyle = horizontalBackground;
    context.fillRect(0, 0, width, height);
    context.fillStyle = verticalShade;
    context.fillRect(0, 0, width, height);
  };

  const draw = (now: number) => {
    const time = (now - startedAt) / 1000;
    drawBackground();
    context.lineCap = "round";
    context.lineJoin = "round";
    const sampleStep = Math.max(6, Math.round(width / 260));

    for (let lineIndex = 0; lineIndex < linesPerGroup; lineIndex += 1) {
      const points = [];
      let averageRand = 0;
      let averageWidth = 0;

      for (let x = 0; x <= width + sampleStep; x += sampleStep) {
        const point = getLinePoint(lineIndex, x, time);
        points.push(point);
        averageRand += point.rand;
        averageWidth += point.width;
      }

      averageRand /= points.length;
      averageWidth /= points.length;
      context.beginPath();
      points.forEach((point, index) => {
        if (index === 0) context.moveTo(point.x, point.y);
        else context.lineTo(point.x, point.y);
      });
      context.strokeStyle = `rgba(102, 51, 204, ${0.28 + averageRand * 0.34})`;
      context.lineWidth = averageWidth;
      context.stroke();
      context.strokeStyle = `rgba(102, 51, 204, ${0.62 + averageRand * 0.38})`;
      context.lineWidth = Math.max(0.65, averageWidth * 0.15);
      context.stroke();

      const circleSpaceX = ((lineIndex + time * lineSpeed) % 25) - 12;
      const circleX = width / 2 + circleSpaceX * (width / (2 * scale));
      if (circleX >= 0 && circleX <= width) {
        const circlePoint = getLinePoint(lineIndex, circleX, time);
        context.beginPath();
        context.arc(circleX, circlePoint.y, Math.max(1.2, width * 0.0015), 0, Math.PI * 2);
        context.fillStyle = `rgba(102, 51, 204, ${0.7 + circlePoint.rand * 0.3})`;
        context.fill();
      }
    }

    canvas.dataset.shaderStatus = "canvas-fallback-running";
  };

  const render = (now: number) => {
    draw(now);
    animationFrame = window.requestAnimationFrame(render);
  };

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  if (reducedMotion) draw(performance.now());
  else animationFrame = window.requestAnimationFrame(render);

  return () => {
    window.cancelAnimationFrame(animationFrame);
    window.removeEventListener("resize", resizeCanvas);
  };
}
