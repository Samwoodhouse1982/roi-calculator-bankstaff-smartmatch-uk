import React, { useEffect, useRef, useCallback, useState } from 'react';
import { C } from '../theme';
import rldatixLogo from '../assets/rldatix-logo.png';

// Timings (ms) for the launch animation. Tune here.
const CONVERGE_MS = 700;       // particles fly toward the button
const WIPE_DELAY_MS = 500;     // radial wipe starts before convergence finishes (overlap)
const WIPE_MS = 700;           // radial wipe duration
// After the wipe peaks (coral core fully visible), a uniform dark overlay fades in
// to neutralise the coral so the handoff to the calculator is seamless rather than a
// jarring coral-to-navy snap.
const SETTLE_DELAY_MS = 900;   // starts before wipe finishes (overlaps the bright peak)
const SETTLE_MS = 500;         // fade-in duration of the dark overlay
const TOTAL_LAUNCH_MS = SETTLE_DELAY_MS + SETTLE_MS + 50; // 1450ms — 50ms buffer after settle completes

export function SplashScreen({ onStart, onAdminReveal }) {
  // Single tap on the RLDatix logo at the bottom reveals the hidden admin stats overlay.
  // Reset is PIN-protected so accidental discovery doesn't risk losing the stats.
  const handleLogoTap = useCallback((e) => {
    e.stopPropagation();
    if (onAdminReveal) onAdminReveal();
  }, [onAdminReveal]);

  // Launch state lives in BOTH a ref (for the canvas animation loop, which is set up once
  // in useEffect and would otherwise capture stale state) and React state (for the wipe
  // overlay, which is a conditional element). Ref is source of truth for the animation
  // loop; React state mirrors it for render purposes.
  const launchingRef = useRef(false);
  const launchStartRef = useRef(0);
  const buttonTargetRef = useRef({ x: 540, y: 900 }); // canvas-internal coords; updated on click
  const [launching, setLaunching] = useState(false);
  const [wipeOrigin, setWipeOrigin] = useState({ x: 540, y: 900 }); // CSS pixels for overlay positioning

  const canvasRef = useRef(null);
  const buttonRef = useRef(null);
  const containerRef = useRef(null);

  const handleStart = useCallback((e) => {
    if (e) e.stopPropagation();
    if (launchingRef.current) return; // prevent double-trigger

    // Capture button position in two coordinate systems:
    // (1) Canvas-internal coords (1080×1920 space) — for particle target
    // (2) CSS pixel coords relative to the container — for the radial wipe overlay
    if (buttonRef.current && canvasRef.current && containerRef.current) {
      const bRect = buttonRef.current.getBoundingClientRect();
      const cRect = canvasRef.current.getBoundingClientRect();
      const contRect = containerRef.current.getBoundingClientRect();

      // Button center in CSS pixels
      const btnCssX = bRect.left + bRect.width / 2;
      const btnCssY = bRect.top + bRect.height / 2;

      // Convert to canvas-internal coords (canvas is 1080×1920 stretched to its display size)
      const xRatio = 1080 / cRect.width;
      const yRatio = 1920 / cRect.height;
      buttonTargetRef.current = {
        x: (btnCssX - cRect.left) * xRatio,
        y: (btnCssY - cRect.top) * yRatio,
      };

      // For the overlay: position relative to the container in CSS pixels
      setWipeOrigin({
        x: btnCssX - contRect.left,
        y: btnCssY - contRect.top,
      });
    }

    // Trigger launch
    launchStartRef.current = performance.now();
    launchingRef.current = true;
    setLaunching(true);

    // After full animation, hand off to parent
    setTimeout(() => {
      if (onStart) onStart();
    }, TOTAL_LAUNCH_MS);
  }, [onStart]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;
    let w, h;

    const resize = () => {
      w = canvas.width = 1080;
      h = canvas.height = 1920;
    };
    resize();

    const particles = [];
    const PARTICLE_COUNT = 140;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * (w + 500) - 250,
        y: Math.random() * h,
        r: Math.random() * 3.5 + 0.8,
        baseR: 0, // captured at launch start
        speed: Math.random() * 0.8 + 0.2,
        opacity: Math.random() * 0.2 + 0.03,
        hue: Math.random() * 18 - 2,   // coral/red range (~-2°..16°)
        glow: Math.random() > 0.92,
        drift: (Math.random() - 0.5) * 0.3,
        phase: Math.random() * Math.PI * 2,
        waveAmp: Math.random() * 40 + 10,
        waveSpeed: Math.random() * 0.01 + 0.005,
        // Launch animation fields — captured at launch start
        startX: 0,
        startY: 0,
        captured: false,
      });
    }

    let t = 0;
    const draw = () => {
      t++;
      ctx.clearRect(0, 0, w, h);

      const isLaunching = launchingRef.current;
      const target = buttonTargetRef.current;

      // Compute convergence progress (0 -> 1 over CONVERGE_MS)
      let convergeProgress = 0;
      if (isLaunching) {
        const elapsed = performance.now() - launchStartRef.current;
        convergeProgress = Math.min(1, elapsed / CONVERGE_MS);
        // Ease-in cubic: starts slow, accelerates strongly — like a gravitational pull
        convergeProgress = convergeProgress * convergeProgress * convergeProgress;
      }

      for (const p of particles) {
        if (isLaunching) {
          // On first launch frame for each particle, capture its current visual position
          // (including wave offset) so the animation starts from where it visibly is.
          if (!p.captured) {
            const currentWave = Math.sin(t * p.waveSpeed + p.phase) * p.waveAmp;
            p.startX = p.x;
            p.startY = p.y + currentWave + p.drift * t * 0.1;
            p.baseR = p.r;
            p.captured = true;
          }

          // Interpolate from start position to button target
          const drawX = p.startX + (target.x - p.startX) * convergeProgress;
          const drawY = p.startY + (target.y - p.startY) * convergeProgress;
          // Shrink slightly as they approach (so they don't pile up)
          const r = p.baseR * (1 - convergeProgress * 0.5);
          // Boost opacity as they gather
          const op = p.opacity + convergeProgress * 0.3;

          if (p.glow) {
            const grad = ctx.createRadialGradient(drawX, drawY, 0, drawX, drawY, r * 10);
            grad.addColorStop(0, `hsla(${p.hue}, 90%, 70%, ${op * 0.3})`);
            grad.addColorStop(1, `hsla(${p.hue}, 90%, 70%, 0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(drawX, drawY, r * 10, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.fillStyle = `hsla(${p.hue}, 85%, ${p.glow ? 75 : 62}%, ${op})`;
          ctx.beginPath();
          ctx.arc(drawX, drawY, Math.max(0.1, r), 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Normal drift behaviour (unchanged from original)
          p.x += p.speed;
          const wave = Math.sin(t * p.waveSpeed + p.phase) * p.waveAmp;
          const drawY = p.y + wave + p.drift * t * 0.1;

          if (p.x > w + 50) {
            p.x = -50;
            p.y = Math.random() * h;
            p.phase = Math.random() * Math.PI * 2;
          }

          if (p.glow) {
            const grad = ctx.createRadialGradient(p.x, drawY, 0, p.x, drawY, p.r * 8);
            grad.addColorStop(0, `hsla(${p.hue}, 80%, 65%, ${p.opacity * 0.15})`);
            grad.addColorStop(1, `hsla(${p.hue}, 80%, 65%, 0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p.x, drawY, p.r * 8, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.fillStyle = `hsla(${p.hue}, 75%, ${p.glow ? 78 : 58}%, ${p.opacity})`;
          ctx.beginPath();
          ctx.arc(p.x, drawY, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={containerRef} style={{
      position: 'relative', zIndex: 100, width: 1080, minHeight: 1920, height: '100vh',
      background: 'linear-gradient(160deg, #0B1424 0%, #0E1726 25%, #16263F 50%, #0E1726 75%, #0B1424 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
      overflow: 'hidden', cursor: launching ? 'default' : 'pointer',
    }} onClick={launching ? undefined : handleStart}>

      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }} />

      <div style={{ position: 'absolute', inset: 0, zIndex: 1,
        background: 'radial-gradient(ellipse at 30% 50%, rgba(232,57,42,0.07) 0%, transparent 60%), radial-gradient(ellipse at 70% 30%, rgba(240,92,80,0.05) 0%, transparent 50%)',
      }} />

      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: 1000, padding: '75px 80px', marginTop: '15vh',
        // Subtle fade-out of content while the wipe expands, so the title doesn't bleed through
        opacity: launching ? 0.3 : 1,
        transition: 'opacity 600ms ease-out',
      }}>

        <div style={{
          fontSize: 20, fontWeight: 600, letterSpacing: 10, textTransform: 'uppercase',
          color: C.accent, marginBottom: 50, opacity: 0.95,
        }}>RLDatix · Smart Match</div>

        <h1 style={{
          fontSize: 86, fontWeight: 800, lineHeight: 1.12, color: '#fff',
          margin: '0 0 24px', letterSpacing: '-1.5px',
        }}>
          Your Workforce ROI
        </h1>

        {/* Coral accent line under the title */}
        <div style={{
          width: 160, height: 6, borderRadius: 3, margin: '0 auto 32px',
          background: `linear-gradient(90deg, ${C.accent}, ${C.accentMid})`,
          boxShadow: `0 0 24px ${C.accent}99`,
        }} />

        <p style={{
          fontSize: 28, fontWeight: 400, color: 'rgba(255,255,255,0.80)',
          lineHeight: 1.6, margin: '0 auto 75px', maxWidth: 760,
        }}>
          See the cash your trust could release by improving bank-staff utilisation — moving temporary work off expensive agency and onto your own bank.
        </p>

        <button ref={buttonRef} onClick={handleStart} style={{
          display: 'block', margin: '0 auto',
          padding: '30px 90px', borderRadius: 80, border: `3px solid ${C.accent}`,
          background: 'rgba(232,57,42,0.18)', color: '#fff',
          fontSize: 30, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
          letterSpacing: 4,
          textTransform: 'uppercase',
          // During launch, freeze the pulse and brighten/scale to look like the button is
          // absorbing the converging particles.
          boxShadow: launching
            ? '0 0 200px rgba(232,57,42,0.95), inset 0 0 80px rgba(232,57,42,0.4)'
            : '0 0 80px rgba(232,57,42,0.35), inset 0 0 60px rgba(232,57,42,0.08)',
          transform: launching ? 'scale(1.08)' : 'scale(1)',
          transition: 'box-shadow 600ms ease-out, transform 600ms ease-out',
          animation: launching ? 'none' : 'splashPulseBig 2s ease-in-out infinite',
        }}>
          Tap to Start
        </button>

        <style>{`
          @keyframes splashPulseBig {
            0%, 100% { box-shadow: 0 0 80px rgba(232,57,42,0.35), inset 0 0 60px rgba(232,57,42,0.08); transform: scale(1); }
            50% { box-shadow: 0 0 120px rgba(232,57,42,0.55), inset 0 0 80px rgba(232,57,42,0.15); transform: scale(1.02); }
          }
          @keyframes radialWipe {
            0%   { width: 0;      height: 0;      opacity: 1; }
            100% { width: 4400px; height: 4400px; opacity: 1; }
          }
          @keyframes radialSettle {
            0%   { opacity: 0; }
            100% { opacity: 1; }
          }
        `}</style>

      </div>

      <img src={rldatixLogo} alt="RLDatix" onClick={handleLogoTap} style={{
        position: 'absolute', bottom: 50, left: '50%', transform: 'translateX(-50%)',
        width: 450, opacity: launching ? 0.15 : 0.5, zIndex: 3, cursor: 'pointer',
        transition: 'opacity 600ms ease-out',
      }} />
      <div style={{
        position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)',
        fontSize: 14, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, zIndex: 3, whiteSpace: 'nowrap',
        transition: 'opacity 600ms ease-out',
        opacity: launching ? 0.2 : 1,
      }}>Smart Match · Bank-Staff Utilisation ROI</div>

      {/* Radial wipe overlay — expands from the button position to cover the screen.
          Becomes visible after WIPE_DELAY_MS (overlapping the tail of particle convergence),
          so users see particles arriving AND energy releasing in one continuous motion.
          Final size 4400px covers all corners of 1080×1920 even at maximum offset.
          Outer colour (#0E1726) matches the calculator background exactly so there's no
          visible edge-transition when the swap happens. */}
      {launching && (
        <div style={{
          position: 'absolute',
          top: wipeOrigin.y,
          left: wipeOrigin.x,
          width: 0,
          height: 0,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(232,57,42,0.95) 0%, rgba(60,30,40,0.95) 55%, #0E1726 100%)',
          transform: 'translate(-50%, -50%)',
          animation: `radialWipe ${WIPE_MS}ms cubic-bezier(0.4, 0, 0.2, 1) ${WIPE_DELAY_MS}ms forwards`,
          zIndex: 50,
          pointerEvents: 'none',
        }} />
      )}

      {/* Settle overlay — a uniform calculator-background-colour layer that fades in
          on top of the wipe, so the splash→calculator swap is invisible. */}
      {launching && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: '#0E1726',
          opacity: 0,
          animation: `radialSettle ${SETTLE_MS}ms ease-in ${SETTLE_DELAY_MS}ms forwards`,
          zIndex: 51,
          pointerEvents: 'none',
        }} />
      )}
    </div>
  );
}
