import React, { useEffect, useRef } from 'react';

/**
 * Ambient floating-particles background layer.
 *
 * Renders an absolutely-positioned canvas filled with ~140 slowly drifting
 * teal particles. The canvas internal dimensions track the displayed CSS size
 * via ResizeObserver so particles always render as perfect circles, regardless
 * of how tall the page is (e.g. the long Results page where the document
 * grows to 4000+ CSS pixels). Without this, the canvas's fixed 1080×1920
 * internal grid would be stretched vertically and the particles would render
 * as elongated ovals.
 *
 * Particle density (particles per million CSS pixels) is held constant when
 * the canvas resizes, so a tall page has proportionally more particles than
 * a short page; keeps the visual texture consistent rather than thinning
 * out on long content.
 *
 * Usage:
 *   <div style={{ position: 'relative', zIndex: 0, ... }}>
 *     <BackgroundParticles />
 *     ... in-flow content here ...
 *   </div>
 *
 * The parent must establish a stacking context (position: relative + zIndex 0,
 * or isolation: isolate) and have a solid background. The canvas paints at
 * zIndex: -1 between the parent background and the in-flow children, so no
 * child needs an explicit z-index.
 */

// Particles per million CSS pixels, tuned to ~68 particles on a 1080×1920
// viewport, scaling proportionally on longer pages. Capped to avoid runaway
// density on extreme viewports.
const PARTICLE_DENSITY = 68 / (1080 * 1920);
const MIN_PARTICLES = 60;
const MAX_PARTICLES = 280;

function makeParticle(w, h) {
  return {
    x: Math.random() * (w + 500) - 250,
    y: Math.random() * h,
    r: Math.random() * 3.5 + 0.8,
    speed: Math.random() * 0.8 + 0.2,
    opacity: Math.random() * 0.2 + 0.03,
    hue: Math.random() * 30 + 165,         // teal/aqua range (~165°..195°)
    glow: Math.random() > 0.92,            // ~8% of particles have a soft halo
    drift: (Math.random() - 0.5) * 0.3,
    phase: Math.random() * Math.PI * 2,
    waveAmp: Math.random() * 40 + 10,
    waveSpeed: Math.random() * 0.01 + 0.005,
  };
}

export function BackgroundParticles() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let w = 1080;
    let h = 1920;
    let particles = [];

    const setDimensionsAndParticles = () => {
      const rect = canvas.getBoundingClientRect();
      // Bail if the canvas isn't laid out yet (rect is 0×0), ResizeObserver
      // will fire again once the parent has measurable dimensions.
      if (rect.width === 0 || rect.height === 0) return;

      const newW = Math.floor(rect.width);
      const newH = Math.floor(rect.height);
      if (newW === w && newH === h && particles.length > 0) return; // nothing to do

      w = canvas.width = newW;
      h = canvas.height = newH;

      // Density-scaled particle count (clamped)
      const targetCount = Math.max(
        MIN_PARTICLES,
        Math.min(MAX_PARTICLES, Math.round(PARTICLE_DENSITY * w * h))
      );

      // Recycle existing particles if possible; spawn or trim to hit target count.
      if (particles.length === 0) {
        for (let i = 0; i < targetCount; i++) particles.push(makeParticle(w, h));
      } else if (particles.length < targetCount) {
        // Add new particles at random positions within the new bounds
        while (particles.length < targetCount) particles.push(makeParticle(w, h));
      } else if (particles.length > targetCount) {
        particles.length = targetCount;
      }

      // Clamp existing particle y into new bounds if the canvas shrank vertically
      for (const p of particles) {
        if (p.y > h) p.y = Math.random() * h;
      }
    };

    // Initial sizing
    setDimensionsAndParticles();

    const ro = new ResizeObserver(setDimensionsAndParticles);
    ro.observe(canvas);

    let t = 0;
    const draw = () => {
      t++;
      ctx.clearRect(0, 0, w, h);

      for (const p of particles) {
        p.x += p.speed;
        const wave = Math.sin(t * p.waveSpeed + p.phase) * p.waveAmp;
        const drawY = p.y + wave + p.drift * t * 0.1;

        // Wrap horizontally so the field keeps refilling from the left
        if (p.x > w + 50) {
          p.x = -50;
          p.y = Math.random() * h;
          p.phase = Math.random() * Math.PI * 2;
        }

        // Light-theme colouring: deep-teal particles at low opacity read as a
        // subtle texture on the pale background (the dark kiosk build used
        // bright/high-lightness teals instead).
        if (p.glow) {
          const grad = ctx.createRadialGradient(p.x, drawY, 0, p.x, drawY, p.r * 8);
          grad.addColorStop(0, `hsla(${p.hue}, 60%, 40%, ${p.opacity * 0.12})`);
          grad.addColorStop(1, `hsla(${p.hue}, 60%, 40%, 0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, drawY, p.r * 8, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = `hsla(${p.hue}, 55%, ${p.glow ? 34 : 30}%, ${p.opacity * 0.7})`;
        ctx.beginPath();
        ctx.arc(p.x, drawY, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!reduceMotion) raf = requestAnimationFrame(draw);   // respect prefers-reduced-motion: paint one static frame
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0, left: 0, width: '100%', height: '100%',
        zIndex: -1,
        pointerEvents: 'none',
      }}
    />
  );
}
