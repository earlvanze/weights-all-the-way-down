// Chorus set (grows with o.n), verse 2, pre-chorus 2.
import { F, measure } from '../engine/type';
import {
  A, H, W, TAU, backdrop, blinds, cam, cityCloud, clamp, clean, cone, drawCloud, ease, fw, grey, hash, heat, hmix, hx, ignite, label,
  lerp, ln, lookAt, lyric, man, mulberry32, neon, neonW, neonWords, noise1, on, pool, prog, pulseAt, rain, setFont, snapCam, snapV, stamp, sw,
  textCloud, typeOn, brainCloud, segText, segWords, type Line, type S, type Word,
} from './noir';

const TEAL = '#35E3E6', RED = '#FF2B4E', AMBER = '#FFA23A', PINK = '#FF3FB4';
const lastW = (l: Line) => l.words[l.words.length - 1]!;
const U = (w: Word) => clean(w.w).toUpperCase();
const nOf = (s: S) => (s.sh.o.n as number) ?? 1;

/** Wet street + wall used by the chorus signs. */
function street(s: S, horizon: number, tint: string, k = 1) {
  const c = s.c;
  backdrop(s, 0.03, 0.02);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  // brick wall courses
  c.fillStyle = grey(0.06); c.fillRect(0, 0, W, horizon);
  c.strokeStyle = grey(0.1); c.lineWidth = 2;
  for (let y = 20; y < horizon; y += 34) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); for (let x = (y / 34) % 2 ? 0 : 60; x < W; x += 120) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 34); c.stroke(); } }
  // sidewalk lip and the wet road
  c.fillStyle = grey(0.12); c.fillRect(0, horizon, W, 10);
  const gr = c.createLinearGradient(0, horizon + 10, 0, H); gr.addColorStop(0, grey(0.035)); gr.addColorStop(1, grey(0.07)); c.fillStyle = gr; c.fillRect(0, horizon + 10, W, H - horizon);
  c.restore();
  pool(s.g, W / 2, horizon - 200, 900, tint, 0.08 * k, 0.6);
}
/** Ripple streaks over the reflection band. */
function ripples(s: S, y0: number, y1: number, a = 0.5) {
  const c = s.c;
  for (let i = 0; i < 60; i++) {
    const y = y0 + hash(i, 1) * (y1 - y0), x = hash(i, 2) * W, w = 60 + 220 * hash(i, 3);
    const ph = Math.sin(s.t * (1 + hash(i, 4) * 2) + i);
    c.fillStyle = grey(0.02, a * (0.5 + 0.5 * ph)); c.fillRect(x + ph * 20, y, w, 3);
  }
}

// ================================================================== CHORUS
// MADE OF WEIGHTS (made of weights) — the sign ignites word by word on the wall; the echo lights its reflection in the street.
function heroNeon(s: S) {
  const { t } = s;
  const n = nOf(s);
  const l0 = ln(s, 0), l1 = ln(s, 1);
  const horizon = 620;
  street(s, horizon, n > 1 ? PINK : RED);
  const ech = l1.words[0]!;
  cam(s, snapCam(t, [0, ech.start - 0.12], [{ x: W / 2, y: 470, z: 1.04, r: 0 }, { x: W / 2, y: 610, z: 1.0, r: 0.012 }], 0.5));
  const font = n > 1 ? 'script' : 'readable';
  const text = n > 1 ? 'made of weights' : 'MADE OF WEIGHTS';
  const size = n > 1 ? 230 : 190;
  const color = n > 1 ? 'pink' : 'red';
  const by = 500;
  const words0 = l0.words, words1 = l1.words;
  neonWords(s, words0, W / 2, by, { font, size, color, cased: n > 1, box: { pad: 56, a: 0.85 }, faulty: 0.05 });
  // the echo is the reflection (y mirrored about the kerb line)
  neonWords(s, words1, W / 2, by, { font, size, color, cased: n > 1, reflect: { y: horizon + 6, a: 0.55, ripple: 9 }, reflectOnly: true, seed: 40 });
  ripples(s, horizon + 14, 1000, 0.6);
  // a lamp post at the edge, and rain
  s.c.fillStyle = grey(0.02); s.c.fillRect(1700, 120, 18, horizon - 120); s.c.fillRect(1640, 120, 80, 12);
  pool(s.g, 1660, 140, 80, AMBER, 0.5);
  rain(s, 300, 0.18, 0.12, 11);
  if (n > 1) neon(s, 'ALL THE WAY DOWN', 360, 260, { font: 'tech', size: 54, color: 'teal', lit: () => ignite(t, s.sh.start + 0.1, 5, 0.2), width: 4.5 });
}

// ZERO POINT SOMETHING ALL THE WAY DOWN — the camera drops straight down through planes of weights (point cloud); each word slams
// in from the depth and flies up past the lens as the next arrives; the decimal grows a digit per word.
function fall(s: S) {
  const { t, c, g, sh } = s;
  const l = ln(s), ws = l.words, dn = lastW(l);
  backdrop(s, 0.0, 0.02);
  cam(s, { x: W / 2, y: H / 2, z: 1, r: 0 }, 0);
  const P = planes();
  const p = prog(t, sh.start, sh.end, (x) => x);
  const fallY = lerp(-9800, -2600, ease.inOutQuad(p)) + 900 * prog(t, dn.start, dn.start + 0.6, ease.outExpo);
  const cm = lookAt(0, fallY, 0, 0, fallY + 1000, 120, 900);
  cm.yaw += 0.25 * Math.sin(t * 0.8);
  drawCloud(s, P, cm, (q, _i, d) => {
    const a = clamp(1 - d / 3200) * clamp((d - 40) / 200);
    if (a <= 0) return null;
    return q.k ? [RED, 0.9 * a, 3.2, 0.5 * a] : ['#D8D5CE', 0.55 * a, 2.6, 0];
  }, { base: 2.2 });
  // the words: current one slams in from the depth, previous ones fly up past the lens
  ws.forEach((w, i) => {
    if (t < w.start - 0.06) return;
    const nx = ws[i + 1];
    const big = i === ws.length - 1;
    const away = nx ? prog(t, nx.start - 0.05, nx.start + 0.3, ease.inCubic) : 0;
    if (away >= 1) return;
    const k = prog(t, w.start - 0.06, w.start + 0.22, ease.outExpo);
    const sc = lerp(0.35, 1, k) * lerp(1, 3.2, away);
    const x = W / 2 + (i % 2 ? 1 : -1) * 160 * (1 - k) + (big ? 0 : (i % 2 ? 120 : -120));
    const y = H / 2 + 40 - away * 380;
    sw(s, w, U(w), A(big ? 125 : 100, 900), big ? 260 : 170, x, y, { sc, alpha: 1 - away });
  });
  // the decimal, a digit per word
  const digits = '0417291883';
  const nd = ws.filter((w) => t >= w.start - 0.03).length;
  const str = '0.' + digits.slice(0, Math.max(1, Math.min(digits.length, nd + 2))) + (nd >= ws.length ? '…' : '');
  label(c, str, F.mono(700), 46, 240, 220, grey(0.85), 'left');
  label(g, str, F.mono(700), 46, 240, 220, hx(RED, 0.25), 'left');
}
let PLANES: ReturnType<typeof textCloud> | null = null;
function planes() {
  if (PLANES) return PLANES;
  const r = mulberry32(31), out: { x: number; y: number; z: number; k: number; h: number }[] = [];
  for (let j = 0; j < 34; j++) for (let a = 0; a < 26; a++) for (let b = 0; b < 26; b++) {
    if (r() < 0.25) continue;
    out.push({ x: (a - 12.5) * 70 + (r() - 0.5) * 10, y: -j * 300, z: (b - 12.5) * 70 + 120, k: r() < 0.03 ? 1 : 0, h: r() });
  }
  PLANES = out;
  return out;
}

// MADE OF WEIGHTS (made of weights) — on the roof: a script sign on scaffolding above the point-cloud skyline; the echo lights a
// teal twin under it.
function rooftop(s: S) {
  const { t, c } = s;
  const n = nOf(s);
  const l0 = ln(s, 0), l1 = ln(s, 1);
  backdrop(s, 0.05, 0.015);
  cam(s, snapCam(t, [0, l1.words[0]!.start - 0.1], [{ x: W / 2, y: H / 2 - 20, z: 1.08, r: -0.02 }, { x: W / 2, y: H / 2 + 30, z: 1.0, r: 0.015 }], 0.4));
  const cm = lookAt(Math.sin(t * 0.1) * 300, -900, -1600, 0, -500, 2000, 900);
  drawCloud(s, cityCloud(13, 30, 3000, 4500), cm, (q, i, d) => {
    const fog = clamp(1 - d / 6000);
    if (q.k === 1 && hash(i, 8) < 0.5) return [hash(i, 3) > 0.6 ? TEAL : AMBER, 0.8 * fog, 2.6, 0.2 * fog];
    return ['#BDBAB3', 0.32 * fog, 2, 0];
  }, { base: 1.2 });
  // scaffold
  c.strokeStyle = grey(0.18); c.lineWidth = 6;
  for (let x = 300; x <= 1620; x += 110) { c.beginPath(); c.moveTo(x, 720); c.lineTo(x + 55, 800); c.lineTo(x + 110, 720); c.stroke(); }
  c.beginPath(); c.moveTo(300, 720); c.lineTo(1730, 720); c.moveTo(300, 800); c.lineTo(1730, 800); c.stroke();
  neonWords(s, l0.words, W / 2, 520, { font: 'script', size: 250, color: n > 1 ? 'red' : 'pink', cased: true, faulty: 0.08 });
  neonWords(s, l1.words, W / 2, 680, { font: 'script', size: 120, color: 'teal', cased: true, seed: 9 });
  // the aircraft beacon on the mast
  const bk = Math.floor(t * 1.2) % 2 === 0 ? 1 : 0.15;
  c.fillStyle = grey(0.15); c.fillRect(1640, 180, 8, 540); pool(s.g, 1644, 176, 60, RED, 0.8 * bk);
}

// NO ONE AT HOME, BUT THERE'S SOMEBODY AROUND — a dark facade; each word flashes in a window and the window goes dark again (no
// one); on SOMEBODY one window lights amber with a figure in it.
function windows(s: S) {
  const { t, c, g } = s;
  const l = ln(s), bu = fw(l, /^but$/i), so = fw(l, /somebody/i), ar = fw(l, /around/i);
  backdrop(s, 0.02, 0.03);
  const cols = 7, rows = 4, x0 = 260, y0 = 210, cw = 200, ch = 165;
  const lit = { q: 4, r: 2 };
  const lx = x0 + lit.q * cw + cw / 2, ly = y0 + lit.r * ch + ch / 2;
  const push = prog(t, so.start - 0.1, so.start + 0.5, ease.inOutCubic);
  cam(s, { x: lerp(W / 2, lx, push * 0.6), y: lerp(H / 2, ly + 60, push * 0.6), z: lerp(1, 1.3, push), r: 0 });
  c.fillStyle = grey(0.08); c.fillRect(x0 - 40, y0 - 40, cols * cw + 80, rows * ch + 80);
  const pre = l.words.slice(0, bu.index);
  for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
    const x = x0 + q * cw + 25, y = y0 + r * ch + 20, w = cw - 50, h = ch - 40;
    const isLit = r === lit.r && q === lit.q;
    const k = isLit ? on(so, t, 0.25) : 0;
    c.fillStyle = k > 0 ? hmix('#0A0B0D', '#FFB65C', k) : grey(0.025); c.fillRect(x, y, w, h);
    if (k > 0) { g.fillStyle = hx(AMBER, 0.45 * k); g.fillRect(x - 10, y - 10, w + 20, h + 20); man(c, x + w / 2, y + h, h * 0.9, grey(0.02), -1); }
    c.strokeStyle = grey(0.16); c.lineWidth = 4; c.strokeRect(x, y, w, h); c.beginPath(); c.moveTo(x + w / 2, y); c.lineTo(x + w / 2, y + h); c.stroke();
  }
  // the "no one at home" words, one per window, a flash then dark
  const slots = [[1, 1], [2, 0], [3, 1], [5, 1]];
  pre.forEach((w, i) => {
    const [q, r] = slots[i % slots.length]!;
    const x = x0 + q! * cw + cw / 2, y = y0 + r! * ch + ch / 2;
    const k = on(w, t, 0.1);
    if (k <= 0) return;
    const fl = pulseAt(t, w.start, 0.25);
    c.fillStyle = hx('#E9E2CF', 0.85 * fl); c.fillRect(x - cw / 2 + 25, y - ch / 2 + 20, cw - 50, ch - 40);
    label(c, U(w), A(100, 900), 46, x, y, fl > 0.2 ? grey(0.06) : grey(0.42));
  });
  const bandK = on(bu, t, 0.2);
  if (bandK > 0) { c.fillStyle = `rgba(0,0,0,${0.75 * bandK})`; c.fillRect(lx - 420, ly + 80, 840, 230); }
  lyric(s, l.words.slice(bu.index, so.index), ly + 130, { width: 200, max: 40, x: lx - 300 });
  sw(s, so, 'SOMEBODY', A(100, 900), 80, lx + 110, ly + 130, { from: 1.4 });
  sw(s, ar, 'AROUND', A(125, 900), 96, lx, ly + 245, { from: 1.5 });
}

// YOU CAN CALL IT ARITHMETIC — an adding machine prints the line onto its tape, a line per word; ARITHMETIC is the total.
function adding(s: S) {
  const { t, c } = s;
  const l = ln(s), ws = l.words, ar = lastW(l);
  backdrop(s, 0.03, 0.05);
  const done = ws.filter((w) => t >= w.start - 0.04).length;
  const adv = snapV(t, [0, ...ws.map((w) => w.start - 0.04)], [0, ...ws.map((_, i) => i + 1)], 0.12, ease.outCubic);
  cam(s, { x: W / 2, y: H / 2, z: 1.05, r: -0.03 });
  // tape
  const tx = 700, tw = 520;
  c.fillStyle = grey(0.86); c.fillRect(tx, 0, tw, 780);
  pool(c, tx + tw / 2, 520, 600, '#FFFFFF', 0.08);
  setFont(c, F.mono(700), 46); c.textAlign = 'left';
  ws.forEach((w, i) => {
    if (i >= done) return;
    const y = 690 - (adv - i - 1) * 86;
    if (y < 120) return;
    const isLast = w === ar;
    const num = (hash(i, 3) * 9).toFixed(2);
    c.fillStyle = grey(0.35); setFont(c, F.mono(600), 34); c.textAlign = 'right'; c.fillText(isLast ? '=' : '+', tx + 60, y);
    c.textAlign = 'left'; c.fillText(isLast ? '' : num, tx + 80, y);
    if (!isLast) label(c, U(w), A(100, 900), 54, tx + 370, y - 18, hmix('#151515', RED, heat(w, t)));
  });
  // the machine
  c.fillStyle = grey(0.12); c.beginPath(); c.roundRect(420, 760, 1080, 320, 30); c.fill();
  c.fillStyle = grey(0.06); c.fillRect(tx - 20, 760, tw + 40, 30);
  for (let r = 0; r < 3; r++) for (let q = 0; q < 9; q++) {
    const press = ws.some((w, i) => (i * 7 + 3) % 27 === r * 9 + q && t > w.start - 0.03 && t < w.start + 0.12);
    c.fillStyle = press ? grey(0.55) : grey(0.3); c.beginPath(); c.arc(520 + q * 110, 840 + r * 60 + (press ? 4 : 0), 22, 0, TAU); c.fill();
  }
  // ARITHMETIC: printed huge as the total across the tape
  const k = on(ar, t, 0.18);
  if (k > 0) {
    sw(s, ar, 'ARITHMETIC', A(62, 900), 150, W / 2, 610, { from: 1.5 });
    c.fillStyle = hx(RED, k); c.fillRect(tx, 515, tw, 4);
  }
}

// CALL IT A TRICK OF THE LIGHT — the words ARE the light: projected through venetian blinds onto a wall, sliced by the slats; on
// LIGHT the slats open.
function blindsShot(s: S) {
  const { t, c, g } = s;
  const l = ln(s), li = lastW(l), tr = fw(l, /trick/i);
  backdrop(s, 0.05, 0.03);
  cam(s, snapCam(t, [0, li.start - 0.1], [{ x: W / 2, y: H / 2, z: 1.05, r: -0.02 }, { x: W / 2, y: H / 2, z: 1.12, r: 0 }], 0.45));
  const open = lerp(0.42, 0.8, prog(t, li.start - 0.05, li.start + 0.3, ease.outExpo));
  // the slatted light (the blinds' light on the wall)
  blinds(s, 220, 200, 1500, 720, -0.18, 18, open, '#F4ECD8', 0.14);
  // the words, drawn as light and then cut by the slat shadows
  lyric(s, l.words.slice(0, tr.index), 330, { width: 900, max: 120, x: 860 });
  sw(s, tr, 'TRICK', A(125, 900), 190, 690, 560, { from: 1.4 });
  lyric(s, l.words.slice(tr.index + 1, li.index), 560, { width: 240, max: 66, x: 1360 });
  sw(s, li, 'LIGHT', A(125, 900), 230, 1100, 780, { from: 1.6 });
  // slat shadows across everything (skewed like the light)
  const slats = 18, sh = 720 / slats;
  for (const ctx of [c, g]) {
    ctx.save(); ctx.transform(1, 0, -0.18, 1, 0, 0);
    ctx.fillStyle = ctx === c ? 'rgba(0,0,0,0.78)' : 'rgba(0,0,0,1)';
    for (let i = 0; i < slats + 4; i++) { const y = 200 + (i - 2) * sh + sh * open; ctx.fillRect(-200 + 0.18 * y, y, 2400, sh * (1 - open)); }
    ctx.restore();
  }
  // a fedora shadow falling across the wall
  man(c, 300, 1000, 760, 'rgba(0,0,0,0.5)', 1);
}

// BUT IT'S MADE OF WEIGHTS, MADE OF WEIGHTS — macro on the glass: two signs stacked, the camera snapping word to word so you see the
// tubes, electrodes and clips; the second repeat lights in teal script.
function reprise(s: S) {
  const { t } = s;
  const n = nOf(s);
  const l = ln(s), ws = l.words;
  const m1 = fw(l, /^made$/i);
  const second = ws.filter((w) => /^made$/i.test(clean(w.w)))[1];
  const g1 = second ? ws.slice(m1.index, second.index) : ws.slice(m1.index), g2 = second ? ws.slice(second.index) : [];
  backdrop(s, 0.03, 0.04);
  const pos1 = [[560, 430], [900, 430], [1300, 430]], pos2 = [[640, 760], [960, 760], [1300, 760]];
  const all = [...g1.map((w, i) => [w, pos1[Math.min(i, 2)]!] as const), ...g2.map((w, i) => [w, pos2[Math.min(i, 2)]!] as const)];
  const k = snapCam(t, [0, ...all.map(([w]) => w.start - 0.08)], [{ x: W / 2, y: H / 2, z: 1, r: 0 }, ...all.map(([, p], i) => ({ x: lerp(W / 2, p[0]!, 0.3), y: lerp(H / 2, p[1]! - 80, 0.4), z: 1.08, r: (i % 2 ? 1 : -1) * 0.02 }))], 0.32);
  const fin = prog(t, lastW(l).end - 0.1, lastW(l).end + 0.4, ease.inOutCubic);
  cam(s, { x: lerp(k.x, W / 2, fin), y: lerp(k.y, H / 2 + 60, fin), z: lerp(k.z, 0.98, fin), r: lerp(k.r, 0, fin) });
  lyric(s, ws.slice(0, m1.index), 250, { width: 500, max: 80, x: 420 });
  neonWords(s, g1, W / 2 + 20, 470, { font: 'readable', size: 200, color: n > 1 ? 'pink' : 'red', box: { pad: 40, a: 0.8 } });
  if (g2.length) neonWords(s, g2, W / 2 + 60, 800, { font: 'script', size: 200, color: 'teal', cased: true, seed: 17 });
  else neon(s, 'all the way down', W / 2, 780, { font: 'script', size: 140, color: 'teal', lit: () => ignite(t, lastW(l).end + 0.1, 17, 0.05) });
  rain(s, 120, 0.1, 0.1, 21);
}

// AND IT'S KEEPING ME UP TONIGHT — the ceiling of a bedroom: the sign outside throws red slatted light that blinks with the beat;
// the words are projected on the ceiling; the clock flips to 3:00 on TONIGHT. (Holds through the turnaround.)
function insomnia(s: S) {
  const { t, c, g, sh } = s;
  const l = ln(s), to = lastW(l), ke = fw(l, /keeping/i);
  backdrop(s, 0.02, 0.03);
  const p = prog(t, sh.start, sh.end);
  cam(s, { x: W / 2, y: H / 2, z: lerp(1.0, 1.06, p), r: lerp(-0.02, 0.01, p) }, 0.03);
  const beat = Math.floor((t - sh.start) / (60 / s.au.bpm));
  const blink = beat % 2 === 0 ? 1 : 0.25;
  blinds(s, 300, 160, 1400, 620, 0.5, 12, 0.5, RED, 0.16 * blink);
  c.strokeStyle = grey(0.12); c.lineWidth = 2; c.beginPath(); c.moveTo(200, 900); for (let i = 1; i < 14; i++) c.lineTo(200 + i * 110, 900 - i * 30 + (hash(i, 3) - 0.5) * 40); c.stroke();
  // every word in the alarm clock's LED segments
  segWords(s, l.words.slice(0, ke.index), W / 2, 300, 56, RED);
  segWords(s, l.words.slice(ke.index, to.index), W / 2, 470, 104, RED);
  segWords(s, [to], W / 2, 690, 170, RED);
  // the clock reads the video's own timestamp
  const mm = Math.floor(t / 60), ss = Math.floor(t % 60);
  const stamp_ = `${mm}:${String(ss).padStart(2, '0')}`;
  segText(s, stamp_, W / 2, 880, 110, RED, (ci) => (stamp_[ci] === ':' ? (Math.floor(t * 2) % 2 ? 1 : 0.15) : 1));
  segText(s, 'AM', W / 2 + 230, 830, 36, RED, () => 1);
  pool(g, W / 2, 840, 380, RED, 0.06);
}

// ================================================================== VERSE 2
// SO IT'S A LIBRARY, A FILING DRAWER — a filing cabinet; LIBRARY slams above; the top drawer shoots open on DRAWER, full of index
// cards.
function drawer(s: S) {
  const { t, c } = s;
  const l = ln(s), li = fw(l, /library/i), dr = lastW(l), fi = fw(l, /filing/i);
  backdrop(s, 0.04, 0.06);
  cam(s, snapCam(t, [0, fi.start - 0.1], [{ x: W / 2, y: H / 2 - 40, z: 1.02, r: 0 }, { x: W / 2 + 40, y: H / 2 + 60, z: 1.1, r: -0.01 }], 0.45));
  pool(c, W / 2, 600, 900, '#D8D2C2', 0.1);
  const cx = 960, top = 430, wd = 560, dh = 170;
  c.fillStyle = grey(0.22); c.fillRect(cx - wd / 2, top, wd, dh * 3 + 20);
  c.fillStyle = grey(0.3); c.beginPath(); c.moveTo(cx - wd / 2, top); c.lineTo(cx + wd / 2, top); c.lineTo(cx + wd / 2 + 60, top - 40); c.lineTo(cx - wd / 2 + 60, top - 40); c.closePath(); c.fill();
  c.fillStyle = grey(0.14); c.beginPath(); c.moveTo(cx + wd / 2, top); c.lineTo(cx + wd / 2 + 60, top - 40); c.lineTo(cx + wd / 2 + 60, top + dh * 3 - 20); c.lineTo(cx + wd / 2, top + dh * 3 + 20); c.closePath(); c.fill();
  const out = prog(t, dr.start - 0.05, dr.start + 0.22, ease.outBack);
  for (let i = 0; i < 3; i++) {
    const y = top + 10 + i * dh, ext = i === 0 ? out : 0;
    const sc = 1 + ext * 0.2, dy = ext * 70;
    const x0 = cx - (wd - 30) * sc / 2, w0 = (wd - 30) * sc;
    if (ext > 0) { // the drawer box with cards
      c.fillStyle = grey(0.1); c.fillRect(x0, y + dy - 60 * ext, w0, 60 * ext);
      for (let k = 0; k < 14; k++) { c.fillStyle = grey(0.75 - 0.03 * (k % 3)); c.fillRect(x0 + 20 + k * (w0 - 40) / 14, y + dy - 60 * ext - 14 - (k % 4 === 1 ? 10 : 0), (w0 - 40) / 14 - 4, 40); }
    }
    c.fillStyle = grey(0.36 + 0.1 * ext); c.fillRect(x0, y + dy, w0, dh - 16);
    c.fillStyle = grey(0.7); c.fillRect(cx - 70 * sc, y + dy + 30, 140 * sc, 44);
    c.fillStyle = grey(0.15); c.fillRect(cx - 50 * sc, y + dy + 100, 100 * sc, 16);
  }
  lyric(s, l.words.slice(0, li.index), 220, { width: 400, max: 70, x: 520 });
  sw(s, li, 'LIBRARY', A(125, 900), 150, W / 2, 320, { from: 1.5 });
  // A FILING DRAWER on the drawer's label holder
  const lab = l.words.slice(li.index + 1);
  lyric(s, lab, 820, { width: 380, max: 70, x: 1590 });
}

// FACTS ON A SHELF THAT IT'S KEEPING IN STORE — every word is a book spine dropped onto the shelf as it is sung.
function shelf(s: S) {
  const { t, c } = s;
  const l = ln(s), ws = l.words;
  backdrop(s, 0.04, 0.05);
  cam(s, snapCam(t, [0, ws[4]?.start ?? 1e9], [{ x: W / 2 - 160, y: H / 2, z: 1.08, r: 0.01 }, { x: W / 2 + 160, y: H / 2, z: 1.08, r: -0.01 }], 0.6));
  c.fillStyle = grey(0.18); c.fillRect(140, 800, 1640, 30); c.fillStyle = grey(0.08); c.fillRect(140, 830, 1640, 18);
  c.fillStyle = grey(0.05); c.fillRect(140, 230, 20, 600); c.fillRect(1760, 230, 20, 600);
  let x = 200;
  ws.forEach((w, i) => {
    const small = /^(on|a|that|it's|it’s|in)$/i.test(clean(w.w));
    const fam = A(small ? 62 : 87, 900), size = small ? 46 : 74;
    const bw = size * 1.45, len = measure(U(w), fam, size) + 70, bh = Math.max(small ? 240 : 330, Math.min(540, len));
    const k = on(w, t, 0.25, ease.outBack);
    if (k > 0) {
      const y = 800 - bh - (1 - k) * 500;
      const shade = 0.12 + 0.12 * hash(i, 5), hk = heat(w, t);
      c.fillStyle = hmix('#2A2B2E', '#7A1022', hk * 0.6); c.fillRect(x, y, bw, bh);
      c.fillStyle = grey(shade + 0.25); c.fillRect(x, y + 20, bw, 6); c.fillRect(x, y + bh - 30, bw, 6);
      c.save(); c.translate(x + bw / 2, y + bh / 2); c.rotate(-Math.PI / 2);
      setFont(c, fam, size); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = hmix('#E8E5DE', RED, hk); c.fillText(U(w), 0, 4);
      if (hk > 0.05) { s.g.save(); s.g.setTransform(c.getTransform()); setFont(s.g, fam, size); s.g.textAlign = 'center'; s.g.textBaseline = 'middle'; s.g.fillStyle = hx(RED, 0.4 * hk); s.g.fillText(U(w), 0, 4); s.g.restore(); }
      c.restore();
    }
    x += bw + 14;
  });
  label(c, 'REFERENCE · DO NOT REMOVE', F.mono(600), 22, 960, 880, grey(0.5));
}

// WE SEARCHED EVERY ROOM, THERE ISN'T A SHELF — a floor plan; a flashlight visits a room per word and each one is stamped EMPTY.
function rooms(s: S) {
  const { t, c } = s;
  const l = ln(s), ro = fw(l, /room/i), sh_ = lastW(l), th = fw(l, /there/i);
  backdrop(s, 0.03, 0.04);
  cam(s, { x: W / 2, y: H / 2, z: snapV(t, [0, th.start - 0.1], [1.02, 0.96], 0.45), r: -0.02 });
  const R = [[360, 280, 420, 260], [800, 280, 360, 260], [1180, 280, 380, 260], [360, 560, 300, 280], [680, 560, 500, 280], [1200, 560, 360, 280]];
  c.strokeStyle = hx('#9FC8D8', 0.7); c.lineWidth = 6;
  for (const [x, y, w, h] of R) c.strokeRect(x!, y!, w!, h!);
  setFont(c, F.mono(500), 18); c.fillStyle = hx('#9FC8D8', 0.6); c.textAlign = 'left';
  R.forEach(([x, y], i) => c.fillText(['STUDY', 'LIBRARY?', 'ARCHIVE', 'HALL', 'LAYER 40', 'BACK ROOM'][i]!, x! + 14, y! + 30));
  const ws = l.words.slice(0, th.index);
  ws.forEach((w, i) => {
    const [x, y, wd, h] = R[i % R.length]!;
    const k = on(w, t, 0.2);
    if (k <= 0) return;
    const live = pulseAt(t, w.start, 0.35);
    pool(c, x! + wd! / 2, y! + h! / 2, 200, '#FFF4DC', 0.25 * live);
    stamp(s, 'EMPTY', x! + wd! / 2, y! + h! / 2 + 20, w.start + 0.12, 34, -0.1 + 0.05 * i);
  });
  lyric(s, l.words.slice(0, ro.index + 1), 210, { width: 1200, max: 90 });
  lyric(s, l.words.slice(th.index), 920, { width: 1200, max: 100, x: W / 2 });
  void sh_;
}

// EVERY ANSWER IT GIVES, IT REBUILDS BY ITSELF — ANSWER is a cloud of points; on REBUILDS it blows apart and re-forms as ITSELF.
function rebuild(s: S) {
  const { t, c } = s;
  const l = ln(s), an = fw(l, /answer/i), re = fw(l, /rebuilds/i), it = lastW(l);
  backdrop(s, 0.02, 0.03);
  cam(s, { x: W / 2, y: H / 2, z: snapV(t, [0, re.start - 0.1], [1.0, 1.06], 0.4), r: 0 });
  const fam = A(125, 900);
  const PA = textCloud('ANSWER', fam, 300, 7, 3), PB = textCloud('ITSELF', fam, 300, 7, 4);
  const n = Math.max(PA.length, PB.length);
  const appearA = on(an, t, 0.35);
  const blow = prog(t, re.start - 0.05, re.start + 0.45, ease.outCubic), form = prog(t, re.start + 0.3, it.start + 0.25, ease.inOutCubic);
  for (let i = 0; i < n; i++) {
    const a = PA[i % PA.length]!, b = PB[i % PB.length]!;
    const ang = hash(i, 2) * TAU, rad = 300 + 600 * hash(i, 3);
    let x = a.x, y = a.y;
    x = lerp(x, a.x + Math.cos(ang) * rad, blow); y = lerp(y, a.y + Math.sin(ang) * rad * 0.6, blow);
    x = lerp(x, b.x, form); y = lerp(y, b.y, form);
    if (appearA <= 0) continue;
    const sx = W / 2 + x, sy = 560 + y + (1 - appearA) * (hash(i, 9) - 0.5) * 400;
    const hot = form > 0.9 ? heat(it, t) : heat(an, t);
    c.fillStyle = hot > 0.1 && hash(i, 4) > 0.4 ? hx(RED, 0.95) : grey(0.85, 0.8 * appearA);
    c.fillRect(sx - 2, sy - 2, 4, 4);
    if (hot > 0.1 && (i & 3) === 0) { s.g.fillStyle = hx(RED, 0.4 * hot); s.g.fillRect(sx - 4, sy - 4, 8, 8); }
  }
  lyric(s, l.words.slice(0, an.index), 230, { width: 400, max: 90, x: 560 });
  lyric(s, l.words.slice(an.index + 1, re.index), 230, { width: 500, max: 90, x: 1300 });
  lyric(s, l.words.slice(re.index, it.index), 880, { width: 900, max: 100 });
}

// SMEARED THROUGH THE LAYERS LIKE SALT IN THE SEA — the line is smeared sideways through horizontal layers; SALT, a cloud of grains,
// sinks and dissolves into the dark water under SEA.
function salt(s: S) {
  const { t, c } = s;
  const l = ln(s), sa = fw(l, /salt/i), se = lastW(l), la = fw(l, /layers/i);
  backdrop(s, 0.02, 0.03);
  cam(s, snapCam(t, [0, sa.start - 0.1], [{ x: W / 2, y: H / 2 - 30, z: 1.02, r: 0 }, { x: W / 2, y: H / 2 + 50, z: 1.04, r: 0 }], 0.45));
  // layers: translucent bands
  for (let i = 0; i < 6; i++) { c.fillStyle = grey(0.12 + 0.02 * i, 0.4); c.fillRect(0, 200 + i * 52, W, 26); }
  // smeared words (motion-smear copies)
  const top = l.words.slice(0, la.index + 1);
  for (let k = 5; k >= 1; k--) lyric(s, top, 300, { width: 1200, max: 110, x: W / 2 - k * 26 * (1 - prog(t, la.start, la.start + 0.5)), alpha: 0.12 });
  lyric(s, top, 300, { width: 1200, max: 110 });
  lyric(s, l.words.slice(la.index + 1, sa.index), 520, { width: 300, max: 70, x: 520 });
  // the sea
  const sy = 700;
  const gr = c.createLinearGradient(0, sy, 0, H); gr.addColorStop(0, hx('#0E2A33', 0.9)); gr.addColorStop(1, hx('#030809', 1)); c.fillStyle = gr; c.fillRect(-100, sy, W + 200, H);
  c.strokeStyle = hx(TEAL, 0.5); c.lineWidth = 2; c.beginPath(); for (let x = 0; x <= W; x += 20) c.lineTo(x, sy + 4 * Math.sin(x * 0.02 + t * 2)); c.stroke();
  // SALT as grains: appear, then sink and spread below the surface
  const P = textCloud('SALT', A(125, 900), 220, 6, 8);
  const k0 = on(sa, t, 0.2), sink = prog(t, sa.start + 0.3, sa.start + 2.4, ease.inOutQuad);
  if (k0 > 0) for (let i = 0; i < P.length; i++) {
    const p = P[i]!;
    const x = 980 + p.x + (hash(i, 1) - 0.5) * 500 * sink + 30 * Math.sin(t * 2 + i) * sink;
    const y = 560 + p.y + sink * (300 + 260 * hash(i, 2));
    const under = y > sy;
    c.fillStyle = under ? hx('#BFEFF2', (1 - sink) * 0.8) : grey(0.92, k0);
    c.fillRect(x - 2, y - 2, 3.5, 3.5);
  }
  sw(s, se, 'SEA', A(125, 900), 180, 1480, 860, { from: 1.4, color: heat(se, t) > 0.05 ? undefined : hx(TEAL, 0.8) });
  lyric(s, l.words.slice(sa.index + 1, se.index), 730, { width: 220, max: 56, x: 1480 });
}

// NOTHING IS STORED, IT JUST LEARNED HOW TO BE — the vault door swings open on STORED: nothing inside; BE glows in the empty vault.
function vault(s: S) {
  const { t, c, g } = s;
  const l = ln(s), st = fw(l, /stored/i), be = lastW(l), no = l.words[0]!;
  backdrop(s, 0.05, 0.04);
  cam(s, snapCam(t, [0, st.start - 0.1, be.start - 0.2], [{ x: W / 2, y: H / 2, z: 1, r: 0 }, { x: W / 2 + 80, y: H / 2, z: 1.08, r: 0 }, { x: W / 2 + 60, y: H / 2 + 10, z: 1.12, r: 0 }], 0.5));
  const cx = 1080, cy = 560, R = 300;
  // the empty interior
  c.fillStyle = grey(0.015); c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.fill();
  c.strokeStyle = grey(0.1); c.lineWidth = 2; for (let k = 1; k < 5; k++) { c.beginPath(); c.moveTo(cx - R, cy - R + k * 120); c.lineTo(cx + R, cy - R + k * 120); c.stroke(); }
  neon(s, 'be', cx + 10, cy + 60, { font: 'script', size: 220, color: 'amber', lit: () => ignite(t, be.start - 0.03, 3, 0), glass: 0.3 });
  // the door: swings open about its left hinge
  const op = prog(t, st.start - 0.05, st.start + 0.6, ease.inOutCubic);
  const sx = Math.cos(op * 1.35);
  c.save(); c.translate(cx - R, cy); c.scale(sx, 1);
  c.fillStyle = grey(0.38); c.beginPath(); c.arc(R, 0, R, 0, TAU); c.fill();
  c.strokeStyle = grey(0.55); c.lineWidth = 10; c.beginPath(); c.arc(R, 0, R - 30, 0, TAU); c.stroke();
  for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; c.fillStyle = grey(0.6); c.beginPath(); c.arc(R + Math.cos(a) * (R - 60), Math.sin(a) * (R - 60), 14, 0, TAU); c.fill(); }
  c.translate(R, 0); c.rotate(t * 0.2 + op * 3);
  c.strokeStyle = grey(0.7); c.lineWidth = 14; for (let k = 0; k < 3; k++) { c.rotate(TAU / 3); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -120); c.stroke(); }
  c.restore();
  sw(s, no, 'NOTHING', A(125, 900), 140, 470, 330, { from: 1.4 });
  lyric(s, l.words.slice(1, st.index), 430, { width: 200, max: 60, x: 470 });
  sw(s, st, 'STORED', A(100, 900), 110, 470, 540, { from: 1.4 });
  lyric(s, l.words.slice(st.index + 1, be.index), 830, { width: 1000, max: 84, x: W / 2 });
  void g;
}

// THEN WHERE IS THE MIND, WHERE'S THE ONE WHO DECIDES? — under a swinging bulb over the interrogation table.
function bulbq(s: S) {
  const { t, c, g } = s;
  const l = ln(s), mi = fw(l, /mind/i), de = lastW(l);
  backdrop(s, 0.01, 0.02);
  cam(s, snapCam(t, [0, mi.index + 1 < l.words.length ? l.words[mi.index + 1]!.start - 0.1 : 1e9], [{ x: W / 2 - 80, y: H / 2, z: 1.04, r: 0.01 }, { x: W / 2 + 80, y: H / 2 + 20, z: 1.06, r: -0.01 }], 0.4));
  const th = 0.32 * Math.sin(Math.PI * (s.au.beatAt(t) % 2) - Math.PI / 2) ;
  const bx = W / 2 + Math.sin(th) * 260, by = 140 + Math.cos(th) * 260;
  cone(s, bx, by + 20, -th * 0.7, 0.55, 900, '#FFE9C0', 0.18, 0.3);
  c.fillStyle = grey(0.1); c.beginPath(); c.moveTo(360, 760); c.lineTo(1560, 760); c.lineTo(1720, 940); c.lineTo(200, 940); c.closePath(); c.fill();
  pool(c, bx, 830, 600, '#FFE9C0', 0.2, 0.3);
  c.strokeStyle = grey(0.5); c.lineWidth = 2; c.beginPath(); c.moveTo(W / 2, 0); c.lineTo(bx, by); c.stroke();
  c.fillStyle = '#FFF6E2'; c.beginPath(); c.ellipse(bx, by + 18, 16, 22, 0, 0, TAU); c.fill();
  pool(g, bx, by + 18, 160, AMBER, 0.6);
  lyric(s, l.words.slice(0, mi.index + 1), 360, { width: 1000, max: 120, x: 760 });
  lyric(s, l.words.slice(mi.index + 1, de.index), 560, { width: 900, max: 90, x: 1100 });
  sw(s, de, 'DECIDES?', A(125, 900), 170, W / 2 + 120, 730, { from: 1.5 });
}

// THERE'S NO BACK ROOM WHERE A SOMEONE HIDES — a door at the end of a corridor swings open on BACK ROOM: empty, lit green by EXIT.
function backroom(s: S) {
  const { t, c } = s;
  const l = ln(s), ba = fw(l, /back/i), ro = fw(l, /room/i), hi = lastW(l);
  backdrop(s, 0.02, 0.03);
  cam(s, { x: W / 2, y: H / 2, z: snapV(t, [0, ro.start, hi.start - 0.1], [1, 1.05, 1.1], 0.5), r: 0 });
  // corridor in one-point perspective
  c.fillStyle = grey(0.06); c.beginPath(); c.moveTo(0, 140); c.lineTo(760, 360); c.lineTo(760, 760); c.lineTo(0, 1000); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(W, 140); c.lineTo(1160, 360); c.lineTo(1160, 760); c.lineTo(W, 1000); c.closePath(); c.fill();
  // the room behind the door: empty, green EXIT light
  c.fillStyle = hx('#0B1A10', 1); c.fillRect(800, 400, 320, 360);
  const op = prog(t, ba.start - 0.05, ro.start + 0.25, ease.inOutCubic);
  pool(s.g, 960, 560, 300, '#4CFF7A', 0.25 * op);
  neon(s, 'EXIT', 960, 450, { font: 'tech', size: 56, color: 'green', lit: () => (op > 0.3 ? ignite(t, ro.start, 4, 0.2) : 0), width: 5 });
  c.fillStyle = grey(0.03); c.fillRect(800, 760, 320, 6);
  // door panel hinged left
  c.save(); c.translate(800, 400); c.transform(Math.cos(op * 1.3), -Math.sin(op * 1.3) * 0.15, 0, 1, 0, 0);
  c.fillStyle = grey(0.24); c.fillRect(0, 0, 320, 360); c.strokeStyle = grey(0.4); c.lineWidth = 3; c.strokeRect(20, 20, 280, 320);
  c.fillStyle = grey(0.7); c.beginPath(); c.arc(285, 190, 9, 0, TAU); c.fill();
  c.restore();
  lyric(s, l.words.slice(0, ro.index + 1), 240, { width: 1200, max: 120 });
  lyric(s, l.words.slice(ro.index + 1, hi.index), 840, { width: 600, max: 70, x: 640 });
  sw(s, hi, 'HIDES', A(125, 900), 120, 1340, 840, { from: 1.4 });
}

// ================================================================== PRE-CHORUS 2
// DO NUMBERS THINK? WATCH THEM THINK. DO NUMBERS DREAM? EVERY NIGHT. — call and response: the skeptic's questions typed in serif
// italic on the left, the machine's answers lit as teal tubes on the right, over a brain-shaped cloud that thinks, then dreams.
function callresp(s: S) {
  const { t, c } = s;
  const [q1, a1, q2, a2] = [0, 1, 2, 3].map((i) => ln(s, i)) as [Line, Line, Line, Line];
  backdrop(s, 0.02, 0.03);
  const ts = [0, q1.start, a1.start, q2.start, a2.start].map((x) => x - 0.1);
  cam(s, snapCam(t, ts, [{ x: W / 2, y: H / 2, z: 1, r: 0 }, { x: W / 2 + 40, y: 470, z: 1.03, r: -0.006 }, { x: W / 2 + 40, y: 500, z: 1.03, r: 0.006 }, { x: W / 2 + 40, y: 590, z: 1.03, r: -0.006 }, { x: W / 2 + 40, y: 620, z: 1.03, r: 0.006 }], 0.35));
  // the brain cloud behind, centre
  const dream = prog(t, q2.start, q2.start + 0.6);
  const cm = lookAt(Math.sin(t * 0.5) * 900, -150, -Math.cos(t * 0.5) * 900, 0, 0, 0, 900, 430, 560);
  drawCloud(s, brainCloud(7000, 5), cm, (q, i) => {
    const fire = hash(i, Math.floor(t * 10)) > 0.97 ? 1 : 0;
    const think = t > a1.words[0]!.start ? fire : 0;
    if (dream > 0 && hash(i, 3) > 1 - 0.3 * dream) return ['#BFD6FF', 0.7 * dream * (0.5 + 0.5 * Math.sin(t * 3 + i)), 2.2, 0.3 * dream];
    return think ? [TEAL, 0.95, 3, 0.6] : ['#B8B5AE', 0.18, 2, 0];
  }, { base: 1.1 });
  const ask = (l: Line, y: number) => { const txt = l.words.map((w) => w.w).join(' '); const k = on(l.words[0]!, t, 0.25); if (k <= 0) return; label(c, txt, F.serif(600, true), 70, 820, y, hmix('#E8E5DE', AMBER, Math.max(...l.words.map((w) => heat(w, t))) * 0.6, k), 'left'); };
  ask(q1, 270); ask(q2, 600);
  neonWords(s, a1.words, 820, 440, { font: 'readable', size: 96, color: 'teal', faulty: 0.04, align: 'l' });
  neonWords(s, a2.words, 820, 790, { font: 'script', size: 150, color: 'teal', cased: true, seed: 9, align: 'l' });
}

// CAN NUMBERS LIE? SOMETIMES THEY TRY — a polygraph: three pens trace the vocal on a scrolling chart; LIE? lands big; the answer is
// written along the trace.
function polygraph(s: S) {
  const { t, c, g } = s;
  const q = ln(s, 0), a = ln(s, 1), li = lastW(q);
  backdrop(s, 0.03, 0.05);
  cam(s, snapCam(t, [0, a.start - 0.1], [{ x: W / 2, y: H / 2, z: 1.03, r: 0 }, { x: W / 2 + 30, y: H / 2 + 40, z: 1.06, r: 0 }], 0.4));
  c.fillStyle = grey(0.82); c.fillRect(120, 360, 1680, 420);
  c.strokeStyle = grey(0.62, 0.6); c.lineWidth = 1;
  const speed = 420, head = 1500;
  for (let x = 120 - ((t * speed) % 60); x < 1800; x += 60) { c.beginPath(); c.moveTo(x, 360); c.lineTo(x, 780); c.stroke(); }
  for (let k = 0; k < 3; k++) {
    const base = 450 + k * 120;
    c.strokeStyle = k === 1 ? hx('#B5102C', 0.9) : grey(0.15, 0.9); c.lineWidth = 3; c.beginPath();
    for (let x = 120; x <= head; x += 4) {
      const tx = t - (head - x) / speed;
      const v = s.au.sample(tx).vocal, sp = k === 1 ? 1 : 0.5;
      const y = base - (v * 70 * sp + 10 * Math.sin(tx * (6 + k * 3))) + (k === 1 ? 60 * pulseAt(tx, li.start, 0.15) * Math.sin(tx * 80) : 0);
      x === 120 ? c.moveTo(x, y) : c.lineTo(x, y);
    }
    c.stroke();
    c.fillStyle = grey(0.2); c.fillRect(head, base - 8, 70, 16);
  }
  lyric(s, q.words.slice(0, -1), 250, { width: 800, max: 110, x: 620 });
  sw(s, li, 'LIE?', A(125, 900), 220, 1380, 250, { from: 1.6 });
  lyric(s, a.words, 845, { width: 1200, max: 92, from: 1.4 });
  void g;
}

// CAN NUMBERS MEAN? OH, I THINK THEY MIGHT — the question in serif italic; THEY MIGHT strikes on as a big red sign (holds through the
// turnaround into the chorus).
function mean(s: S) {
  const { t, c } = s;
  const q = ln(s, 0), a = ln(s, 1), th = fw(a, /they/i);
  backdrop(s, 0.02, 0.04);
  cam(s, snapCam(t, [0, a.start - 0.1, th.start - 0.1], [{ x: W / 2, y: 420, z: 1.05, r: 0 }, { x: W / 2, y: 560, z: 1.0, r: 0 }, { x: W / 2, y: 600, z: 1.04, r: 0 }], 0.4));
  const k = on(q.words[0]!, t, 0.25);
  if (k > 0) label(c, q.words.map((w) => w.w).join(' '), F.serif(600, true), 110, W / 2, 320, hmix('#E8E5DE', AMBER, Math.max(...q.words.map((w) => heat(w, t))) * 0.6, k));
  lyric(s, a.words.slice(0, th.index), 520, { width: 700, max: 100 });
  neonWords(s, a.words.slice(th.index), W / 2, 820, { font: 'readable', size: 230, color: 'red', box: { pad: 50, a: 0.85 }, faulty: 0.03 });
  rain(s, 200, 0.12, 0.12, 13);
}

export const B_SHOTS: Record<string, (s: S) => void> = {
  heroNeon, fall, rooftop, windows, adding, blinds: blindsShot, reprise, insomnia,
  drawer, shelf, rooms, rebuild, salt, vault, bulbq, backroom,
  callresp, polygraph, mean,
};
void [measure, noise1, typeOn, neonW, cityCloud];
