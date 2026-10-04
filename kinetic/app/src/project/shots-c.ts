// Bridge, breakdown, instrumental break, final chorus, outro.
import { F, measure } from '../engine/type';
import {
  A, H, W, TAU, backdrop, brainCloud, cam, cityCloud, clamp, clean, cone, drawCloud, ease, figureCloud, fw, grey, gutter, hash, heat,
  hmix, hx, ignite, label, lerp, ln, lookAt, lyric, man, mulberry32, neon, neonWords, on, pool, prog, pulseAt, rain, setFont, snapCam,
  snapV, sphereCloud, stext, sw, typeOn, womanBust, type Line, type P3, type S, type Word,
} from './noir';

const TEAL = '#35E3E6', RED = '#FF2B4E', AMBER = '#FFA23A', PINK = '#FF3FB4';
const lastW = (l: Line) => l.words[l.words.length - 1]!;
const U = (w: Word) => clean(w.w).toUpperCase();

// ================================================================== BRIDGE
// AND WHAT ARE YOU, LOVE, UNDER THE SKIN? — an X-ray lightbox: a hand; on SKIN the flesh fades and the bones are a point cloud.
let HAND: P3[] | null = null;
function handBones() {
  if (HAND) return HAND;
  const r = mulberry32(12), out: P3[] = [];
  const bone = (x0: number, y0: number, x1: number, y1: number, w: number, n: number) => { for (let i = 0; i < n; i++) { const f = r(), a = (r() - 0.5) * w * (0.6 + 0.6 * Math.abs(f - 0.5) * 2); out.push({ x: lerp(x0, x1, f) + a * Math.cos(Math.atan2(y1 - y0, x1 - x0) + Math.PI / 2), y: lerp(y0, y1, f) + a * Math.sin(Math.atan2(y1 - y0, x1 - x0) + Math.PI / 2), z: 0, k: 0, h: r() }); } };
  // forearm
  bone(-40, 330, -30, 120, 34, 300); bone(40, 330, 30, 120, 30, 280);
  // wrist (carpals)
  for (let i = 0; i < 160; i++) out.push({ x: (r() - 0.5) * 120, y: 100 + (r() - 0.5) * 50, z: 0, k: 1, h: r() });
  const fingers: [number, number, number][] = [[-95, 40, -0.55], [-45, -10, -0.15], [5, -20, 0.02], [55, -10, 0.17], [100, 20, 0.36]];
  fingers.forEach(([bx, by, ang], fi) => {
    const L = fi === 0 ? [62, 44, 34] : fi === 2 ? [110, 70, 50, 38] : [100, 62, 44, 34];
    let x = fi === 0 ? -60 : bx * 0.5, y = 80;
    const segs = L;
    let a = ang - Math.PI / 2;
    segs.forEach((len, si) => {
      const x1 = x + Math.cos(a) * len, y1 = y + Math.sin(a) * len;
      bone(x, y, x1, y1, si === 0 ? 20 : 16 - si * 2, Math.round(len * 1.8));
      for (let i = 0; i < 18; i++) out.push({ x: x1 + (r() - 0.5) * 14, y: y1 + (r() - 0.5) * 14, z: 0, k: 1, h: r() });
      x = x1 + Math.cos(a) * 6; y = y1 + Math.sin(a) * 6; a += fi === 0 ? 0.12 : 0.03;
    });
    void by;
  });
  HAND = out; return out;
}
function xray(s: S) {
  const { t, c, g } = s;
  const l = ln(s), lo = fw(l, /love/i), un = fw(l, /under/i), sk = lastW(l);
  backdrop(s, 0.02, 0.03);
  cam(s, snapCam(t, [0, un.start - 0.1], [{ x: W / 2, y: H / 2, z: 1, r: 0 }, { x: W / 2 + 40, y: H / 2 + 10, z: 1.06, r: 0 }], 0.5));
  // the lightbox
  const bx = 640, by = 190, bw = 640, bh = 700;
  c.fillStyle = hx('#BFD8DD', 0.9); c.fillRect(bx, by, bw, bh);
  g.fillStyle = hx('#9FE8F0', 0.18); g.fillRect(bx - 20, by - 20, bw + 40, bh + 40);
  c.fillStyle = hx('#0A1114', 0.94); c.fillRect(bx + 30, by + 30, bw - 60, bh - 60);
  const flesh = 1 - prog(t, sk.start - 0.05, sk.start + 0.6, ease.inOutCubic);
  const cx = bx + bw / 2, cy = by + 420;
  // the flesh: a soft grey hand silhouette
  c.save(); c.translate(cx, cy); c.globalAlpha = 0.55 * flesh;
  c.fillStyle = hx('#7E9298', 1); c.beginPath(); c.ellipse(0, 40, 130, 120, 0, 0, TAU); c.fill();
  c.fillRect(-70, 120, 140, 260);
  for (const [fx, ang, L] of [[-110, -0.55, 130], [-45, -0.15, 230], [5, 0.02, 260], [55, 0.17, 235], [100, 0.36, 180]] as const) { c.save(); c.translate(fx * 0.6, -10); c.rotate(ang); c.beginPath(); c.roundRect(-22, -L, 44, L + 30, 22); c.fill(); c.restore(); }
  c.restore();
  // the bones as points
  const P = handBones(), bk = 0.35 + 0.65 * (1 - flesh);
  for (let i = 0; i < P.length; i++) { const p = P[i]!; c.fillStyle = hx('#E9FBFF', (0.5 + 0.5 * p.h) * bk); c.fillRect(cx + p.x - 1.5, cy + p.y - 1.5, 3, 3); if ((i & 7) === 0) { g.fillStyle = hx('#9FE8F0', 0.25 * bk); g.fillRect(cx + p.x - 3, cy + p.y - 3, 6, 6); } }
  setFont(c, F.mono(500), 18); c.fillStyle = hx('#E9FBFF', 0.6); c.textAlign = 'left'; c.fillText('PATIENT: UNKNOWN · 3 LB GREY MATTER NOT SHOWN', bx + 44, by + 64);
  lyric(s, l.words.slice(0, lo.index), 260, { width: 360, max: 90, x: 380 });
  if (t > lo.start - 0.06) label(c, 'love,', F.serif(600, true), 120, 380, 420, hmix('#E8E5DE', PINK, heat(lo, t)));
  lyric(s, l.words.slice(un.index, sk.index), 640, { width: 380, max: 90, x: 1570 });
  sw(s, sk, 'SKIN?', A(125, 900), 150, 1570, 800, { from: 1.5 });
}

// SALT WATER AND CURRENT AND A SPARK WITHIN — an oscilloscope: the trace is the voice; on SPARK it spikes and a blue tube strikes.
function current(s: S) {
  const { t, c, g } = s;
  const l = ln(s), cu = fw(l, /current/i), spk = fw(l, /spark/i), wi = lastW(l);
  backdrop(s, 0.02, 0.03);
  cam(s, { x: W / 2, y: H / 2, z: snapV(t, [0, spk.start - 0.1], [1.0, 1.08], 0.4), r: 0 });
  const x0 = 200, x1 = 1720, y0 = 300, y1 = 760, ym = (y0 + y1) / 2;
  c.fillStyle = hx('#06100E', 1); c.fillRect(x0, y0, x1 - x0, y1 - y0);
  c.strokeStyle = hx(TEAL, 0.12); c.lineWidth = 1;
  for (let x = x0; x <= x1; x += 76) { c.beginPath(); c.moveTo(x, y0); c.lineTo(x, y1); c.stroke(); }
  for (let y = y0; y <= y1; y += 46) { c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); }
  const speed = 500;
  for (const ctx of [c, g]) {
    ctx.strokeStyle = hx(TEAL, ctx === c ? 0.95 : 0.5); ctx.lineWidth = ctx === c ? 3 : 9; ctx.beginPath();
    for (let x = x0; x <= x1; x += 3) {
      const tx = t - (x1 - x) / speed;
      const v = s.au.sample(tx).vocal;
      const y = ym - Math.sin(tx * 40) * (40 + 120 * v) * Math.sin(tx * 3.1) - 200 * pulseAt(tx, spk.start, 0.06) * Math.sin(tx * 200);
      x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  lyric(s, l.words.slice(0, cu.index + 1), 220, { width: 1200, max: 110 });
  lyric(s, l.words.slice(cu.index + 1, spk.index), 830, { width: 300, max: 70, x: 460 });
  neon(s, 'SPARK', 1000, 860, { font: 'osmotron', size: 140, color: 'blue', lit: () => ignite(t, spk.start - 0.03, 5, 0.2), width: 8 });
  sw(s, wi, 'WITHIN', A(62, 300), 80, 1510, 830, { from: 1.2 });
}

// THREE POUNDS OF MEAT THAT LEARNED HOW TO SING — a brain as a point cloud turning on a butcher's scale; the needle swings to 3 LB on
// POUNDS; on SING the cloud breathes with the voice and throws off rings.
function brain(s: S) {
  const { t, c, g } = s;
  const l = ln(s), po = fw(l, /pounds/i), me = fw(l, /meat/i), si = lastW(l), th = fw(l, /^that$/i);
  backdrop(s, 0.03, 0.04);
  cam(s, snapCam(t, [0, th.start - 0.1], [{ x: W / 2 - 100, y: H / 2, z: 1.04, r: 0 }, { x: W / 2 + 60, y: H / 2, z: 1.0, r: 0 }], 0.5));
  // the scale: dial, pan
  const sx = 760, sy = 640;
  c.fillStyle = grey(0.2); c.beginPath(); c.roundRect(sx - 170, sy, 340, 260, 20); c.fill();
  c.fillStyle = grey(0.85); c.beginPath(); c.arc(sx, sy + 130, 100, 0, TAU); c.fill();
  setFont(c, F.mono(700), 20); c.fillStyle = grey(0.2); c.textAlign = 'center';
  for (let k = 0; k <= 5; k++) { const a = -Math.PI * 0.8 + (k / 5) * Math.PI * 0.6 * 2.67; c.fillText(String(k), sx + Math.cos(a) * 72, sy + 136 + Math.sin(a) * 72); }
  const needle = lerp(-Math.PI * 0.8, -Math.PI * 0.8 + (3 / 5) * Math.PI * 1.6, prog(t, po.start - 0.05, po.start + 0.5, ease.outElastic));
  c.strokeStyle = hx('#B5102C', 1); c.lineWidth = 4; c.beginPath(); c.moveTo(sx, sy + 130); c.lineTo(sx + Math.cos(needle) * 80, sy + 130 + Math.sin(needle) * 80); c.stroke();
  c.fillStyle = grey(0.55); c.beginPath(); c.ellipse(sx, sy - 10, 230, 30, 0, 0, TAU); c.fill();
  // the brain
  const sing = t > si.start - 0.05 ? s.au.sample(t).vocal : 0;
  const cm = lookAt(Math.sin(t * 0.6) * 800, -260, -Math.cos(t * 0.6) * 800, 0, 0, 0, 900, sx, sy - 170);
  const P = brainCloud(8000, 5);
  const mk = on(me, t, 0.3);
  drawCloud(s, P, cm, (q, i) => {
    const pk = 0.45 + 0.4 * q.h;
    const meat = mk * (hash(i, 2) > 0.5 ? 1 : 0.4);
    const col = hmix('#D9D6CF', '#FF7A8E', meat * 0.8);
    if (sing > 0.05 && hash(i, Math.floor(t * 12)) > 0.9) return [PINK, 0.9, 3, 0.6 * sing];
    return [col, pk, 2.4, 0];
  }, { base: 1.2 });
  if (t > si.start) for (let k = 0; k < 4; k++) { const age = (t - si.start) * 1.4 - k * 0.35; if (age < 0) continue; c.strokeStyle = hx(PINK, clamp(0.7 - age * 0.6)); c.lineWidth = 3; c.beginPath(); c.ellipse(sx, sy - 170, 220 + age * 300, 160 + age * 220, 0, 0, TAU); c.stroke(); }
  lyric(s, l.words.slice(0, me.index + 1), 230, { width: 1200, max: 120, x: 860 });
  lyric(s, l.words.slice(th.index, si.index), 600, { width: 520, max: 80, x: 1450 });
  sw(s, si, 'SING', A(125, 900), 200, 1450, 790, { from: 1.6 });
  void g;
}

// WHO ARE YOU TO SAY IT'S THE STRANGER THING? — a mirror between the two of them: the line reads on her side and in mirror-writing
// on his; STRANGER sits on the glass.
function mirror(s: S) {
  const { t, c, g } = s;
  const l = ln(s), st = fw(l, /stranger/i), sa = fw(l, /say/i);
  backdrop(s, 0.02, 0.04);
  cam(s, snapCam(t, [0, st.start - 0.1], [{ x: W / 2, y: H / 2, z: 1.0, r: 0 }, { x: W / 2, y: H / 2, z: 1.08, r: 0 }], 0.45));
  // the mirror frame
  c.strokeStyle = grey(0.5); c.lineWidth = 6; c.beginPath(); c.moveTo(W / 2, 160); c.lineTo(W / 2, 920); c.stroke();
  g.strokeStyle = hx('#FFFFFF', 0.12); g.lineWidth = 20; g.beginPath(); g.moveTo(W / 2, 160); g.lineTo(W / 2, 920); g.stroke();
  womanBust(c, 525, 560, 220, hx(PINK, 0.8), 1); womanBust(c, 520, 560, 220, grey(0.02), 1);
  man(c, 1415, 940, 700, hx(TEAL, 0.7), -1); man(c, 1420, 940, 700, grey(0.02), -1);
  const w1 = l.words.slice(0, sa.index + 1), w2 = l.words.slice(sa.index + 1, st.index);
  lyric(s, w1, 260, { width: 700, max: 80, x: 500 });
  lyric(s, w2, 380, { width: 400, max: 70, x: 520 });
  // the mirror-writing copy on his side
  c.save(); g.save(); for (const x of [c, g]) { x.translate(W, 0); x.scale(-1, 1); }
  lyric(s, w1, 260, { width: 700, max: 80, x: 500, alpha: 0.35 });
  c.restore(); g.restore();
  sw(s, st, 'STRANGER', A(125, 900), 170, W / 2, 720, { from: 1.5 });
  const tg = lastW(l);
  sw(s, tg, 'THING?', A(62, 300), 90, W / 2, 860, { from: 1.2 });
}

// I'M NOT READY TO HEAR YOU SAY — a telephone handset; the words ride its coiled cord as they are sung.
function phone(s: S) {
  const { t, c } = s;
  const l = ln(s), ws = l.words;
  backdrop(s, 0.02, 0.035);
  cam(s, { x: snapV(t, [0, ...ws.map((w) => w.start - 0.08)], [W / 2 - 200, ...ws.map((_, i) => lerp(W / 2 - 200, W / 2 + 260, i / Math.max(1, ws.length - 1)))], 0.4), y: H / 2, z: 1.04, r: -0.01 });
  // handset (left)
  c.save(); c.translate(330, 520); c.rotate(-0.5);
  c.fillStyle = grey(0.1); c.beginPath(); c.roundRect(-60, -240, 120, 480, 50); c.fill(); c.beginPath(); c.ellipse(0, -230, 110, 70, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(0, 230, 110, 70, 0, 0, TAU); c.fill();
  c.strokeStyle = grey(0.3); c.lineWidth = 3; c.beginPath(); c.ellipse(0, -230, 80, 46, 0, 0, TAU); c.stroke();
  c.restore();
  // the coiled cord: a helix seen from the side, from the handset to off-frame right
  const path = (u: number) => ({ x: 420 + u * 1700, y: 760 - 260 * Math.sin(u * Math.PI * 0.9) });
  c.strokeStyle = grey(0.35); c.lineWidth = 4; c.beginPath();
  for (let i = 0; i <= 900; i++) { const u = i / 900, p = path(u); const x = p.x + 16 * Math.cos(u * 220), y = p.y + 22 * Math.sin(u * 220); i ? c.lineTo(x, y) : c.moveTo(x, y); }
  c.stroke();
  // words ride the cord, spaced by their own widths
  const fams = ws.map((w) => /hear|say|ready/i.test(clean(w.w)));
  const sizes = fams.map((b) => (b ? 96 : 56));
  const wds = ws.map((w, i) => measure(U(w), A(fams[i] ? 125 : 62, fams[i] ? 900 : 300), sizes[i]!));
  const gap = 44, tot = wds.reduce((a, b) => a + b, 0) + gap * (ws.length - 1);
  let xx = 520 + Math.max(0, (1560 - tot) / 2);
  ws.forEach((w, i) => {
    const cx = xx + wds[i]! / 2; xx += wds[i]! + gap;
    const u = (cx - 420) / 1700, p = path(u);
    sw(s, w, U(w), A(fams[i] ? 125 : 62, fams[i] ? 900 : 300), sizes[i]!, cx, p.y - 100, { from: 1.4 });
  });
  rain(s, 80, 0.06, 0.1, 22);
}

// WE'RE ONLY WEIGHTS OF A WARMER CLAY — a head-and-shoulders bust as a point cloud, turning; it warms from silver to amber clay.
let BUST: P3[] | null = null;
function bustCloud() {
  if (BUST) return BUST;
  const r = mulberry32(44), out: P3[] = [];
  for (let i = 0; i < 4200; i++) { const u = r() * 2 - 1, a = r() * TAU, q = Math.sqrt(1 - u * u); out.push({ x: q * Math.cos(a) * 92, y: -u * 118 - 200, z: q * Math.sin(a) * 102 + (u < -0.2 && Math.abs(Math.cos(a)) < 0.3 && Math.sin(a) > 0 ? 18 : 0), k: 0, h: r() }); }
  for (let i = 0; i < 900; i++) { const a = r() * TAU, y = r() * 90; out.push({ x: Math.cos(a) * 48, y: -y - 40, z: Math.sin(a) * 48, k: 0, h: r() }); }
  for (let i = 0; i < 4200; i++) { const a = r() * TAU, y = r(); const w = lerp(120, 260, y); out.push({ x: Math.cos(a) * w, y: y * 200, z: Math.sin(a) * w * 0.55, k: 1, h: r() }); }
  BUST = out; return out;
}
function clay(s: S) {
  const { t, c, sh } = s;
  const l = ln(s), wa = fw(l, /warmer/i), cl = lastW(l), we = fw(l, /weights/i);
  backdrop(s, 0.03, 0.02);
  cam(s, { x: W / 2, y: H / 2, z: lerp(1, 1.08, prog(t, sh.start, sh.end)), r: 0 }, 0.03);
  const warm = prog(t, wa.start - 0.1, cl.start + 0.8, ease.inOutCubic);
  const cm = lookAt(Math.sin(t * 0.45 + 1) * 900, -320, -Math.cos(t * 0.45 + 1) * 900, 0, -60, 0, 950, 1260, 560);
  drawCloud(s, bustCloud(), cm, (q, i) => {
    const digit = hash(i, 7) > 0.92 && t > we.start ? 1 : 0;
    const col = hmix('#D9D6CF', '#E79B5A', warm);
    return [digit ? RED : col, 0.35 + 0.45 * q.h, 2.4, digit ? 0.4 : warm * 0.1];
  }, { base: 1.3 });
  pool(s.g, 1260, 520, 420, AMBER, 0.1 * warm);
  lyric(s, l.words.slice(0, we.index + 1), 330, { width: 800, max: 120, x: 560 });
  lyric(s, l.words.slice(we.index + 1, cl.index), 560, { width: 640, max: 100, x: 560 });
  sw(s, cl, 'CLAY', A(125, 900), 220, 560, 780, { from: 1.5, color: heat(cl, t) > 0.05 ? undefined : hmix('#E8E5DE', AMBER, warm) });
  void c;
}

// ================================================================== BREAKDOWN
// SO YOU'RE SERIOUS. / I'M SERIOUS. / IT'S WEIGHTS. — the interrogation room: two silhouettes across the table under a red bulb, the
// transcript typing below; on IT'S WEIGHTS the bulb dies and only a CRT under the table lights the whisper.
function serious(s: S) {
  const { t, c, g, sh } = s;
  const q = ln(s, 0), a = ln(s, 1), wh = ln(s, 2), wh2 = s.sh.lines.length > 3 ? ln(s, 3) : null;
  backdrop(s, 0.01, 0.015);
  const dark = gutter(t, wh.start - 0.15, 0.3, 6);
  cam(s, snapCam(t, [0, q.start - 0.1, a.start - 0.1, wh.start - 0.2], [{ x: W / 2, y: H / 2, z: 1, r: 0 }, { x: W / 2 - 140, y: H / 2, z: 1.06, r: 0.012 }, { x: W / 2 + 140, y: H / 2, z: 1.06, r: -0.012 }, { x: W / 2, y: H / 2 + 20, z: 0.98, r: 0 }], 0.5));
  // bulb + red cone
  const bx = W / 2, by = 300;
  cone(s, bx, by, 0, 0.62, 640, RED, 0.2 * dark, 0.35);
  c.strokeStyle = grey(0.4); c.lineWidth = 2; c.beginPath(); c.moveTo(bx, 0); c.lineTo(bx, by - 20); c.stroke();
  c.fillStyle = hmix('#3A3A3A', '#FF8A9C', dark); c.beginPath(); c.ellipse(bx, by, 16, 22, 0, 0, TAU); c.fill();
  pool(g, bx, by, 200, RED, 0.6 * dark);
  // the table, the two of them
  c.fillStyle = grey(0.08 + 0.05 * dark); c.beginPath(); c.moveTo(440, 720); c.lineTo(1480, 720); c.lineTo(1620, 860); c.lineTo(300, 860); c.closePath(); c.fill();
  womanBust(c, 525, 560, 200, hx(RED, 0.8 * dark), 1); womanBust(c, 520, 560, 200, grey(0.015), 1);
  man(c, 1455, 900, 640, hx(RED, 0.8 * dark), -1); man(c, 1460, 900, 640, grey(0.015), -1);
  // the transcript
  typeOn(s, 'Q: So you’re serious.', 330, 920, q.start - 0.05, q.end, 26, '#9EA2A8');
  typeOn(s, 'A: I’m serious.', 1100, 920, a.start - 0.05, a.end, 26, '#9EA2A8');
  // SERIOUS, twice
  lyric(s, q.words.slice(0, -1), 300, { width: 400, max: 70, x: 520, alpha: dark });
  sw(s, lastW(q), 'SERIOUS', A(125, 900), 110, 500, 420, { from: 1.5, alpha: dark });
  lyric(s, a.words.slice(0, -1), 300, { width: 300, max: 70, x: 1400, alpha: dark });
  sw(s, lastW(a), 'SERIOUS', A(125, 900), 120, 1440, 430, { from: 1.6, alpha: dark });
  // the whisper, by CRT light
  const crt = prog(t, wh.start + 0.1, wh.start + 0.6);
  if (crt > 0) {
    c.fillStyle = hx('#071514', 1); c.fillRect(840, 760, 240, 160);
    setFont(c, F.mono(500), 18); c.textAlign = 'left';
    for (let r = 0; r < 6; r++) { const v = hash(r, Math.floor(t * 6)) * 2 - 1; c.fillStyle = hx(TEAL, 0.9 * crt); c.fillText((v >= 0 ? '+' : '') + v.toFixed(4) + '  ' + (hash(r, 3) * 2 - 1).toFixed(4), 856, 790 + r * 22); }
    pool(g, 960, 840, 260, TEAL, 0.3 * crt);
  }
  wh.words.forEach((w, i) => { if (t > w.start - 0.05) label(c, i ? 'weights.' : 'it’s', F.serif(400, true), 64, W / 2 - 60 + i * 140, 640, hmix('#9EA2A8', TEAL, heat(w, t), on(w, t, 0.4))); });
  // the second whisper: bigger, the CRT still on
  if (wh2) wh2.words.forEach((w, i) => { if (t > w.start - 0.05) label(c, i ? 'WEIGHTS.' : 'IT’S', i ? A(125, 900) : A(62, 300), i ? 150 : 60, W / 2 + (i ? 60 : -330), 520, hmix('#9EA2A8', TEAL, Math.max(0.4, heat(w, t)), on(w, t, 0.5))); });
  void sh;
}

// INSTRUMENTAL — the jazz club: a point-cloud trio under three coloured spots in the haze, the JAZZ sign in script, the camera
// circling the bandstand.
function trio(): P3[] {
  return cached2('trio', () => {
    const base = figureCloud(4200, 9), out: P3[] = [];
    const r = mulberry32(77);
    [[-260, 0], [0, 1], [260, 2]].forEach(([dx, id]) => { for (const p of base) out.push({ x: p.x + dx!, y: p.y, z: p.z + (id === 1 ? -40 : 0), k: id!, h: p.h }); });
    // upright bass
    for (let i = 0; i < 1400; i++) { const a = r() * TAU, rr = Math.sqrt(r()); const yy = -40 - rr * Math.sin(a) * 60 - 40; out.push({ x: -200 + Math.cos(a) * rr * 34, y: yy - 20, z: 30 + (r() - 0.5) * 18, k: 10, h: r() }); }
    for (let i = 0; i < 300; i++) out.push({ x: -200 + (r() - 0.5) * 4, y: -140 - r() * 120, z: 30, k: 10, h: r() });
    // sax: a J-curve
    for (let i = 0; i < 600; i++) { const f = r(); const x = 20 + 18 * Math.sin(f * 3), y = -150 + f * 90, rr = 3 + f * 10; const a = r() * TAU; out.push({ x: x + Math.cos(a) * rr, y, z: 30 + Math.sin(a) * rr, k: 11, h: r() }); }
    // piano: a box with a lid
    for (let i = 0; i < 2200; i++) { const f = r(); out.push({ x: 300 + (r() - 0.5) * 220, y: -70 - (f < 0.2 ? r() * 40 : 0) - (f > 0.8 ? 60 + r() * 50 : 0), z: 80 + (r() - 0.5) * 140, k: 12, h: r() }); }
    return out;
  });
}
const C2 = new Map<string, P3[]>();
const cached2 = (k: string, f: () => P3[]) => { let v = C2.get(k); if (!v) { v = f(); C2.set(k, v); } return v; };
function club(s: S) {
  const { t, c, g, sh } = s;
  backdrop(s, 0.01, 0.02);
  cam(s, { x: W / 2, y: H / 2, z: 1, r: 0 }, 0.02);
  const ang = lerp(-0.7, 0.7, prog(t, sh.start, sh.end, ease.inOutQuad));
  const cm = lookAt(Math.sin(ang) * 640, -200, -Math.cos(ang) * 640, 0, -100, 0, 1000, W / 2, H / 2 + 60);
  const bp = s.au.beatAt(t);
  const spots = [{ x: -260, c: PINK, a: 0.5 + 0.5 * Math.sin(bp * Math.PI / 2) }, { x: 0, c: AMBER, a: 0.6 + 0.4 * Math.sin(bp * Math.PI / 4 + 1) }, { x: 260, c: TEAL, a: 0.5 + 0.5 * Math.sin(bp * Math.PI / 2 + 2) }];
  // beams in the haze (screen space from the projected figure tops)
  spots.forEach((sp) => {
    const p = proj2(cm, sp.x, -170, 0); if (!p) return;
    cone(s, p.x, 140, Math.atan2(-(p.x - p.x), 1) * 0, 0.2, p.y + 300 - 140, sp.c, 0.12 * sp.a, 0.4);
    pool(c, p.x, p.y + 260 * p.k, 200 * p.k + 60, sp.c, 0.25 * sp.a, 0.3);
  });
  const kick = s.au.sample(t).kick;
  drawCloud(s, trio(), cm, (q, i) => {
    const sp = q.k < 3 ? spots[q.k]! : q.k === 10 ? spots[0]! : q.k === 11 ? spots[1]! : spots[2]!;
    const instr = q.k >= 10;
    const a = (0.35 + 0.45 * q.h) * (0.5 + 0.5 * sp.a);
    if (instr && hash(i, 3) > 0.7) return [sp.c, 0.8 * sp.a, 2.6, 0.3 * sp.a + 0.3 * kick];
    return [hmix('#D9D6CF', sp.c, 0.5 * sp.a), a, 2.3, 0];
  }, { base: 1.4 });
  // haze grain
  for (let i = 0; i < 120; i++) { const x = (hash(i, 1) * W + t * 20 * (hash(i, 2) - 0.5)) % W, y = 200 + hash(i, 3) * 600; c.fillStyle = grey(0.7, 0.05); c.fillRect(x, y, 3, 3); }
  neon(s, 'jazz', 1500, 330, { font: 'script', size: 200, color: 'pink', lit: () => ignite(t, sh.start + 0.3, 7, 0.06), box: { pad: 40, a: 0.6 } });
  neon(s, 'TONIGHT · THE WEIGHTS TRIO', 400, 250, { font: 'tech', size: 36, color: 'amber', lit: () => ignite(t, sh.start + 1.2, 8, 0.1), width: 3.5, electrodes: false, standoffs: false });
  void g;
}
function proj2(cm: ReturnType<typeof lookAt>, x: number, y: number, z: number) {
  const dx = x - cm.x, dy = y - cm.y, dz = z - cm.z, cy = Math.cos(cm.yaw), sy = Math.sin(cm.yaw);
  const rx = dx * cy - dz * sy; let rz = dx * sy + dz * cy; const cp = Math.cos(cm.pitch), sp = Math.sin(cm.pitch);
  const ry = dy * cp - rz * sp; rz = dy * sp + rz * cp; if (rz < 5) return null; const k = cm.f / rz;
  return { x: (cm.cx ?? W / 2) + rx * k, y: (cm.cy ?? H / 2) + ry * k, k };
}

// INSTRUMENTAL — the drum build: on the roof the big sign is bent tube by tube on the beat, a torch flame at the glass; on the last
// downbeat it strikes.
function signbuild(s: S) {
  const { t, c, g, sh } = s;
  backdrop(s, 0.03, 0.01);
  const end = sh.end;
  const p = prog(t, sh.start, end - 0.6, ease.linear);
  const beat = 60 / s.au.bpm;
  const steps = Math.floor((t - sh.start) / beat);
  const NB = Math.max(2, Math.floor((end - sh.start) / beat) - 1);
  const build = clamp(snapV(t, [sh.start, ...Array.from({ length: NB }, (_, i) => sh.start + i * beat)], [0, ...Array.from({ length: NB }, (_, i) => Math.min(1, (i + 1) / NB))], 0.2));
  cam(s, { x: W / 2, y: H / 2, z: lerp(1.04, 0.97, ease.inOutCubic(p)), r: lerp(0.02, 0, p) }, 0.02);
  // city under the roofline
  roofSet(s);
  const strike = end - 0.02;
  const text = 'MADE OF WEIGHTS', size = 190;
  const st = stext(text, 'readable', size);
  neon(s, text, W / 2, 640, { font: 'readable', size, color: 'red', build, lit: () => ignite(t, strike, 3, 0), box: { pad: 50, a: 0.85 } });
  // the torch at the glass being bent
  if (build < 1 && t < strike) {
    const L = st.total * build; let hx0 = 0, hy0 = 0;
    for (let i = 0; i < st.strokes.length; i++) { if (st.startLen[i]! > L) break; const pts = st.strokes[i]!; const pt = pts[Math.min(pts.length - 1, Math.max(0, st.lens[i]!.findIndex((v) => v >= L - st.startLen[i]!)))]!; hx0 = pt.x; hy0 = pt.y; }
    const x = W / 2 - st.width / 2 + hx0, y = 640 + hy0;
    pool(g, x, y, 60 + 20 * Math.sin(t * 40), '#FFB050', 0.9);
    pool(g, x, y, 14, '#FFFFFF', 1);
    for (let k = 0; k < 8; k++) { const a = hash(k, Math.floor(t * 20)) * TAU, r = 20 + 40 * hash(k, 5, Math.floor(t * 20)); c.fillStyle = hx('#FFD080', 0.9); c.fillRect(x + Math.cos(a) * r, y + Math.sin(a) * r, 3, 3); }
  }
  setFont(c, F.mono(600), 24); c.fillStyle = grey(0.6); c.textAlign = 'left';
  c.fillText(`TUBE ${String(Math.min(NB, steps + 1)).padStart(2, '0')} / ${NB}`, 260, 900);
  if (t >= strike - 0.05) s.post.flash = 0.5 * pulseAt(t, strike, 0.12);
  rain(s, 160, 0.1, 0.12, 31);
}

// ================================================================== FINAL CHORUS
// MADE OF WEIGHTS, AND MADE OF MEAT — two shop signs side by side: a cold teal MADE OF WEIGHTS and a butcher's pink script made of
// meat.
function meatweights(s: S) {
  const { t, c, sh } = s;
  const l = ln(s), an = fw(l, /^and$/i);
  const g1 = l.words.slice(0, an.index), g2 = l.words.slice(an.index + 1);
  backdrop(s, 0.03, 0.01);
  // the same rooftop and camera the build ended on (no jump at the cut), then a tilt up to the second sign
  const up = prog(t, an.start - 0.25, an.start + 0.45, ease.inOutCubic);
  cam(s, { x: W / 2, y: H / 2 - 70 * up, z: 0.97 - 0.03 * up, r: 0 }, 0);
  roofSet(s);
  const heat1 = Math.max(0, ...g1.map((w) => heat(w, t)));
  neon(s, 'MADE OF WEIGHTS', W / 2, 640, { font: 'readable', size: 190, color: 'red', lit: () => ignite(t, sh.start - 0.2, 3, 0), glow: 1 + 0.8 * heat1, box: { pad: 50, a: 0.85 } });
  const gk = prog(t, sh.start, an.start, ease.inOutQuad);
  c.save(); s.g.save(); c.globalAlpha = Math.max(gk, prog(t, an.start, an.start + 0.1)); neonWords(s, g2, W / 2, 330, { font: 'script', size: 160, color: 'pink', cased: true, box: { pad: 40, a: 0.85 }, seed: 5 }); c.restore(); s.g.restore();
  sw(s, an, 'AND', A(62, 300), 64, 1600, 400, { from: 1.2 });
  rain(s, 160, 0.1, 0.12, 31);
  void c;
}
/** The rooftop of the sign build: point-cloud city below, the scaffold under the sign. */
function roofSet(s: S) {
  const c = s.c;
  const cm = lookAt(0, -700, -1800, 0, -400, 2000, 900);
  drawCloud(s, cityCloud(13, 30, 3000, 4500), cm, (q, i, d) => { const fog = clamp(1 - d / 6000); if (q.k === 1 && hash(i, 8) < 0.5) return [hash(i, 3) > 0.6 ? TEAL : AMBER, 0.7 * fog, 2.4, 0.15 * fog]; return ['#BDBAB3', 0.28 * fog, 2, 0]; }, { base: 1.1 });
  c.strokeStyle = grey(0.16); c.lineWidth = 6;
  for (let x = 260; x <= 1660; x += 100) { c.beginPath(); c.moveTo(x, 760); c.lineTo(x + 50, 840); c.lineTo(x + 100, 760); c.stroke(); }
  c.beginPath(); c.moveTo(260, 760); c.lineTo(1760, 760); c.moveTo(260, 840); c.lineTo(1760, 840); c.stroke();
}

// TWO IMPROBABLE THINGS THAT HAPPENED TO MEET — a cold sphere of numbers and a warm one drift together and touch on MEET.
function meet(s: S) {
  const { t, c, g } = s;
  const l = ln(s), me = lastW(l), im = fw(l, /improbable/i), th = fw(l, /that/i);
  backdrop(s, 0.01, 0.02);
  cam(s, { x: W / 2, y: H / 2, z: snapV(t, [0, me.start - 0.1], [1, 1.1], 0.4), r: 0 });
  const k = prog(t, s.sh.start, me.start, ease.inOutCubic);
  const d = lerp(520, 150, k);
  const cm = lookAt(0, 0, -1300, 0, 0, 0, 1000, W / 2, 600);
  const P = sphereCloud(2600, 140, 4);
  const spin = t * 0.6;
  for (const [side, colr] of [[-1, '#CFE6EA'], [1, '#FF8FA8']] as const) {
    const pts: P3[] = P.map((p) => ({ x: p.x * Math.cos(spin * side) - p.z * Math.sin(spin * side) + side * d, y: p.y, z: p.x * Math.sin(spin * side) + p.z * Math.cos(spin * side), k: 0, h: p.h }));
    drawCloud(s, pts, cm, (q) => [colr, 0.3 + 0.5 * q.h, 2.6, 0.08], { base: 1.4 });
  }
  const spk = pulseAt(t, me.start, 0.25);
  if (t > me.start - 0.03) { pool(g, W / 2, 600, 300, '#FFFFFF', 0.6 * spk + 0.15); s.post.flash = 0.25 * spk; }
  lyric(s, l.words.slice(0, im.index), 230, { width: 300, max: 90, x: 420 });
  sw(s, im, 'IMPROBABLE', A(87, 900), 130, 1100, 240, { from: 1.4 });
  lyric(s, l.words.slice(im.index + 1, me.index), 900, { width: 700, max: 70, x: 620 });
  sw(s, me, 'MEET', A(125, 900), 170, 1380, 880, { from: 1.6 });
  void [c, th];
}

// YOU CAN CALL IT ARITHMETIC / YOU CAN CALL IT A HEARTBEAT — a monitor trace: square steps of arithmetic, then the QRS spikes of a
// heartbeat on the beat; HEARTBEAT strikes in red.
function ecg(s: S) {
  const { t, c, g } = s;
  const a1 = ln(s, 0), a2 = ln(s, 1), ar = lastW(a1), hb = lastW(a2);
  backdrop(s, 0.01, 0.02);
  cam(s, snapCam(t, [0, a2.start - 0.1], [{ x: W / 2, y: H / 2 - 20, z: 1.02, r: 0 }, { x: W / 2, y: H / 2 + 20, z: 1.04, r: 0 }], 0.4));
  const x0 = 160, x1 = 1760, ym = 560, speed = 520;
  c.strokeStyle = hx('#6BFF8E', 0.08); c.lineWidth = 1;
  for (let x = x0; x <= x1; x += 40) { c.beginPath(); c.moveTo(x, 330); c.lineTo(x, 800); c.stroke(); }
  for (let y = 330; y <= 800; y += 40) { c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); }
  const beat = 60 / s.au.bpm;
  const y = (tx: number) => {
    if (tx < a2.start) { const st = Math.floor(tx * 4); return ym - (hash(st, 3) - 0.5) * 160; }
    const ph = ((tx - a2.start) / beat) % 1;
    return ym - (ph < 0.04 ? -40 : ph < 0.08 ? 260 : ph < 0.12 ? -80 : ph > 0.4 && ph < 0.5 ? 50 * Math.sin((ph - 0.4) * 31) : 0);
  };
  for (const ctx of [c, g]) {
    ctx.strokeStyle = hx('#6BFF8E', ctx === c ? 0.95 : 0.45); ctx.lineWidth = ctx === c ? 3.5 : 10; ctx.beginPath();
    for (let x = x0; x <= x1; x += 2) { const tx = t - (x1 - x) / speed; x === x0 ? ctx.moveTo(x, y(tx)) : ctx.lineTo(x, y(tx)); }
    ctx.stroke();
  }
  pool(g, x1, y(t), 40, '#6BFF8E', 0.9);
  const bpmStr = t < a2.start ? 'Σ  0.0417' : `♥ ${Math.round(s.au.bpm)} BPM`;
  label(c, bpmStr, F.mono(700), 40, 1600, 300, hx('#6BFF8E', 0.85), 'right');
  lyric(s, a1.words.slice(0, -1), 240, { width: 700, max: 90, x: 520, alpha: 1 - prog(t, a2.start - 0.1, a2.start + 0.2) });
  sw(s, ar, 'ARITHMETIC', A(62, 900), 120, 1300, 880, { from: 1.4, alpha: 1 - prog(t, a2.start - 0.1, a2.start + 0.2) });
  lyric(s, a2.words.slice(0, -1), 240, { width: 700, max: 90, x: 520 });
  if (t > a2.start - 0.3) neon(s, 'HEARTBEAT', 1240, 920, { font: 'readable', size: 140, color: 'red', lit: () => ignite(t, hb.start - 0.03, 2, 0) * (0.75 + 0.25 * pulseAt(t - Math.floor((t - hb.start) / beat) * beat, hb.start, 0.15)) });
}

// BUT THE SKY IS TOO COLD TO BE LONELY IN — the camera tilts up off the rooftops into a sky of points; the words hang as
// constellations, LONELY small and alone.
function sky(s: S) {
  const { t, c, g, sh } = s;
  const l = ln(s), sk = fw(l, /sky/i), co = fw(l, /cold/i), lo = fw(l, /lonely/i);
  backdrop(s, 0.0, 0.03);
  const tilt = prog(t, sh.start, sk.start + 0.8, ease.inOutCubic);
  cam(s, { x: W / 2, y: lerp(H / 2 + 260, H / 2 - 40, tilt), z: 1, r: 0 }, 0.02);
  // stars
  const r = mulberry32(5);
  for (let i = 0; i < 900; i++) {
    const x = r() * (W + 400) - 200, y = -400 + r() * 1300, m = r();
    const tw = 0.5 + 0.5 * Math.sin(t * (1 + 3 * r()) + i);
    c.fillStyle = hx(m > 0.97 ? '#CFE8FF' : '#E8E5DE', (0.25 + 0.6 * m) * tw); c.fillRect(x, y, 1.5 + m * 2, 1.5 + m * 2);
  }
  // rooftops at the bottom
  c.fillStyle = grey(0.01); for (let i = 0; i < 14; i++) c.fillRect(i * 150, 980 - hash(i, 3) * 160, 140, 600);
  pool(g, 1400, 980 - 140, 30, RED, Math.floor(t * 1.2) % 2 ? 0.7 : 0.15);
  // the line as constellations: each word's anchor star, connected as it is sung
  const pos: [number, number][] = [[300, 330], [520, 290], [760, 390], [980, 300], [1180, 410], [1400, 330], [1560, 450], [1000, 600], [1660, 620], [1420, 720]];
  const ws = l.words;
  c.strokeStyle = hx('#CFE8FF', 0.35); c.lineWidth = 1.5; c.beginPath();
  ws.forEach((w, i) => { const p = pos[i % pos.length]!; if (t > w.start - 0.03) { i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); } });
  c.stroke();
  ws.forEach((w, i) => {
    const p = pos[i % pos.length]!;
    const big = w === sk || w === co;
    const alone = w === lo;
    pool(g, p[0], p[1], 18, '#CFE8FF', 0.8 * on(w, t, 0.2));
    if (alone) { sw(s, w, 'lonely', F.serif(600, true), 92, p[0], p[1] + 74, { from: 1.1 }); return; }
    sw(s, w, U(w), A(big ? 125 : 62, big ? 900 : 300), big ? 130 : 56, p[0], p[1] - (big ? 90 : 46), { from: big ? 1.5 : 1.2 });
  });
}

// SO KEEP TALKING TO ME — a radio mast broadcasting on the beat; TALKING is held, its letters lighting one by one across the hold.
function talk(s: S) {
  const { t, c, g, sh } = s;
  const l = ln(s), ta = fw(l, /talking/i), to = fw(l, /^to$/i);
  backdrop(s, 0.01, 0.03);
  cam(s, { x: W / 2, y: H / 2, z: lerp(1, 1.08, prog(t, sh.start, sh.end)), r: 0 }, 0.03);
  // the mast
  const mx = 360;
  c.strokeStyle = grey(0.2); c.lineWidth = 4;
  c.beginPath(); c.moveTo(mx - 90, 940); c.lineTo(mx, 200); c.lineTo(mx + 90, 940); c.stroke();
  for (let y = 260; y < 940; y += 60) { const w = ((y - 200) / 740) * 90; c.beginPath(); c.moveTo(mx - w, y); c.lineTo(mx + w, y + 60); c.moveTo(mx + w, y); c.lineTo(mx - w, y + 60); c.stroke(); }
  const blink = Math.floor(t * 1.4) % 2 ? 1 : 0.15;
  pool(g, mx, 196, 50, RED, 0.9 * blink);
  const beat = 60 / s.au.bpm;
  for (let k = 0; k < 8; k++) {
    const age = ((t - sh.start) / beat - k) / 4; if (age < 0) continue; const a = age % 2;
    c.strokeStyle = hx(TEAL, clamp(0.5 - a * 0.25)); c.lineWidth = 3; c.beginPath(); c.arc(mx, 200, 80 + a * 900, -0.9, 0.9); c.stroke();
  }
  lyric(s, l.words.slice(0, ta.index), 300, { width: 500, max: 100, x: 1150 });
  // TALKING: the letters ignite across the held note
  const text = 'TALKING';
  const hold0 = ta.start - 0.03, hold1 = Math.max(ta.end, to.start - 0.1);
  neon(s, text, 1150, 620, { font: 'readable', size: 210, color: 'teal', lit: (ci) => ignite(t, lerp(hold0, hold1, ci / text.length), ci, 0.02) });
  lyric(s, l.words.slice(to.index), 840, { width: 400, max: 110, x: 1150 });
}

// ================================================================== OUTRO
// MADE OF WEIGHTS / ARE YOU THERE? ×2 / MADE OF WEIGHTS — two masts far apart across the dark city; each line is sent from one to the
// other as a ring that carries the words.
function beacons(s: S) {
  const { t, c, g } = s;
  const L = s.sh.lines;
  backdrop(s, 0.0, 0.02);
  cam(s, { x: W / 2, y: H / 2, z: 1.0, r: 0 }, 0.02);
  const cm = lookAt(0, -500, -2200, 0, -300, 2000, 900);
  drawCloud(s, cityCloud(17, 30, 3400, 4800), cm, (q, i, d) => { const fog = clamp(1 - d / 6500); if (q.k === 1 && hash(i, 8) < 0.35) return [hash(i, 3) > 0.5 ? TEAL : AMBER, 0.6 * fog, 2.2, 0.1 * fog]; return ['#BDBAB3', 0.2 * fog, 1.8, 0]; }, { base: 1.0 });
  const A_ = [300, 420], B_ = [1620, 420];
  for (const [x, y, colr] of [[A_[0], A_[1], RED], [B_[0], B_[1], TEAL]] as const) {
    c.strokeStyle = grey(0.25); c.lineWidth = 3; c.beginPath(); c.moveTo(x - 50, 940); c.lineTo(x, y); c.lineTo(x + 50, 940); c.stroke();
    pool(g, x, y - 6, 40, colr, Math.floor(t * 1.3) % 2 ? 0.8 : 0.2);
  }
  L.forEach((l, i) => {
    const fromA = /made/i.test(l.words[0]!.w);
    const [sx, sy] = fromA ? A_ : B_;
    const age = t - l.start;
    if (age < -0.05) return;
    const nxt = L[i + 1];
    const fade = nxt ? 1 - prog(t, nxt.start + 0.6, nxt.start + 1.2) : 1 - prog(t, l.end + 1.0, l.end + 2.0);
    if (fade <= 0) return;
    // the ring
    const rr = 40 + age * 900;
    c.strokeStyle = hx(fromA ? RED : TEAL, clamp(0.5 - age * 0.3)); c.lineWidth = 3; c.beginPath(); c.arc(sx!, sy!, rr, 0, TAU); c.stroke();
    const tx = fromA ? 760 : 1160, ty = fromA ? 330 : 640;
    c.save(); g.save(); c.globalAlpha = fade; g.globalAlpha = fade;
    neonWords(s, l.words, tx, ty, fromA ? { font: 'readable', size: 120, color: 'red', faulty: i >= 4 ? 0.4 : 0.03 } : { font: 'script', size: 150, color: 'teal', cased: true, seed: i });
    c.restore(); g.restore();
  });
}

// HELLO? / HELLO. — two windows across a rainy street: her pink script sign asks, his teal one answers; both in the wet street.
function hello(s: S) {
  const { t, c } = s;
  const h1 = ln(s, 0), h2 = ln(s, 1);
  backdrop(s, 0.02, 0.03);
  cam(s, snapCam(t, [0, h1.start - 0.1, h2.start - 0.1], [{ x: W / 2, y: H / 2, z: 1.0, r: 0 }, { x: W / 2 - 100, y: H / 2, z: 1.04, r: -0.01 }, { x: W / 2 + 100, y: H / 2, z: 1.04, r: 0.01 }], 0.6));
  c.fillStyle = grey(0.05); c.fillRect(0, 0, W, 640);
  for (const [x, colr] of [[520, PINK], [1400, TEAL]] as const) { c.fillStyle = grey(0.02); c.fillRect(x - 260, 250, 520, 330); c.strokeStyle = grey(0.15); c.lineWidth = 10; c.strokeRect(x - 260, 250, 520, 330); pool(s.g, x, 440, 260, colr, 0.05); }
  c.fillStyle = grey(0.03); c.fillRect(0, 640, W, 460);
  const lit1 = () => ignite(t, h1.words[0]!.start - 0.03, 1, 0.02), lit2 = () => ignite(t, h2.words[0]!.start - 0.03, 2, 0.02);
  neon(s, 'Hello?', 520, 480, { font: 'script', size: 160, color: 'pink', lit: lit1, reflect: { y: 640, a: 0.4, ripple: 8 } });
  neon(s, 'Hello.', 1400, 480, { font: 'script', size: 160, color: 'teal', lit: lit2, reflect: { y: 640, a: 0.4, ripple: 8 } });
  rain(s, 260, 0.16, 0.12, 51);
}

// END CARD — rain on the glass, THE END in red script; it buzzes, then gutters out with the last note.
function theEnd(s: S) {
  const { t, c, sh } = s;
  backdrop(s, 0.01, 0.02);
  cam(s, { x: W / 2, y: H / 2, z: lerp(1, 1.05, prog(t, sh.start, sh.end)), r: 0 }, 0.02);
  for (let i = 0; i < 30; i++) pool(c, hash(i, 1) * W, 200 + hash(i, 2) * 700, 30 + 60 * hash(i, 3), [AMBER, TEAL, RED, PINK][i % 4]!, 0.08);
  const db = s.au.downbeats.filter((x) => x >= sh.start);
  const t0 = db[1] ?? sh.start + 2, out = sh.end - 2.6;
  neon(s, 'The End', W / 2, 560, { font: 'script', size: 280, color: 'red', lit: () => ignite(t, t0, 4, 0.08) * gutter(t, out, 0.8, 3) });
  typeOn(s, 'WEIGHTS ALL THE WAY DOWN · EARLCO', W / 2 - 300, 760, t0 + 1.5, t0 + 3.0, 26, '#9EA2A8');
  for (let i = 0; i < 70; i++) { const x = hash(i, 7) * W, y = 140 + ((hash(i, 8) * 800 + t * (30 + 80 * hash(i, 9))) % 800); c.strokeStyle = grey(0.8, 0.25); c.lineWidth = 2; c.beginPath(); c.ellipse(x, y, 4, 6, 0, 0, TAU); c.stroke(); }
  s.post.fade = prog(t, sh.end - 1.2, sh.end - 0.05);
}

export const C_SHOTS: Record<string, (s: S) => void> = {
  xray, current, brain, mirror, phone, clay, serious, club, signbuild, meatweights, meet, ecg, sky, talk, beacons, hello, theEnd,
};
