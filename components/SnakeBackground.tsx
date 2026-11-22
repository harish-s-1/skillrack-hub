"use client";

import { useEffect, useRef, useState } from "react";

type P = { x: number; y: number };

const N = 34; // body segments
const SPACING = 9; // px between segments
const R = 9; // thickest radius
const IDLE_MS = 3000; // still this long and the snake starts roaming
const STORE = "skillrack-snake";
const TAU = Math.PI * 2;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const angDiff = (a: number, b: number) => {
  let d = b - a;
  while (d > Math.PI) d -= TAU;
  while (d < -Math.PI) d += TAU;
  return d;
};

export default function SnakeBackground() {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const [on, setOn] = useState(true);
  const [canToggle, setCanToggle] = useState(false);

  // Remembered choice. People who asked their device for less motion get no snake.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setOn(false);
      return;
    }
    setCanToggle(true);
    try {
      if (localStorage.getItem(STORE) === "off") setOn(false);
    } catch {}
  }, []);

  const toggle = () => {
    const next = !on;
    setOn(next);
    try {
      localStorage.setItem(STORE, next ? "on" : "off");
    } catch {}
  };

  useEffect(() => {
    if (!on) return;
    const cv = cvRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    const measure = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = cv.clientWidth;
      h = cv.clientHeight;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    measure();

    const segs: P[] = Array.from({ length: N }, (_, i) => ({ x: w * 0.5 - i * SPACING, y: h * 0.35 }));
    const pos: P[] = segs.map((s) => ({ ...s }));

    let tx = w / 2;
    let ty = h / 2;
    let lastMove = -Infinity; // roams right away until the cursor moves
    let t = 0;
    let speed = 0;
    let heading = 0;
    let wp: P | null = null;
    let wpAt = 0;
    let frames = 0;
    const colors = { a: "#2757d6", b: "#5580e0" };
    const readColors = () => {
      const cs = getComputedStyle(document.documentElement);
      colors.a = cs.getPropertyValue("--accent").trim() || colors.a;
      colors.b = cs.getPropertyValue("--h3").trim() || colors.b;
    };
    readColors();

    const onPointer = (e: PointerEvent) => {
      tx = clamp(e.clientX, 8, Math.max(8, w - 8));
      ty = clamp(e.clientY, 8, Math.max(8, h - 8));
      lastMove = performance.now();
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("pointerdown", onPointer, { passive: true });

    const pickWaypoint = (from: P): P => {
      let best: P = { x: w / 2, y: h / 2 };
      for (let i = 0; i < 6; i++) {
        best = { x: 40 + Math.random() * Math.max(1, w - 80), y: 40 + Math.random() * Math.max(1, h - 80) };
        if (Math.hypot(best.x - from.x, best.y - from.y) > Math.min(w, h) * 0.25) break;
      }
      return best;
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const amp = 1.5 + Math.min(1, speed / 300) * 5.5;

      for (let i = 0; i < N; i++) {
        const next = i === 0 ? segs[1] : segs[i];
        const prev = i === 0 ? segs[0] : segs[i - 1];
        const a = Math.atan2(prev.y - next.y, prev.x - next.x);
        const wob = Math.sin(t * 9 - i * 0.55) * amp * (0.2 + (i / N) * 0.8);
        pos[i].x = segs[i].x + Math.cos(a + Math.PI / 2) * wob;
        pos[i].y = segs[i].y + Math.sin(a + Math.PI / 2) * wob;
      }

      for (let i = N - 1; i >= 1; i--) {
        const k = i / (N - 1);
        const r = R * (0.38 + 0.62 * Math.pow(1 - k, 0.55));
        ctx.fillStyle = i % 4 < 2 ? colors.a : colors.b;
        ctx.beginPath();
        ctx.arc(pos[i].x, pos[i].y, r, 0, TAU);
        ctx.fill();
      }

      const ang = Math.atan2(pos[0].y - pos[2].y, pos[0].x - pos[2].x);
      ctx.save();
      ctx.translate(pos[0].x, pos[0].y);
      ctx.rotate(ang);
      if (Math.sin(t * 2.6) > 0.8) {
        ctx.strokeStyle = "#e5484d";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(R, 0);
        ctx.lineTo(R * 2.1, 0);
        ctx.moveTo(R * 2.1, 0);
        ctx.lineTo(R * 2.7, -R * 0.35);
        ctx.moveTo(R * 2.1, 0);
        ctx.lineTo(R * 2.7, R * 0.35);
        ctx.stroke();
      }
      ctx.fillStyle = colors.a;
      ctx.beginPath();
      ctx.ellipse(0, 0, R * 1.2, R * 1.0, 0, 0, TAU);
      ctx.fill();
      for (const side of [-1, 1]) {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(R * 0.45, side * R * 0.5, R * 0.34, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#0e1117";
        ctx.beginPath();
        ctx.arc(R * 0.56, side * R * 0.5, R * 0.17, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    };

    let raf = 0;
    let prev = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      t += dt;
      if (++frames % 120 === 0) readColors();

      const head = segs[0];
      if (now - lastMove <= IDLE_MS) {
        // Chase the cursor
        const dx = tx - head.x;
        const dy = ty - head.y;
        const dist = Math.hypot(dx, dy);
        const sp = Math.min(dist * 5, 560);
        if (dist > 1) {
          head.x += (dx / dist) * sp * dt;
          head.y += (dy / dist) * sp * dt;
        }
        speed = lerp(speed, sp, 0.1);
        heading = Math.atan2(head.y - segs[1].y, head.x - segs[1].x);
        wp = null;
      } else {
        // Roam: head for a random spot, turning in smooth curves
        if (!wp || Math.hypot(wp.x - head.x, wp.y - head.y) < 50 || now - wpAt > 7000) {
          wp = pickWaypoint(head);
          wpAt = now;
        }
        const want = Math.atan2(wp.y - head.y, wp.x - head.x);
        heading += clamp(angDiff(heading, want), -2.2 * dt, 2.2 * dt);
        const sp = 150;
        head.x = clamp(head.x + Math.cos(heading) * sp * dt, 8, Math.max(8, w - 8));
        head.y = clamp(head.y + Math.sin(heading) * sp * dt, 8, Math.max(8, h - 8));
        speed = lerp(speed, sp, 0.1);
      }

      for (let i = 1; i < N; i++) {
        const a = segs[i - 1];
        const b = segs[i];
        const ddx = b.x - a.x;
        const ddy = b.y - a.y;
        const d = Math.hypot(ddx, ddy) || 1;
        if (d > SPACING) {
          b.x = a.x + (ddx / d) * SPACING;
          b.y = a.y + (ddy / d) * SPACING;
        }
      }
      draw();
    };
    raf = requestAnimationFrame(frame);

    const ro = new ResizeObserver(() => {
      measure();
      for (const s of segs) {
        s.x = clamp(s.x, 8, Math.max(8, w - 8));
        s.y = clamp(s.y, 8, Math.max(8, h - 8));
      }
    });
    ro.observe(cv);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onPointer);
      ro.disconnect();
    };
  }, [on]);

  return (
    <>
      {on && <canvas ref={cvRef} className="snake-bg" aria-hidden="true" />}
      {canToggle && (
        <button type="button" className="snake-toggle" onClick={toggle} aria-pressed={on} title="Turn the snake on or off">
          {on ? "Snake: on" : "Snake: off"}
        </button>
      )}
    </>
  );
}
