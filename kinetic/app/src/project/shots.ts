// Project shots for "Weights All the Way Down" (noir jazz remix). Every shot is wrapped in the noir finish: a silver
// black-and-white world where only light has colour, film grain and gate weave, and the 2.39:1 letterbox.
import { prog } from '../engine/util';
import { H, W, hash, letterbox, type S } from './noir';
import { A_SHOTS } from './shots-a';
import { B_SHOTS } from './shots-b';
import { C_SHOTS } from './shots-c';

function finish(fn: (s: S) => void) {
  return (s: S) => {
    Object.assign(s.bg, { paper: 0, grid: 0, glow: 0, stars: 0, warm: 0 });
    Object.assign(s.post, { hud: 0, grain: 0.13, vignette: 0.55, bloom: 0.85, bloomThreshold: 0.62, halation: 0.35, ca: 1.3 });
    const t = s.t;
    // projector flicker and gate weave (shots that shake override it)
    s.post.exposure = 1 + 0.025 * Math.sin(t * 47) * Math.sin(t * 13);
    s.post.shake = [0.6 * Math.sin(t * 3.1), 1.1 * Math.sin(t * 5.3)];
    fn(s);
    filmDamage(s);
    if (!s.sh.o.noBox) letterbox(s, s.sh.o.box ?? 1);
    // fade from black at the very top of the film
    if (t < 0.9) s.post.fade = 1 - prog(t, 0, 0.9);
  };
}
/** Print damage at 24 fps (the film's own frame rate, independent of the render rate): dust, hairs, emulsion scratches and
 *  a gate flicker. Deterministic per film frame. */
function filmDamage(s: S) {
  const c = s.c, f = Math.floor(s.t * 24);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  // dust: white specks (scratched emulsion) and dark specks (dirt on the print)
  const n = 6 + Math.floor(hash(f, 1) * 10);
  for (let i = 0; i < n; i++) {
    const x = hash(f, i, 2) * W, y = hash(f, i, 3) * H, r = 0.8 + hash(f, i, 4) ** 3 * 4.5;
    c.fillStyle = hash(f, i, 5) > 0.45 ? `rgba(235,232,225,${0.25 + 0.45 * hash(f, i, 6)})` : `rgba(0,0,0,${0.5 + 0.4 * hash(f, i, 6)})`;
    c.beginPath(); c.ellipse(x, y, r, r * (0.6 + hash(f, i, 7)), hash(f, i, 8) * 3, 0, Math.PI * 2); c.fill();
  }
  // a hair caught in the gate, now and then
  if (hash(f, 9) > 0.93) {
    const x = hash(f, 10) * W, y = hash(f, 11) * H; c.strokeStyle = 'rgba(0,0,0,0.55)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x, y);
    for (let k = 1; k <= 8; k++) c.quadraticCurveTo(x + k * 14 + (hash(f, k, 12) - 0.5) * 40, y + k * 10 - 30, x + k * 22, y + (hash(f, k, 13) - 0.5) * 60);
    c.stroke();
  }
  // long vertical scratches that persist for a few frames and wander
  for (let k = 0; k < 2; k++) {
    const run = Math.floor(f / 18) + k * 7;
    if (hash(run, 14) < 0.55) continue;
    const x = hash(run, 15) * W + (hash(f, k, 16) - 0.5) * 6;
    c.fillStyle = `rgba(230,228,220,${0.08 + 0.1 * hash(f, k, 17)})`; c.fillRect(x, 0, 1.6, H);
  }
  c.restore();
  // gate flicker
  s.post.exposure = (s.post.exposure ?? 1) * (0.97 + 0.06 * hash(f, 18));
}
const ALL: Record<string, (s: S) => void> = { ...A_SHOTS, ...B_SHOTS, ...C_SHOTS };
export const EXTRA: Record<string, (s: S) => void> = Object.fromEntries(Object.entries(ALL).map(([k, f]) => [k, finish(f)]));
