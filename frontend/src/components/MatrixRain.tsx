"use client";

import { useEffect, useRef } from "react";

/**
 * Full-viewport Matrix digital-rain canvas.
 * Runs behind the terminal so Neo's chat stays readable.
 */
export default function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Katakana + latin glyphs — classic Matrix cascade look
    const glyphs =
      "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ#$%&*+<>";
    const fontSize = 16;
    let columns = 0;
    let drops: number[] = [];
    let animationId = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      columns = Math.floor(canvas.width / fontSize);
      // Preserve existing drop positions when possible; fill new columns
      const next = Array.from({ length: columns }, (_, i) =>
        drops[i] !== undefined ? drops[i] : Math.random() * -40
      );
      drops = next;
    };

    const draw = () => {
      // Trail fade — low alpha keeps the cascading afterimage
      ctx.fillStyle = "rgba(1, 3, 1, 0.08)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const char = glyphs[Math.floor(Math.random() * glyphs.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // Bright head glyph, dimmer trail feel via color choice
        ctx.fillStyle = Math.random() > 0.975 ? "#c8ffd4" : "#00ff41";
        ctx.globalAlpha = 0.35;
        ctx.fillText(char, x, y);
        ctx.globalAlpha = 1;

        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        } else {
          drops[i]++;
        }
      }

      animationId = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
    />
  );
}
