// Noir toolkit for this video: real neon tubes (single-stroke glass, electrodes, standoffs, blackout jumps, ignition and
// faulty-transformer flicker, wet-street reflections), point clouds in perspective, rain, venetian-blind light, lamp cones,
// silhouettes, typewriter text, stamps and the 2.39:1 letterbox. Everything is a pure function of song time.
import { W, H } from '../engine/gl';
import { F, measure, textPoints } from '../engine/type';
import type { Line, Word } from '../engine/lyrics';
import { strokeText, type StrokeFontName, type StrokeText } from '../engine/stroke';
import { clamp, ease, hash, lerp, mulberry32, noise1, prog, TAU } from '../engine/util';
import { A, CAP, applyCam, clean, col, heat, setFont, slamScale } from '../scenes/kit';
import { txt, word, type S } from '../scenes/shots';

export { W, H, F, measure, clamp, ease, hash, lerp, mulberry32, noise1, prog, TAU, A, CAP, clean, col, heat, setFont, txt, word };
export type { S, Line, Word };

// ------------------------------------------------------------------ colour
export const NEON = {
  red: '#FF2B4E', pink: '#FF3FB4', teal: '#35E3E6', amber: '#FFA23A', blue: '#4F86FF', green: '#8BFF6A', white: '#F4F0FF',
} as const;
export type NeonK = keyof typeof NEON;
const CORE: Record<NeonK, string> = { red: '#FFD3DA', pink: '#FFD6F0', teal: '#DDFFFF', amber: '#FFF0C8', blue: '#DDE8FF', green: '#EEFFDD', white: '#FFFFFF' };
const rgb = (h: string) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const; };
/** rgba() of a hex colour. */
export const hx = (h: string, a = 1) => { const [r, g, b] = rgb(h); return `rgba(${r},${g},${b},${clamp(a)})`; };
/** Mix two hex colours (sRGB) with alpha. */
export const hmix = (a: string, b: string, k: number, al = 1) => {
  const x = rgb(a), y = rgb(b); k = clamp(k);
  return `rgba(${Math.round(lerp(x[0], y[0], k))},${Math.round(lerp(x[1], y[1], k))},${Math.round(lerp(x[2], y[2], k))},${clamp(al)})`;
};
/** Silver grey of value v (0..1) with alpha. */
export const grey = (v: number, a = 1) => { const q = Math.round(clamp(v) * 255); return `rgba(${q},${Math.round(q * 1.0)},${Math.round(Math.min(255, q * 1.03))},${clamp(a)})`; };

// ------------------------------------------------------------------ timing helpers
export const ln = (s: S, i = 0) => s.sh.lines[Math.min(i, s.sh.lines.length - 1)]!;
export const fw = (l: Line, re: RegExp) => l.words.find((w) => re.test(clean(w.w))) ?? l.words[l.words.length - 1]!;
export const fwAfter = (l: Line, re: RegExp, after: Word) => l.words.find((w) => w.index > after.index && re.test(clean(w.w))) ?? l.words[l.words.length - 1]!;
export const lastW = (l: Line) => l.words[l.words.length - 1]!;
export const on = (w: { start: number }, t: number, d = 0.3, f = ease.outCubic) => (t <= w.start - 0.05 ? 0 : prog(t, w.start - 0.05, w.start - 0.05 + d, f));
export const pulseAt = (t: number, t0: number, hl = 0.12) => (t < t0 ? 0 : Math.pow(0.5, (t - t0) / hl));
/** Index of the line being sung (or last started) in the shot. */
export const curLine = (L: Line[], t: number, lead = 0.15) => { let k = 0; L.forEach((l, i) => { if (t >= l.start - lead) k = i; }); return k; };
/** Shot progress 0..1. */
export const sp = (s: S) => clamp((s.t - s.sh.start) / Math.max(0.1, s.sh.end - s.sh.start));
/** Fade in at the shot start and out before its end (for overlays that must not pop). */
export const env = (s: S, fin = 0.25, fout = 0.25) => prog(s.t, s.sh.start, s.sh.start + fin) * (1 - prog(s.t, s.sh.end - fout, s.sh.end));

// ------------------------------------------------------------------ camera
export interface Cam { x: number; y: number; z: number; r: number }
/** Camera with the template's punch-in on the shot's first frames. */
export function cam(s: S, k: Cam, punch = 0.06) {
  const p = 1 + punch * (1 - prog(s.lt, 0, 0.35, ease.outExpo));
  const k2 = { ...k, z: k.z * p };
  applyCam(s.c, k2); applyCam(s.g, k2);
}
export function screen(s: S) { applyCam(s.c, { x: W / 2, y: H / 2, z: 1, r: 0 }); applyCam(s.g, { x: W / 2, y: H / 2, z: 1, r: 0 }); }
/** Hold-then-snap scalar. */
export function snapV(t: number, times: number[], vals: number[], dur = 0.45, fn = ease.outExpo) {
  let v = vals[0]!;
  for (let i = 1; i < vals.length; i++) { if (t < times[i]!) break; v = lerp(v, vals[i]!, prog(t, times[i]!, times[i]! + dur, fn)); }
  return v;
}
export function snapCam(t: number, times: number[], ks: Cam[], dur = 0.45, fn = ease.outExpo): Cam {
  return { x: snapV(t, times, ks.map((k) => k.x), dur, fn), y: snapV(t, times, ks.map((k) => k.y), dur, fn), z: Math.exp(snapV(t, times, ks.map((k) => Math.log(k.z)), dur, fn)), r: snapV(t, times, ks.map((k) => k.r), dur, fn) };
}

// ------------------------------------------------------------------ backgrounds
/** Fill the whole frame (screen space) with a vertical gradient of greys. */
export function backdrop(s: S, top = 0.03, bot = 0.07, a = 1) {
  const c = s.c; c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  const gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, grey(top, a)); gr.addColorStop(1, grey(bot, a));
  c.fillStyle = gr; c.fillRect(0, 0, W, H); c.restore();
}
/** Radial pool of light (screen or world space depending on the current transform). */
export function pool(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, a: number, sy = 1) {
  if (a <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(1, sy);
  const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  gr.addColorStop(0, fill.startsWith('#') ? hx(fill, a) : fill); gr.addColorStop(1, fill.startsWith('#') ? hx(fill, 0) : 'rgba(0,0,0,0)');
  ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.restore();
}
/** A cone of light from (x, y) pointing at angle `ang` (0 = straight down) with half-angle `spread`. */
export function cone(s: S, x: number, y: number, ang: number, spread: number, len: number, color: string, a: number, glowA = 0.25) {
  if (a <= 0) return;
  for (const [ctx, al] of [[s.c, a], [s.g, a * glowA]] as const) {
    if (al <= 0) continue;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    const gr = ctx.createLinearGradient(0, 0, 0, len);
    gr.addColorStop(0, hx(color, al)); gr.addColorStop(1, hx(color, 0));
    ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0);
    ctx.lineTo(Math.tan(spread) * len, len); ctx.lineTo(-Math.tan(spread) * len, len); ctx.closePath(); ctx.fill(); ctx.restore();
  }
}
/** Rain: slanted streaks in screen space (deterministic, falls with t). */
export function rain(s: S, n = 420, a = 0.22, slant = 0.16, seed = 3, tint?: string, speed = 1) {
  const c = s.c; c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  c.lineWidth = 1.4; c.lineCap = 'round';
  const r = mulberry32(seed);
  c.strokeStyle = tint ? hx(tint, a) : grey(0.85, a);
  c.beginPath();
  for (let i = 0; i < n; i++) {
    const x0 = r() * (W + 300) - 150, y0 = r() * H, v = (1400 + 900 * r()) * speed, l = 18 + 40 * r();
    const y = ((y0 + s.t * v) % (H + 80)) - 40, x = x0 + slant * y;
    c.moveTo(x, y); c.lineTo(x - slant * l, y - l);
  }
  c.stroke(); c.restore();
}
/** Venetian-blind light: a skewed window of slats thrown on the wall (screen space). */
export function blinds(s: S, x: number, y: number, w: number, h: number, skew: number, slats: number, open: number, color: string, a: number) {
  if (a <= 0) return;
  for (const [ctx, al] of [[s.c, a], [s.g, a * 0.35]] as const) {
    ctx.save(); ctx.transform(1, 0, skew, 1, 0, 0);
    const sh = h / slats;
    for (let i = 0; i < slats; i++) {
      const yy = y + i * sh, th = sh * clamp(open);
      const gr = ctx.createLinearGradient(x, 0, x + w, 0);
      gr.addColorStop(0, hx(color, al * 0.25)); gr.addColorStop(0.5, hx(color, al)); gr.addColorStop(1, hx(color, al * 0.3));
      ctx.fillStyle = gr; ctx.fillRect(x - skew * yy, yy, w, th);
    }
    ctx.restore();
  }
}
/** Film-noir letterbox (2.39:1) + an optional thin rule; drawn last, in screen space. */
export function letterbox(s: S, k = 1) {
  if (k <= 0) return;
  const bar = Math.round(((H - W / 2.39) / 2) * k);
  for (const ctx of [s.c, s.g]) {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = ctx === s.c ? 'rgba(0,0,0,1)' : 'rgba(0,0,0,1)';
    ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar); ctx.restore();
  }
}
export const LB = Math.round((H - W / 2.39) / 2); // letterbox bar height (138 px)

// ------------------------------------------------------------------ neon tubes
const ST = new Map<string, StrokeText>();
export function stext(text: string, font: StrokeFontName, size: number, tracking = 0) {
  const key = `${text}|${font}|${size}|${tracking}`;
  let v = ST.get(key);
  if (!v) { v = strokeText(text, font, size, tracking); ST.set(key, v); }
  return v;
}
/**
 * Ignition + faulty transformer: 0 before t0, a stuttering strike over ~0.25 s, then steady with a mains buzz and
 * (for `faulty` > 0) random drop-outs. Deterministic in t.
 */
export function ignite(t: number, t0: number, seed = 0, faulty = 0) {
  if (t < t0 - 0.02) return 0;
  const u = t - t0;
  let k: number;
  if (u < 0.26) {
    const seq = [1, 0.1, 0.85, 0.05, 0.6, 1, 0.3, 1];
    k = seq[Math.min(seq.length - 1, Math.floor((u / 0.26) * seq.length + hash(seed) * 0.5))]!;
  } else k = 1;
  const buzz = 0.93 + 0.07 * Math.sin(t * 377 + seed);
  if (faulty > 0) {
    const b = Math.floor(t * 14), r = hash(b, seed, 17);
    if (r < faulty * 0.25) k *= 0.08 + 0.3 * hash(b, seed, 3);
  }
  return k * buzz;
}
/** Dying-out: 1 until t1, then gutters out over `d` s. */
export const gutter = (t: number, t1: number, d = 0.35, seed = 0) => (t < t1 ? 1 : t > t1 + d ? 0 : (1 - (t - t1) / d) * (hash(Math.floor(t * 30), seed) > 0.35 ? 1 : 0.15));

export interface NeonOpts {
  font?: StrokeFontName; size?: number; color?: NeonK | string; core?: string; width?: number; tracking?: number;
  align?: 'c' | 'l' | 'r';
  /** 0..1 lit per character index (default: all lit). */
  lit?: (ci: number) => number;
  /** fraction of the strokes' length built (glass bent so far), for a draw-on of the unlit tube. */
  build?: number;
  /** draw the dim unlit glass where not lit (default true) */
  glass?: number;
  standoffs?: boolean; jumps?: boolean; electrodes?: boolean;
  /** mirror the sign about y = reflect (wet street), with ripple and alpha */
  reflect?: { y: number; a: number; ripple?: number; t?: number };
  glow?: number;
  /** a backing box (raceway) behind the sign */
  box?: { pad?: number; a?: number; r?: number };
  /** draw only the reflection (when the reflection is lit by different words than the sign) */
  reflectOnly?: boolean;
}
/**
 * A neon sign made of real glass tube: each stroke of a single-stroke font is a bent tube. Unlit glass is a pale grey
 * tube with a specular line; lit glass has a saturated body, a white-hot core and a wide halo on the glow layer. Letters
 * are joined by blacked-out jumps, tube ends carry electrode caps and long runs sit on standoff clips.
 * (x, y) = baseline anchor (centre by default). Returns { width, cap } in px.
 */
export function neon(s: S, text: string, x: number, y: number, o: NeonOpts = {}) {
  const font = o.font ?? 'readable', size = o.size ?? 160;
  const st = stext(text, font, size, o.tracking ?? 0);
  const col0 = o.color && o.color in NEON ? NEON[o.color as NeonK] : (o.color ?? NEON.red);
  const core = o.core ?? (o.color && o.color in CORE ? CORE[o.color as NeonK] : '#FFFFFF');
  const tw = o.width ?? Math.max(3, size * 0.055);
  const x0 = x - (o.align === 'l' ? 0 : o.align === 'r' ? st.width : st.width / 2);
  const lit = o.lit ?? (() => 1);
  const glassA = o.glass ?? 1;
  const build = o.build ?? 1;
  const { c, g } = s;
  const nS = st.strokes.length;
  const builtLen = st.total * clamp(build);
  const draw = (ctx: CanvasRenderingContext2D, fn: (pts: { x: number; y: number }[], i: number, k: number) => void, tf: (p: { x: number; y: number }) => { x: number; y: number }) => {
    for (let i = 0; i < nS; i++) {
      if (st.startLen[i]! >= builtLen) break;
      const L = st.lens[i]!, rem = builtLen - st.startLen[i]!;
      let pts = st.strokes[i]!;
      if (rem < L[L.length - 1]!) { const j = L.findIndex((v) => v > rem); pts = pts.slice(0, Math.max(2, j)); }
      fn(pts.map((p) => tf({ x: x0 + p.x, y: y + p.y })), i, lit(st.charOf[i]!));
      void ctx;
    }
  };
  const path = (ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[]) => { ctx.beginPath(); pts.forEach((p, j) => (j ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); };
  const pass = (ctx: CanvasRenderingContext2D, gctx: CanvasRenderingContext2D | null, tf: (p: { x: number; y: number }) => { x: number; y: number }, aMul: number) => {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (gctx) { gctx.save(); gctx.lineCap = 'round'; gctx.lineJoin = 'round'; }
    // backing raceway
    if (o.box && aMul === 1) {
      const pad = o.box.pad ?? size * 0.3, r0 = tf({ x: x0 - pad, y: y - st.capHeight - pad }), r1 = tf({ x: x0 + st.width + pad, y: y + pad * 0.8 });
      ctx.fillStyle = grey(0.05, o.box.a ?? 0.85); ctx.strokeStyle = grey(0.22, (o.box.a ?? 0.85) * 0.8); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(r0.x, r0.y, r1.x - r0.x, r1.y - r0.y, o.box.r ?? 18); ctx.fill(); ctx.stroke();
    }
    // jumps between strokes of the same word: blacked-out glass
    if (o.jumps !== false) {
      ctx.strokeStyle = grey(0.1, 0.9 * aMul); ctx.lineWidth = tw * 0.9;
      for (let i = 0; i + 1 < nS; i++) {
        if (st.startLen[i + 1]! >= builtLen) break;
        const a = st.strokes[i]!, b = st.strokes[i + 1]!, ca = st.charOf[i]!, cb = st.charOf[i + 1]!;
        if (text[cb] === ' ' || text[ca] === ' ' || cb - ca > 1) continue;
        const p = tf({ x: x0 + a[a.length - 1]!.x, y: y + a[a.length - 1]!.y }), q = tf({ x: x0 + b[0]!.x, y: y + b[0]!.y });
        if (Math.hypot(p.x - q.x, p.y - q.y) < tw * 1.2) continue;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.quadraticCurveTo((p.x + q.x) / 2, Math.max(p.y, q.y) + size * 0.12, q.x, q.y); ctx.stroke();
      }
    }
    // standoff clips under the glass
    if (o.standoffs !== false && aMul === 1) {
      ctx.fillStyle = grey(0.32, 0.9);
      draw(ctx, (pts, i) => {
        const L = st.lens[i]!, tot = L[L.length - 1]!;
        if (tot < size * 0.5) return;
        for (const f of [0.3, 0.75]) { const j = Math.min(pts.length - 1, L.findIndex((v) => v >= f * tot)); const p = pts[Math.max(0, j)]!; ctx.fillRect(p.x - tw * 0.35, p.y - tw * 0.9, tw * 0.7, tw * 1.8); }
      }, tf);
    }
    // unlit glass (always there: neon is visible as pale tube when off)
    if (glassA > 0) draw(ctx, (pts, _i, k) => {
      if (k >= 0.999) return;
      path(ctx, pts);
      ctx.strokeStyle = hmix('#3A3D44', col0, 0.28, 0.75 * glassA * aMul * (1 - k * 0.6)); ctx.lineWidth = tw; ctx.stroke();
      ctx.strokeStyle = grey(0.7, 0.28 * glassA * aMul * (1 - k)); ctx.lineWidth = Math.max(1, tw * 0.18); ctx.stroke();
    }, tf);
    // lit glass: body, hot core; halo on the glow layer
    draw(ctx, (pts, _i, k) => {
      if (k <= 0.01) return;
      path(ctx, pts);
      ctx.strokeStyle = hx(col0, k * aMul); ctx.lineWidth = tw; ctx.stroke();
      ctx.strokeStyle = hmix(col0, core, 0.85, k * aMul); ctx.lineWidth = Math.max(1, tw * 0.4); ctx.stroke();
      if (gctx) {
        path(gctx, pts);
        const gl = (o.glow ?? 1) * k * aMul;
        gctx.strokeStyle = hx(col0, 0.55 * gl); gctx.lineWidth = tw * 3.2; gctx.stroke();
        gctx.strokeStyle = hx(col0, 0.16 * gl); gctx.lineWidth = tw * 9; gctx.stroke();
      }
    }, tf);
    // electrode caps at the tube ends
    if (o.electrodes !== false && aMul === 1) {
      ctx.fillStyle = grey(0.16, 0.95);
      draw(ctx, (pts, i) => {
        const L = st.lens[i]!; if (L[L.length - 1]! < size * 0.35) return;
        for (const p of [pts[0]!, pts[pts.length - 1]!]) { ctx.beginPath(); ctx.arc(p.x, p.y, tw * 0.62, 0, TAU); ctx.fill(); }
      }, tf);
    }
    ctx.restore(); if (gctx) gctx.restore();
  };
  if (!o.reflectOnly) pass(c, g, (p) => p, 1);
  if (o.reflect) {
    const R = o.reflect, rt = R.t ?? s.t, amp = R.ripple ?? 6;
    const tf = (p: { x: number; y: number }) => {
      const yy = 2 * R.y - p.y;
      return { x: p.x + amp * Math.sin(yy * 0.09 + rt * 5.0) + amp * 0.6 * Math.sin(yy * 0.023 - rt * 2.1), y: yy };
    };
    pass(c, g, tf, R.a);
  }
  return { width: st.width, cap: st.capHeight, st, x0 };
}
/** Per-character ignition for a neon line whose characters map onto sung words (chars of word i light at its onset). */
export function wordLit(text: string, words: Word[], t: number, seed = 0, faulty = 0, offWord?: (w: Word) => number) {
  const map: number[] = [];
  let wi = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === ' ') { map.push(-1); if (i > 0 && text[i - 1] !== ' ') wi++; continue; }
    map.push(Math.min(wi, words.length - 1));
  }
  return (ci: number) => {
    const k = map[ci]!; if (k < 0) return 0;
    const w = words[k]!;
    const off = offWord ? offWord(w) : 1;
    return ignite(t, w.start - 0.03, seed + k * 7 + ci * 0.13, faulty) * off;
  };
}
/** A neon word anchored on a sung word, centred, with a slam-in scale on the onset. */
export function neonWord(s: S, w: Word, text: string, x: number, y: number, o: NeonOpts & { from?: number } = {}) {
  const sc = s.t < w.start - 0.05 ? 1 : slamScale(w, s.t, o.from ?? 1.0);
  const { c, g } = s;
  c.save(); g.save(); c.translate(x, y); g.translate(x, y); c.scale(sc, sc); g.scale(sc, sc);
  const r = neon(s, text, 0, 0, { ...o, lit: o.lit ?? ((_ci) => ignite(s.t, w.start - 0.03, w.gi, 0)) });
  c.restore(); g.restore();
  return r;
}

// ------------------------------------------------------------------ point clouds
export interface P3 { x: number; y: number; z: number; k: number; h: number }
export interface PCam { x: number; y: number; z: number; yaw: number; pitch: number; f: number; cx?: number; cy?: number }
/** Project a world point (y down) through a yaw/pitch camera. null when behind. */
export function proj(cm: PCam, x: number, y: number, z: number) {
  let dx = x - cm.x, dy = y - cm.y, dz = z - cm.z;
  const cy = Math.cos(cm.yaw), sy = Math.sin(cm.yaw);
  let rx = dx * cy - dz * sy, rz = dx * sy + dz * cy;
  const cp = Math.cos(cm.pitch), spp = Math.sin(cm.pitch);
  const ry = dy * cp - rz * spp; rz = dy * spp + rz * cp;
  if (rz < 5) return null;
  const k = cm.f / rz;
  return { x: (cm.cx ?? W / 2) + rx * k, y: (cm.cy ?? H / 2) + ry * k, d: rz, k };
}
/**
 * Draw a cloud. style(p, i, depth) returns [cssColour, alpha, sizePx, glowAlpha] or null to skip. Sizes scale with 1/depth
 * unless `fixed`. Uses fillRect (fast, crisp at 1080p).
 */
export function drawCloud(s: S, P: P3[], cm: PCam, style: (p: P3, i: number, d: number) => [string, number, number, number] | null, o: { fixed?: boolean; base?: number; ctx?: CanvasRenderingContext2D } = {}) {
  const c = o.ctx ?? s.c, g = s.g, base = o.base ?? 1;
  for (let i = 0; i < P.length; i++) {
    const p = P[i]!;
    const q = proj(cm, p.x, p.y, p.z);
    if (!q || q.x < -20 || q.x > W + 20 || q.y < -20 || q.y > H + 20) continue;
    const st = style(p, i, q.d);
    if (!st) continue;
    const [fill, a, sz0, ga] = st;
    if (a <= 0.004) continue;
    const sz = o.fixed ? sz0 : Math.min(7, Math.max(0.8, sz0 * base * q.k));
    if (!o.fixed && q.d < 160) continue;
    c.globalAlpha = clamp(a); c.fillStyle = fill; c.fillRect(q.x - sz / 2, q.y - sz / 2, sz, sz);
    if (ga > 0.01) { g.globalAlpha = clamp(ga); g.fillStyle = fill; g.fillRect(q.x - sz, q.y - sz, sz * 2, sz * 2); }
  }
  c.globalAlpha = 1; g.globalAlpha = 1;
}
const CLOUDS = new Map<string, P3[]>();
export function cached(key: string, fn: () => P3[]) { let v = CLOUDS.get(key); if (!v) { v = fn(); CLOUDS.set(key, v); } return v; }
/** Text as a cloud of points (z = 0 plane, jittered), centred on (0, 0). */
export function textCloud(text: string, fam: string, size: number, step = 5, seed = 1, depth = 0) {
  return cached(`t|${text}|${fam}|${size}|${step}|${seed}|${depth}`, () => {
    const pts = textPoints(text, fam, size, step, seed), wd = measure(text, fam, size), r = mulberry32(seed);
    return pts.map((p) => ({ x: p.x - wd / 2, y: p.y + (CAP * size) / 2, z: (r() - 0.5) * depth, k: 0, h: r() }));
  });
}
/** A city block of boxes sampled on their facades; k = 1 for lit windows. Ground plane at y = 0, buildings rise to -h. */
export function cityCloud(seed = 1, n = 26, spread = 2400, depth = 4000) {
  return cached(`city|${seed}|${n}|${spread}|${depth}`, () => {
    const r = mulberry32(seed), out: P3[] = [];
    for (let b = 0; b < n; b++) {
      const side = b % 2 ? 1 : -1;
      const bx = side * (260 + r() * spread * 0.5), bz = 300 + (b / n) * depth + r() * 120;
      const bw = 160 + r() * 260, bd = 160 + r() * 260, bh = 300 + r() * 1400;
      const step = 26;
      for (let yy = 0; yy < bh; yy += step) {
        for (let xx = -bw / 2; xx <= bw / 2; xx += step) {
          const win = (Math.floor(yy / step) % 2 === 0) && r() < 0.18;
          out.push({ x: bx + xx, y: -yy, z: bz - bd / 2, k: win ? 1 : 0, h: r() });
        }
        for (let zz = -bd / 2; zz <= bd / 2; zz += step) {
          const fx = bx - side * bw / 2;
          const win = (Math.floor(yy / step) % 2 === 0) && r() < 0.12;
          out.push({ x: fx, y: -yy, z: bz + zz, k: win ? 1 : 0, h: r() });
        }
      }
      // roof edge + water tower
      for (let xx = -bw / 2; xx <= bw / 2; xx += 12) out.push({ x: bx + xx, y: -bh, z: bz - bd / 2, k: 2, h: r() });
      if (r() < 0.35) for (let a = 0; a < 60; a++) { const an = (a / 60) * TAU; for (let yy = 0; yy < 90; yy += 15) out.push({ x: bx + Math.cos(an) * 40, y: -bh - 30 - yy, z: bz + Math.sin(an) * 40, k: 0, h: r() }); }
    }
    return out;
  });
}
/** A brain-ish blob: two hemispheres with gyri (folds as sine ridges). */
export function brainCloud(n = 9000, seed = 5) {
  return cached(`brain|${n}|${seed}`, () => {
    const r = mulberry32(seed), out: P3[] = [];
    for (let i = 0; i < n; i++) {
      const u = r() * 2 - 1, a = r() * TAU, q = Math.sqrt(1 - u * u);
      let x = q * Math.cos(a), y = u, z = q * Math.sin(a);
      const fold = 1 + 0.07 * Math.sin(9 * x + 5 * y) * Math.sin(8 * z - 4 * y) + 0.04 * Math.sin(17 * y + 3 * z);
      const side = x > 0 ? 1 : -1;
      x = x * 150 * fold + side * 8; y = y * 120 * fold * (y > 0.6 ? 0.9 : 1); z = z * 185 * fold;
      out.push({ x, y: -y * 0.85, z, k: Math.abs(x) < 10 ? 1 : 0, h: r() });
    }
    return out;
  });
}
/** A standing figure in a fedora and trench coat (y up negative, feet at 0), about 180 units tall. */
export function figureCloud(n = 5000, seed = 9) {
  return cached(`fig|${n}|${seed}`, () => {
    const r = mulberry32(seed), out: P3[] = [];
    const cyl = (cx: number, y0: number, y1: number, r0: number, r1: number, m: number, k = 0) => {
      for (let i = 0; i < m; i++) { const f = r(), a = r() * TAU, rr = lerp(r0, r1, f); out.push({ x: cx + Math.cos(a) * rr, y: -lerp(y0, y1, f), z: Math.sin(a) * rr * 0.8, k, h: r() }); }
    };
    cyl(-9, 0, 78, 7, 9, 260); cyl(9, 0, 78, 7, 9, 260); // legs
    cyl(0, 40, 150, 34, 24, 1700); // trench coat
    cyl(-30, 92, 150, 8, 9, 220); cyl(30, 92, 150, 8, 9, 220); // arms
    cyl(0, 150, 158, 8, 8, 80); // neck
    for (let i = 0; i < 520; i++) { const u = r() * 2 - 1, a = r() * TAU, q = Math.sqrt(1 - u * u); out.push({ x: q * Math.cos(a) * 11, y: -(168 + u * 13), z: q * Math.sin(a) * 11, k: 0, h: r() }); }
    for (let i = 0; i < 700; i++) { const a = r() * TAU, rr = 12 + r() * 14; out.push({ x: Math.cos(a) * rr, y: -178, z: Math.sin(a) * rr, k: 1, h: r() }); } // brim
    cyl(0, 178, 192, 12, 10, 300, 1); // crown
    return out;
  });
}
/** N stacked planes of points (a layer stack): plane j at y = -j * gap. */
export function layersCloud(layers = 80, cols = 22, rows = 14, gap = 16, seed = 2) {
  return cached(`layers|${layers}|${cols}|${rows}|${gap}|${seed}`, () => {
    const r = mulberry32(seed), out: P3[] = [];
    for (let j = 0; j < layers; j++) for (let a = 0; a < cols; a++) for (let b = 0; b < rows; b++)
      out.push({ x: (a - (cols - 1) / 2) * 30, y: -j * gap, z: (b - (rows - 1) / 2) * 30, k: j, h: r() });
    return out;
  });
}
/** A sphere shell. */
export function sphereCloud(n = 2000, R = 100, seed = 4) {
  return cached(`sph|${n}|${R}|${seed}`, () => {
    const r = mulberry32(seed), out: P3[] = [];
    for (let i = 0; i < n; i++) { const u = r() * 2 - 1, a = r() * TAU, q = Math.sqrt(1 - u * u); out.push({ x: q * Math.cos(a) * R, y: u * R, z: q * Math.sin(a) * R, k: 0, h: r() }); }
    return out;
  });
}

// ------------------------------------------------------------------ figures & props (2D)
/** A man in a fedora and trench coat, in profile, facing right; feet at (x, y), height h. */
export function fedoraMan(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, fill: string, facing = 1) {
  const u = h / 200;
  ctx.save(); ctx.translate(x, y); ctx.scale(u * facing, u);
  ctx.fillStyle = fill; ctx.beginPath();
  ctx.moveTo(-26, 0); ctx.lineTo(-22, -70); ctx.lineTo(-36, -80); ctx.lineTo(-34, -140); ctx.lineTo(-20, -152);
  ctx.lineTo(-8, -156); ctx.lineTo(-10, -160); ctx.lineTo(-12, -170); // collar up
  ctx.lineTo(-14, -176); ctx.lineTo(-32, -176); ctx.lineTo(-30, -180); ctx.lineTo(-16, -182); // brim back
  ctx.lineTo(-14, -196); ctx.lineTo(4, -200); ctx.lineTo(16, -194); ctx.lineTo(18, -183); // crown
  ctx.lineTo(36, -180); ctx.lineTo(34, -176); ctx.lineTo(16, -176); // brim front
  ctx.lineTo(18, -168); ctx.lineTo(22, -162); ctx.lineTo(18, -160); ctx.lineTo(16, -152); // nose/chin
  ctx.lineTo(24, -146); ctx.lineTo(34, -110); ctx.lineTo(30, -80); ctx.lineTo(20, -72); ctx.lineTo(24, 0);
  ctx.closePath(); ctx.fill(); ctx.restore();
}
/** A woman in profile (head and shoulders, a wave of hair, a cloche hat), facing left; chin point at (x, y), height h of head. */
export function womanBust(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, fill: string, facing = -1) {
  const u = h / 100;
  ctx.save(); ctx.translate(x, y); ctx.scale(u * facing, u);
  ctx.fillStyle = fill; ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(8, -10); ctx.lineTo(6, -16); ctx.lineTo(12, -24); ctx.lineTo(10, -30); ctx.lineTo(16, -42);
  ctx.lineTo(12, -48); ctx.lineTo(14, -60); ctx.lineTo(30, -66); ctx.lineTo(10, -82); ctx.lineTo(-30, -86); ctx.lineTo(-56, -70);
  ctx.lineTo(-62, -40); ctx.lineTo(-58, -14); ctx.lineTo(-70, 6); ctx.lineTo(-64, 30); ctx.lineTo(-40, 40); ctx.lineTo(-30, 60);
  ctx.lineTo(-90, 80); ctx.lineTo(-120, 140); ctx.lineTo(60, 140); ctx.lineTo(40, 80); ctx.lineTo(-6, 52); ctx.lineTo(-10, 20);
  ctx.closePath(); ctx.fill(); ctx.restore();
}
/** A hanging bulb on a cord from (px, py), swinging by angle th; returns bulb position. */
export function bulb(s: S, px: number, py: number, L: number, th: number, color: string, a: number) {
  const bx = px + Math.sin(th) * L, by = py + Math.cos(th) * L;
  const c = s.c;
  c.strokeStyle = grey(0.5, 0.9); c.lineWidth = 2; c.beginPath(); c.moveTo(px, py); c.lineTo(bx, by); c.stroke();
  c.fillStyle = grey(0.2, 1); c.fillRect(bx - 8, by - 10, 16, 14);
  c.fillStyle = hmix('#808080', color, a, 1); c.beginPath(); c.ellipse(bx, by + 16, 14, 18, 0, 0, TAU); c.fill();
  pool(s.g, bx, by + 16, 120, color, 0.6 * a);
  pool(s.g, bx, by + 16, 28, '#FFFFFF', 0.8 * a);
  return { x: bx, y: by + 16 };
}

// ------------------------------------------------------------------ typed & stamped words
/** Monospace typewriter text revealed between t0 and t1, with a carriage cursor. */
export function typeOn(s: S, text: string, x: number, y: number, t0: number, t1: number, size = 30, fill = '#E8E5DE', align: CanvasTextAlign = 'left', a = 1) {
  const { c, t } = s;
  if (t < t0 || a <= 0) return 0;
  const n = Math.round(clamp((t - t0) / Math.max(0.05, t1 - t0)) * text.length);
  setFont(c, F.mono(600), size); c.textAlign = align; c.textBaseline = 'alphabetic';
  c.fillStyle = fill.startsWith('#') ? hx(fill, a) : fill; c.fillText(text.slice(0, n), x, y);
  const w = c.measureText(text.slice(0, n)).width;
  if (n < text.length && Math.floor(t * 8) % 2 === 0) { c.fillRect(align === 'left' ? x + w + 3 : x + 3, y - size * 0.78, size * 0.55, size * 0.9); }
  return w;
}
/** Words typed onto paper as they are sung (each word's letters strike during its own sung span). */
export function typeWords(s: S, ws: Word[], x: number, y: number, size: number, ink: string, o: { align?: 'l' | 'c'; hot?: string } = {}) {
  const { c, t } = s;
  setFont(c, F.mono(700), size); c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  const full = ws.map((w) => w.w).join(' '), fw0 = c.measureText(full).width;
  let cx = o.align === 'c' ? x - fw0 / 2 : x;
  let head = cx;
  for (const w of ws) {
    const n = t < w.start - 0.03 ? 0 : Math.ceil(clamp((t - w.start + 0.03) / Math.max(0.08, Math.min(0.4, w.end - w.start))) * w.w.length);
    const shown = w.w.slice(0, n);
    const hk = heat(w, t);
    c.fillStyle = o.hot && hk > 0.05 ? hmix(ink, o.hot, hk) : ink;
    // a struck key jitters a hair
    c.fillText(shown, cx + (n < w.w.length && n > 0 ? hash(n, w.gi) * 2 - 1 : 0), y);
    const ww = c.measureText(w.w + ' ').width;
    if (n > 0) head = cx + c.measureText(shown).width;
    cx += ww;
  }
  return { width: fw0, head };
}
/** A rubber stamp that slams at t0. */
export function stamp(s: S, text: string, x: number, y: number, t0: number, size = 90, rot = -0.12, color = '#B5102C') {
  const { c, t } = s;
  if (t < t0 - 0.03) return;
  const k = prog(t, t0 - 0.03, t0 + 0.12, ease.outQuad), sc = lerp(2.2, 1, k);
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(sc, sc); c.globalAlpha = k * 0.92;
  setFont(c, F.mono(700), size); const w = c.measureText(text).width;
  c.strokeStyle = color; c.lineWidth = size * 0.08; c.strokeRect(-w / 2 - size * 0.3, -size * 0.78, w + size * 0.6, size * 1.12);
  c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillText(text, 0, size * 0.2);
  c.restore();
  if (t < t0 + 0.2) s.post.shake = [Math.sin(t * 90) * 10 * (1 - k), Math.cos(t * 70) * 7 * (1 - k)];
}
/** Draw a centred word in a family/colour with optional glow (no timing). */
export function label(ctx: CanvasRenderingContext2D, text: string, fam: string, size: number, x: number, y: number, fill: string, align: CanvasTextAlign = 'center', rot = 0) {
  ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot);
  setFont(ctx, fam, size); ctx.fillStyle = fill; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillText(text, 0, (CAP * size) / 2);
  ctx.restore();
}
/** A sung word with the noir palette: silver before/after, neon red while sung (glow), slam on the onset. */
export function sw(s: S, w: Word, text: string, fam: string, size: number, x: number, y: number, o: Parameters<typeof word>[7] & { from?: number } = {}) {
  word(s, w, text, fam, size, x, y, { sc: s.t < w.start - 0.06 ? 1 : slamScale(w, s.t, o.from ?? 1.5), ...o });
}
/** Red evidence string with sag, drawn on from a to b by k. */
export function string(s: S, ax: number, ay: number, bx: number, by: number, k: number, sag = 40, a = 1) {
  if (k <= 0) return;
  const c = s.c; c.strokeStyle = hx('#C0142F', a); c.lineWidth = 3; c.beginPath();
  for (let j = 0; j <= 24; j++) { const q = (j / 24) * clamp(k); const x = lerp(ax, bx, q), y = lerp(ay, by, q) + sag * Math.sin(Math.PI * q); j ? c.lineTo(x, y) : c.moveTo(x, y); }
  c.stroke();
}
/** Smoke wisp rising from (x, y). */
export function smoke(s: S, x: number, y: number, t: number, a = 0.18, seed = 1, h = 300) {
  const c = s.c; c.save(); c.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    c.beginPath();
    for (let j = 0; j <= 30; j++) {
      const f = j / 30, yy = y - f * h, xx = x + 26 * f * Math.sin(f * 6 + t * 1.3 + k * 2 + seed) + 14 * noise1(f * 4 + t * 0.6 + k, seed);
      j ? c.lineTo(xx, yy) : c.moveTo(xx, yy);
    }
    c.strokeStyle = grey(0.8, a * (0.6 - k * 0.15)); c.lineWidth = 6 + k * 10; c.stroke();
  }
  c.restore();
}

// ------------------------------------------------------------------ lyric rows & neon lines
import { row } from '../scenes/typeset';
export { row };
export const up = (w: Word) => txt(w);
/** A Swiss lyric row (content words heavy, small words light) — the template's row() with noir defaults. */
export function lyric(s: S, ws: Word[], y: number, o: { width?: number; max?: number; fam?: string; x?: number; align?: 'l' | 'r' | 'c'; alpha?: number; from?: number; anno?: boolean; rot?: number; base?: string; hot?: string; glow?: number } = {}) {
  if (!ws.length) return null;
  return row(s, ws, o.fam ?? A(100, 900), o.width ?? 1500, o.max ?? 150, o.x ?? W / 2, y, { align: o.align, alpha: o.alpha, from: o.from, anno: o.anno ?? false, rot: o.rot, base: o.base, hot: o.hot, glow: o.glow });
}
/** A neon line whose words ignite on their sung onsets (upper-case by default, or as written for the scripts). */
export function neonWords(s: S, ws: Word[], x: number, y: number, o: NeonOpts & { cased?: boolean; faulty?: number; seed?: number } = {}) {
  const text = ws.map((w) => (o.cased ? clean(w.w) : up(w))).join(' ');
  return neon(s, text, x, y, { ...o, lit: o.lit ?? wordLit(text, ws, s.t, o.seed ?? ws[0]?.gi ?? 0, o.faulty ?? 0) });
}
/** Width of a neon string (for layout). */
export const neonW = (text: string, font: StrokeFontName, size: number) => stext(text, font, size).width;

/** Per-character [start, end] times for a string written while its words are sung (spaces map to the gap). */
export function charTimes(text: string, words: Word[]): [number, number][] {
  const out: [number, number][] = []; let wi = 0, ci = 0;
  const toks = text.split(' ');
  toks.forEach((tok, k) => {
    const w = words[Math.min(wi, words.length - 1)]!, nx = words[wi + 1];
    const t0 = w.start - 0.02, t1 = Math.max(t0 + 0.12, Math.min(w.end, nx ? nx.start : w.end) - 0.02);
    for (let j = 0; j < tok.length; j++) out.push([lerp(t0, t1, j / tok.length), lerp(t0, t1, (j + 1) / tok.length)]);
    if (k < toks.length - 1) { out.push([t1, t1]); }
    wi++; ci += tok.length + 1;
  });
  void ci;
  return out;
}
/** A man in fedora and trench coat in profile (facing +x), feet at (0, 0), 200 units tall. */
export function fedoraPath(): Path2D {
  const p = new Path2D();
  const pts: [number, number][] = [[-26, 0], [-22, -70], [-36, -80], [-34, -140], [-20, -152], [-8, -156], [-10, -160], [-12, -170], [-14, -176], [-32, -176], [-30, -180], [-16, -182], [-14, -196], [4, -200], [16, -194], [18, -183], [36, -180], [34, -176], [16, -176], [18, -168], [22, -162], [18, -160], [16, -152], [24, -146], [34, -110], [30, -80], [20, -72], [24, 0]];
  pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); p.closePath();
  return p;
}
export const FEDORA = typeof Path2D !== 'undefined' ? fedoraPath() : (null as unknown as Path2D);
/** Draw the fedora man: fill or dashed outline; h = height in px, feet at (x, y). */
export function man(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, style: string, facing = 1, outline = false, lw = 3) {
  ctx.save(); ctx.translate(x, y); ctx.scale((h / 200) * facing, h / 200);
  if (outline) { ctx.strokeStyle = style; ctx.lineWidth = (lw * 200) / h; ctx.setLineDash([(10 * 200) / h, (8 * 200) / h]); ctx.stroke(FEDORA); ctx.setLineDash([]); }
  else { ctx.fillStyle = style; ctx.fill(FEDORA); }
  ctx.restore();
}
/** A camera at (x, y, z) looking at (tx, ty, tz). */
export function lookAt(x: number, y: number, z: number, tx: number, ty: number, tz: number, f = 1000, cx = W / 2, cy = H / 2): PCam {
  const dx = tx - x, dy = ty - y, dz = tz - z;
  const yaw = Math.atan2(dx, dz), rz = Math.hypot(dx, dz);
  return { x, y, z, yaw, pitch: Math.atan2(dy, rz), f, cx, cy };
}

// ------------------------------------------------------------------ alarm-clock (14-segment LED) type
const SEG: Record<string, [number, number, number, number]> = {
  a: [0, 0, 1, 0], b: [1, 0, 1, 1], c: [1, 1, 1, 2], d: [0, 2, 1, 2], e: [0, 1, 0, 2], f: [0, 0, 0, 1], g: [0, 1, 0.5, 1], G: [0.5, 1, 1, 1],
  h: [0, 0, 0.5, 1], i: [0.5, 0, 0.5, 1], j: [1, 0, 0.5, 1], k: [0, 2, 0.5, 1], l: [0.5, 1, 0.5, 2], m: [1, 2, 0.5, 1],
};
const GLYPH: Record<string, string> = {
  A: 'abcefgG', B: 'abcdilG', C: 'adef', D: 'abcdil', E: 'adefg', F: 'aefg', G: 'acdefG', H: 'bcefgG', I: 'adil', J: 'bcde', K: 'efgjm',
  L: 'def', M: 'bcefhj', N: 'bcefhm', O: 'abcdef', P: 'abefgG', Q: 'abcdefm', R: 'abefgGm', S: 'acdfgG', T: 'ail', U: 'bcdef', V: 'efkj',
  W: 'bcefkm', X: 'hjkm', Y: 'hjl', Z: 'adjk', '0': 'abcdefjk', '1': 'bc', '2': 'abdegG', '3': 'abcdG', '4': 'bcfgG', '5': 'acdfgG',
  '6': 'acdefgG', '7': 'abc', '8': 'abcdefgG', '9': 'abcdfgG', "'": 'i', '’': 'i', '-': 'gG', '?': 'abGl',
};
const ALL_SEGS = 'abcdefgGhijklm';
/** Width of a 14-segment string of cell height h. */
export const segW = (text: string, h: number) => text.length * h * 0.62;
/**
 * A 14-segment LED string (like a bedside alarm clock), baseline-centred at (x, y), cell height h. lit(ci) 0..1 per char;
 * unlit segments glow faintly, as real LED glass does.
 */
export function segText(s: S, text: string, x: number, y: number, h: number, color: string, lit: (ci: number) => number = () => 1, ghost = 0.07) {
  const { c, g } = s;
  const cw = h * 0.5, adv = h * 0.62, sk = 0.12, lw = Math.max(2, h * 0.085);
  const x0 = x - segW(text, h) / 2;
  const seg = (ctx: CanvasRenderingContext2D, ox: number, k: string, inset: number) => {
    const [ax, ay, bx, by] = SEG[k]!;
    const P = (u: number, v: number) => [ox + u * cw - sk * (v * h / 2 - h), y - h + v * h / 2] as const;
    const [px, py] = P(ax, ay), [qx, qy] = P(bx, by);
    const dx = qx - px, dy = qy - py, L = Math.hypot(dx, dy) || 1, ix = (dx / L) * inset, iy = (dy / L) * inset;
    ctx.beginPath(); ctx.moveTo(px + ix, py + iy); ctx.lineTo(qx - ix, qy - iy); ctx.stroke();
  };
  for (const ctx of [c, g]) { ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = ctx === c ? lw : lw * 3; }
  Array.from(text.toUpperCase()).forEach((ch, ci) => {
    const ox = x0 + ci * adv;
    if (ch === ':' || ch === '.') {
      const k = lit(ci); c.fillStyle = hx(color, Math.max(ghost, k));
      for (const v of ch === ':' ? [0.55, 1.45] : [1.95]) { c.beginPath(); c.arc(ox + cw * 0.5 - sk * (v * h / 2 - h), y - h + v * h / 2, lw * 0.7, 0, TAU); c.fill(); }
      return;
    }
    if (ch === ' ') return;
    const on_ = GLYPH[ch] ?? '';
    const k = lit(ci);
    for (const sg of ALL_SEGS) {
      const isOn = on_.includes(sg);
      const a = isOn ? Math.max(ghost, k) : ghost;
      c.strokeStyle = isOn && k > 0.05 ? hmix(color, '#FFE0E4', 0.25 * k, a) : hx(color, a); seg(c, ox, sg, lw * 0.75);
      if (isOn && k > 0.05) { g.strokeStyle = hx(color, 0.35 * k); seg(g, ox, sg, lw * 0.75); }
    }
  });
  c.restore(); g.restore();
}
/** 14-segment line of sung words: each word's characters light on its onset (hot while sung). */
export function segWords(s: S, ws: Word[], x: number, y: number, h: number, color: string) {
  const text = ws.map((w) => clean(w.w).toUpperCase()).join(' ');
  const map: number[] = []; let wi = 0;
  for (let i = 0; i < text.length; i++) { if (text[i] === ' ') { map.push(-1); wi++; continue; } map.push(wi); }
  segText(s, text, x, y, h, color, (ci) => { const k = map[ci]!; if (k < 0) return 0; const w = ws[k]!; return s.t < w.start - 0.03 ? 0 : 0.75 + 0.25 * heat(w, s.t); });
  return segW(text, h);
}
