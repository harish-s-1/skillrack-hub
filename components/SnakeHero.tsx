"use client";

import { useEffect, useRef, useState } from "react";

type P = { x: number; y: number };

const N = 34; // body segments
const SPACING = 9; // px between segments
const R = 9; // thickest radius

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

export default function SnakeHero() {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [moved, setMoved] = useState(false);

  useEffect(() => {
    const box = wrap.current;
    const cv = canvas.current;
    if (!box || !cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    const measure = () => {
      const r = box.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width;
      h = r.height;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    measure();

    // Start stretched out to the left of the centre
    const segs: P[] = Array.from({ length: N }, (_, i) => ({ x: w / 2 - i * SPACING, y: h / 2 }));
    const pos: P[] = segs.map((s) => ({ ...s }));

    let tx = w / 2;
    let ty = h / 2;
    let lastMove = -Infinity;
    let t = 0;
    let speed = 0;
    let visible = true;
    let didMove = false;
    let frames = 0;
    const colors = { a: "#2757d6", b: "#5580e0" };
    const readColors = () => {
      const cs = getComputedStyle(document.documentElement);
      colors.a = cs.getPropertyValue("--accent").trim() || colors.a;
      colors.b = cs.getPropertyValue("--h3").trim() || colors.b;
    };
    readColors();

    const onPointer = (e: PointerEvent) => {
      const r = box.getBoundingClientRect();
      tx = clamp(e.clientX - r.left, 16, Math.max(16, w - 16));
      ty = clamp(e.clientY - r.top, 16, Math.max(16, h - 16));
      lastMove = performance.now();
      if (!didMove) {
        didMove = true;
        setMoved(true);
      }
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("pointerdown", onPointer, { passive: true });

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const amp = 1.5 + Math.min(1, speed / 300) * 5.5;

      // Positions with a sideways wiggle that travels down the body
      for (let i = 0; i < N; i++) {
        const next = i === 0 ? segs[1] : segs[i];
        const prev = i === 0 ? segs[0] : segs[i - 1];
        const a = Math.atan2(prev.y - next.y, prev.x - next.x);
        const wob = Math.sin(t * 9 - i * 0.55) * amp * (0.2 + (i / N) * 0.8);
        pos[i].x = segs[i].x + Math.cos(a + Math.PI / 2) * wob;
        pos[i].y = segs[i].y + Math.sin(a + Math.PI / 2) * wob;
      }

      // Body, tail first so the head ends up on top
      for (let i = N - 1; i >= 1; i--) {
        const k = i / (N - 1);
        const r = R * (0.38 + 0.62 * Math.pow(1 - k, 0.55));
        ctx.fillStyle = i % 4 < 2 ? colors.a : colors.b;
        ctx.beginPath();
        ctx.arc(pos[i].x, pos[i].y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Head
      const ang = Math.atan2(pos[0].y - pos[2].y, pos[0].x - pos[2].x);
      ctx.save();
      ctx.translate(pos[0].x, pos[0].y);
      ctx.rotate(ang);

      // Tongue flicks now and then
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
      ctx.ellipse(0, 0, R * 1.2, R * 1.0, 0, 0, Math.PI * 2);
      ctx.fill();
      for (const side of [-1, 1]) {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(R * 0.45, side * R * 0.5, R * 0.34, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#0e1117";
        ctx.beginPath();
        ctx.arc(R * 0.56, side * R * 0.5, R * 0.17, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    let raf = 0;
    let prev = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible) {
        prev = now;
        return;
      }
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      t += dt;
      if (++frames % 120 === 0) readColors();

      // Follow the cursor, or wander when it has been still for a while
      const idle = now - lastMove > 2500;
      const gx = idle ? w / 2 + Math.cos(t * 0.7) * w * 0.32 : tx;
      const gy = idle ? h / 2 + Math.sin(t * 1.3) * h * 0.28 : ty;
      const head = segs[0];
      const dx = gx - head.x;
      const dy = gy - head.y;
      const dist = Math.hypot(dx, dy);
      const sp = Math.min(dist * 5, idle ? 140 : 520);
      if (dist > 1) {
        head.x += (dx / dist) * sp * dt;
        head.y += (dy / dist) * sp * dt;
      }
      speed = lerp(speed, sp, 0.1);

      // Each segment stays one step behind the one in front of it
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

    if (reduce) {
      draw(); // one still frame, no animation
    } else {
      raf = requestAnimationFrame(frame);
    }

    const ro = new ResizeObserver(() => {
      measure();
      for (const s of segs) {
        s.x = clamp(s.x, 8, Math.max(8, w - 8));
        s.y = clamp(s.y, 8, Math.max(8, h - 8));
      }
      if (reduce) draw();
    });
    ro.observe(box);

    const io = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? true;
    });
    io.observe(box);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onPointer);
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  return (
    <div className="snake-box" ref={wrap} aria-hidden="true">
      <canvas ref={canvas} />
      <span className={`snake-hint${moved ? " gone" : ""}`}>Move your cursor, or drag on your phone</span>
    </div>
  );
}
