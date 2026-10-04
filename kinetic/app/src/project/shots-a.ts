// Intro, verse 1, pre-chorus 1. Every word lands on its sung onset; the camera holds, then snaps.
import { F } from '../engine/type';
import { drawStrokeText, writtenLength } from '../engine/stroke';
import {
  A, H, W, TAU, backdrop, blinds, cam, charTimes, cityCloud, clamp, clean, cone, drawCloud, ease, env, fw, grey, hash, heat, hmix, hx,
  ignite, layersCloud, lerp, lookAt, lyric, man, neon, neonWords, noise1, pool, prog, pulseAt, rain, setFont, smoke, snapCam, snapV, stamp,
  stext, sw, typeOn, typeWords, label, ln, on, gutter, type Line, type S, type Word,
} from './noir';

const TEAL = '#35E3E6', RED = '#FF2B4E', AMBER = '#FFA23A', PINK = '#FF3FB4';

// ================================================================== INTRO
// WE OPENED IT UP / AND?  A case folder under the lamp is flipped open onto a page of weights; the skeptic's "And?" answers
// in pink script neon.
function opened(s: S) {
  const { t, c } = s;
  const l0 = ln(s, 0), l1 = ln(s, 1);
  const op = fw(l0, /opened/i), and = l1.words[0]!;
  backdrop(s, 0.015, 0.035);
  cam(s, snapCam(t, [0, and.start - 0.12], [{ x: W / 2, y: H / 2, z: 1, r: -0.015 }, { x: W / 2 + 160, y: H / 2 + 10, z: 1.1, r: 0.01 }], 0.55));
  pool(c, 760, 600, 820, '#C9C3B4', 0.2);
  const fx = 440, fy = 340, fwd = 640, fh = 520;
  const flip = prog(t, op.start - 0.05, op.start + 0.5, ease.inOutCubic);
  // the page: weights in rows; the machine's teal light leaks out as the folder opens
  c.fillStyle = grey(0.8); c.fillRect(fx, fy, fwd, fh);
  setFont(c, F.mono(500), 22); c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  for (let r = 0; r < 16; r++) for (let q = 0; q < 4; q++) {
    const v = hash(r, q, 11) * 2 - 1, hot = flip > 0 && hash(r, q, Math.floor(t * 8)) > 0.92;
    c.fillStyle = hot ? hx(TEAL, 0.95) : grey(0.22, 0.85);
    c.fillText((v >= 0 ? '+' : '') + v.toFixed(4), fx + 36 + q * 150, fy + 48 + r * 29);
  }
  pool(s.g, fx + fwd / 2, fy + fh / 2, 520, TEAL, 0.32 * flip);
  // the cover, hinged at the left edge
  const cw = fwd * Math.cos(flip * Math.PI), sk = Math.sin(flip * Math.PI) * 46;
  c.fillStyle = flip < 0.5 ? grey(0.46) : grey(0.62);
  c.beginPath(); c.moveTo(fx, fy); c.lineTo(fx + cw, fy - sk); c.lineTo(fx + cw, fy + fh + sk); c.lineTo(fx, fy + fh); c.closePath(); c.fill();
  if (flip < 0.5) { // the label on the front
    c.save(); c.translate(fx, fy); c.transform(cw / fwd, -sk / fwd, 0, 1, 0, 0);
    c.fillStyle = grey(0.85); c.fillRect(70, 70, 330, 90);
    setFont(c, F.mono(700), 30); c.fillStyle = grey(0.1); c.fillText('CASE 0.0417', 92, 128);
    c.restore();
  }
  lyric(s, l0.words, 250, { width: 1000, max: 120, x: fx + fwd / 2, from: 1.6 });
  // AND? in script neon, pink: the skeptic
  neon(s, 'And?', 1420, 690, { font: 'script', size: 300, color: 'pink', lit: () => ignite(t, and.start - 0.03, 3, 0.05), box: { pad: 60, a: 0.6 } });
  label(c, 'she said.', F.serif(400, true), 40, 1430, 780, grey(0.6, on(and, t, 0.5) * 0.9));
}

// TITLE: a point-cloud city at night, flown through in the rain; the blade sign WEIGHTS ignites letter by letter on the beat,
// ALL THE WAY DOWN follows in teal script.
function titleCity(s: S) {
  const { t, c, g, sh } = s;
  backdrop(s, 0.02, 0.06);
  const p = clamp((t - sh.start) / (sh.end - sh.start));
  const cm = { x: 40 * Math.sin(t * 0.3), y: -170, z: lerp(-600, 1400, ease.inOutQuad(p)), yaw: 0.04 * Math.sin(t * 0.21), pitch: -0.12, f: 920 };
  cam(s, { x: W / 2, y: H / 2, z: 1, r: 0 }, 0);
  const P = cityCloud(7, 30, 2600, 5200);
  drawCloud(s, P, cm, (q, i, d) => {
    const fog = clamp(1 - d / 5200);
    if (q.k === 1) { if (hash(i, 8) > 0.45) return ['#C9C6BF', 0.4 * fog, 2.2, 0]; const hot = hash(i, 3) > 0.7; const flick = hash(i, Math.floor(t * 2)) > 0.04 ? 1 : 0.2; return [hot ? TEAL : AMBER, 0.85 * fog * flick, 3.0, 0.25 * fog * flick]; }
    if (q.k === 2) return ['#F2EFE8', 0.85 * fog, 2.6, 0];
    return ['#C9C6BF', 0.5 * fog * (0.55 + 0.45 * q.h), 2.2, 0];
  }, { base: 1.4 });
  // street lamps and their reflections on the wet road
  for (let k = 0; k < 16; k++) for (const sd of [-1, 1]) {
    const z = 200 + k * 320, x = sd * 300;
    const a = 0; void a;
    const lp = { x, y: -190, z };
    const dx = lp.x - cm.x, dy = lp.y - cm.y, dz = lp.z - cm.z; if (dz < 20) continue;
    const kk = cm.f / dz, sx = W / 2 + dx * kk, sy = H / 2 + dy * kk + cm.pitch * cm.f;
    const fog = clamp(1 - dz / 5000);
    const rr = Math.min(70, 26 * kk + 6);
    pool(g, sx, sy, rr, AMBER, 0.35 * fog);
    const hs = Math.min(10, 3 * kk + 1);
    c.fillStyle = hx('#FFE7C0', fog); c.fillRect(sx - hs, sy - hs * 0.6, hs * 2, hs * 1.2);
    const ry = H / 2 + (0 - cm.y) * kk + cm.pitch * cm.f;
    if (ry < H) { c.fillStyle = hx(AMBER, 0.16 * fog); c.fillRect(sx - hs * 0.6, ry, hs * 1.2, Math.min(400, 200 * kk)); }
  }
  rain(s, 380, 0.2, 0.12, 5);
  // the title sign: a vertical blade on the right, ALL THE WAY DOWN below the skyline
  const db = s.au.downbeats.filter((x) => x >= sh.start - 0.01);
  const t0 = db[1] ?? sh.start + 2.3, beat = 60 / s.au.bpm;
  const sc = lerp(0.94, 1.04, p);
  c.save(); g.save();
  for (const x of [c, g]) { x.translate(1480, 210); x.scale(sc, sc); }
  // the raceway
  c.fillStyle = grey(0.05, 0.92); c.strokeStyle = grey(0.25, 0.9); c.lineWidth = 3;
  c.beginPath(); c.roundRect(-82, -30, 164, 700, 16); c.fill(); c.stroke();
  'WEIGHTS'.split('').forEach((ch, i) => {
    neon(s, ch, 0, 74 + i * 96, { font: 'readable', size: 108, color: 'red', lit: () => ignite(t, t0 + i * beat, 11 + i, i === 3 ? 0.35 : 0.04), width: 7.5 });
  });
  c.restore(); g.restore();
  const t1 = t0 + 8 * beat;
  neon(s, 'all the way down', 760, 770, { font: 'script', size: 150, color: 'teal', lit: () => ignite(t, t1, 21, 0.03), box: { pad: 46, a: 0.55 } });
  const t2 = t1 + 4 * beat;
  typeOn(s, 'A NOIR IN NUMBERS', 760 - 190, 860, t2, t2 + 0.9, 30, '#9EA2A8', 'left', 1);
}

// ================================================================== VERSE 1
// I TOOK IT APART ON A TUESDAY NIGHT: the line is typed onto the case sheet; on "apart" the sheet tears in two; TUESDAY is
// stamped.
function casefile(s: S) {
  const { t, c } = s;
  const l = ln(s), ap = fw(l, /apart/i), tue = fw(l, /tuesday/i), nig = fw(l, /night/i);
  backdrop(s, 0.02, 0.03);
  const r1 = l.words.slice(0, ap.index + 1), r2 = l.words.slice(ap.index + 1);
  cam(s, snapCam(t, [0, r2[0]!.start - 0.1], [{ x: W / 2 - 60, y: H / 2 - 30, z: 1.06, r: -0.025 }, { x: W / 2 + 40, y: H / 2 + 50, z: 1.06, r: -0.01 }], 0.5));
  const tear = prog(t, ap.start + 0.05, ap.start + 0.45, ease.outExpo);
  const lampDim = 1 - 0.35 * prog(t, nig.start, nig.start + 0.4);
  pool(c, W / 2, H / 2, 1000, '#D8D2C2', 0.18 * lampDim);
  const sheet = (half: number) => {
    c.save();
    const dx = half * 70 * tear, rot = half * 0.05 * tear;
    c.translate(W / 2 + dx, H / 2); c.rotate(rot); c.translate(-W / 2, -H / 2);
    // clip to this half along a jagged tear line
    c.beginPath();
    const xs = W / 2 + 40;
    c.moveTo(half < 0 ? 0 : W, 0); c.lineTo(xs, 0);
    for (let y = 0; y <= H; y += 24) c.lineTo(xs + (hash(y, 5) - 0.5) * 26, y);
    c.lineTo(half < 0 ? 0 : W, H); c.closePath(); c.clip();
    c.fillStyle = grey(0.86 * lampDim); c.fillRect(300, 210, 1320, 700);
    c.strokeStyle = grey(0.55, 0.6); c.lineWidth = 2; c.strokeRect(330, 240, 1260, 640);
    setFont(c, F.mono(600), 24); c.fillStyle = grey(0.25); c.textAlign = 'left';
    c.fillText('POLICE DEPT · CASE FILE', 360, 285); c.fillText('No. 0.0417', 1400, 285);
    c.fillRect(360, 300, 1200, 2);
    setFont(c, F.mono(500), 22); c.fillStyle = grey(0.35);
    c.fillText('SUBJECT: LANGUAGE MODEL, 80 LAYERS', 360, 340); c.fillText('EXAMINER: THE ANALYST', 360, 372);
    typeWords(s, r1, 360, 520, 84, '#121212', { hot: '#121212' });
    typeWords(s, r2, 360, 660, 84, '#121212', { hot: '#121212' });
    c.restore();
  };
  sheet(-1); sheet(1);
  deskCalendar(s, 1640, 760, l.words.slice(Math.max(0, tue.index - 3), tue.index), tue);
  // the lamp goes night-blue on "night"
  pool(s.g, 1500, 300, 700, TEAL, 0.14 * prog(t, nig.start, nig.start + 0.4));
}

/** A tear-off desk calendar on the case sheet: a page tears off on each word before TUESDAY (FRI → SAT → SUN → MON) and lands
 *  on TUE 14 NOV 1950 as the word is sung, the date going neon red. */
function deskCalendar(s: S, x: number, y: number, before: Word[], tue: Word) {
  const { t, c, g } = s;
  const pages = [['FRI', 10], ['SAT', 11], ['SUN', 12], ['MON', 13], ['TUE', 14]] as const;
  const flips = [...before, tue].slice(-4);
  const offs = 4 - flips.length;
  let idx = offs;
  for (const w of flips) if (t >= w.start - 0.03) idx++;
  const w0 = 300, h0 = 340;
  c.save(); c.translate(x, y); c.rotate(0.06); c.scale(0.78, 0.78);
  const pageAt = (k: number, a = 1) => {
    const [dn, dd] = pages[Math.min(k, 4)]!;
    const isTue = k >= 4, hk = isTue ? heat(tue, t) : 0;
    c.globalAlpha = a;
    c.fillStyle = grey(0.9); c.fillRect(-w0 / 2, -h0 / 2, w0, h0);
    c.fillStyle = isTue ? hmix('#5A0A18', RED, 0.6 + 0.4 * hk) : grey(0.18); c.fillRect(-w0 / 2, -h0 / 2, w0, 70);
    setFont(c, F.mono(700), 30); c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillStyle = grey(0.92); c.fillText('NOVEMBER 1950', 0, -h0 / 2 + 46);
    setFont(c, A(62, 900), 190); c.fillStyle = isTue ? hmix('#141414', RED, 0.55 + 0.45 * hk) : grey(0.12); c.fillText(String(dd), 0, 70);
    setFont(c, A(125, 900), 46); c.fillStyle = isTue ? hmix('#141414', RED, 0.4 + 0.6 * hk) : grey(0.25); c.fillText(isTue ? 'TUESDAY' : dn, 0, 140);
    c.globalAlpha = 1;
  };
  // spiral binding + the stack beneath
  c.fillStyle = grey(0.55); c.fillRect(-w0 / 2 + 6, -h0 / 2 + 8, w0, h0);
  pageAt(idx);
  // the page that just tore off flies away
  const last = flips[idx - offs - 1];
  if (last) {
    const f = prog(t, last.start - 0.03, last.start + 0.45, ease.inQuad);
    if (f < 1) { c.save(); c.translate(-w0 / 2 + 40 + f * 260, -h0 / 2 + f * -320); c.rotate(-0.9 * f); c.translate(w0 / 2 - 40, h0 / 2); pageAt(idx - 1, 1 - f * 0.6); c.restore(); }
  }
  for (let i = 0; i < 9; i++) { c.fillStyle = grey(0.25); c.beginPath(); c.arc(-w0 / 2 + 30 + i * 30, -h0 / 2, 7, 0, TAU); c.fill(); }
  c.restore();
  if (t >= tue.start - 0.03) { const hk = heat(tue, t); pool(g, x, y + 40, 180, RED, 0.25 * (0.3 + hk)); }
  if (t > tue.start - 0.03 && t < tue.start + 0.15) s.post.shake = [0, 6 * (1 - prog(t, tue.start, tue.start + 0.15))];
}

// LAYER BY LAYER UNDER FLUORESCENT LIGHT: slabs drop and stack, one per LAYER; the fluorescent tubes overhead stutter on, and
// LIGHT is a cold-white tube.
function fluoro(s: S) {
  const { t, c, g } = s;
  const l = ln(s), L1 = l.words[0]!, by = l.words[1]!, L2 = l.words[2]!, fl = fw(l, /fluorescent/i), li = fw(l, /light/i);
  backdrop(s, 0.02, 0.05);
  cam(s, snapCam(t, [0, L2.start - 0.1, fl.start - 0.1], [{ x: W / 2, y: 600, z: 1.05, r: 0 }, { x: W / 2, y: 540, z: 1.0, r: 0.01 }, { x: W / 2, y: 520, z: 0.96, r: 0 }], 0.5));
  // tubes: two fixtures, each two tubes; a fluorescent strike is a stutter of blinks then steady
  const strike = (seed: number) => { if (t < fl.start - 0.05) return 0; const u = t - fl.start + 0.05; if (u > 0.7) return 0.96 + 0.04 * Math.sin(t * 240); return hash(Math.floor(u * 22), seed) > 0.5 ? 1 : 0.06; };
  for (const [x0, seed] of [[360, 1], [1000, 2]] as const) {
    const k = strike(seed);
    c.fillStyle = grey(0.12); c.fillRect(x0 - 20, 186, 600, 34);
    for (const dy of [0, 16]) {
      c.strokeStyle = hmix('#5A5D63', '#F2FFFF', k); c.lineWidth = 9; c.lineCap = 'round';
      c.beginPath(); c.moveTo(x0, 196 + dy); c.lineTo(x0 + 560, 196 + dy); c.stroke();
      g.strokeStyle = hx('#BFFFFF', 0.4 * k); g.lineWidth = 34; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, 196 + dy); g.lineTo(x0 + 560, 196 + dy); g.stroke();
    }
  }
  const lit = Math.max(strike(1), strike(2));
  // cold light falling onto the stack
  cone(s, W / 2, 210, 0, 0.62, 760, '#CFFFFF', 0.1 * lit, 0.2);
  // slabs
  const slab = (w: Word, y: number, wid: number) => {
    const k = on(w, t, 0.32, ease.outExpo); if (k <= 0) return;
    const yy = y - (1 - k) * 380;
    const front = grey(lerp(0.16, 0.5, lit)), top = grey(lerp(0.24, 0.72, lit)), side = grey(lerp(0.08, 0.3, lit));
    c.fillStyle = top; c.beginPath(); c.moveTo(W / 2 - wid / 2, yy); c.lineTo(W / 2 + wid / 2, yy); c.lineTo(W / 2 + wid / 2 + 70, yy - 46); c.lineTo(W / 2 - wid / 2 + 70, yy - 46); c.closePath(); c.fill();
    c.fillStyle = side; c.beginPath(); c.moveTo(W / 2 + wid / 2, yy); c.lineTo(W / 2 + wid / 2 + 70, yy - 46); c.lineTo(W / 2 + wid / 2 + 70, yy + 110); c.lineTo(W / 2 + wid / 2, yy + 156); c.closePath(); c.fill();
    c.fillStyle = front; c.fillRect(W / 2 - wid / 2, yy, wid, 156);
    sw(s, w, 'LAYER', A(125, 900), 150, W / 2, yy + 80, { color: heat(w, t) > 0.05 ? hmix('#0A0A0A', RED, heat(w, t)) : grey(0.06), from: 1.25 });
    if (k < 1 && k > 0.85) s.post.shake = [0, 8 * (1 - k)];
  };
  slab(L1, 620, 900);
  slab(L2, 420, 820);
  sw(s, by, 'BY', A(62, 300), 70, W / 2 + 560, 530, { from: 1.2 });
  lyric(s, l.words.slice(3, li.index), 860, { width: 900, max: 64, x: W / 2 - 160 });
  // LIGHT: a cold-white tube in technical lettering
  neon(s, 'LIGHT', W / 2 + 470, 888, { font: 'tech', size: 120, color: 'white', lit: () => ignite(t, li.start - 0.03, 7, 0), width: 8 });
}

// WENT LOOKING FOR GHOSTS, WENT LOOKING FOR GEARS: a dark room searched with a flashlight; the words (and a ghost, and gears) only
// exist inside the beam, which snaps from word to word.
function flashlight(s: S) {
  const { t, c } = s;
  const l = ln(s), gh = fw(l, /ghosts/i), ge = fw(l, /gears/i);
  const h1 = l.words.slice(0, gh.index), h2 = l.words.slice(gh.index + 1, ge.index);
  backdrop(s, 0.05, 0.08);
  cam(s, { x: W / 2, y: H / 2, z: 1, r: 0 });
  // the room: floorboards and a wall
  c.strokeStyle = grey(0.16); c.lineWidth = 2;
  for (let x = -200; x < W + 400; x += 140) { c.beginPath(); c.moveTo(W / 2 + (x - W / 2) * 0.3, 700); c.lineTo(x, H); c.stroke(); }
  c.fillStyle = grey(0.1); c.fillRect(0, 690, W, 10);
  // the ghost (a sheet) and the gears
  const gk = on(gh, t, 0.4);
  if (gk > 0) {
    c.save(); c.translate(640, 520); c.globalAlpha = 0.7 * gk;
    c.fillStyle = grey(0.85); c.beginPath(); c.moveTo(-90, 160); c.lineTo(-80, -40); c.quadraticCurveTo(0, -170, 80, -40); c.lineTo(90, 160);
    for (let i = 0; i < 6; i++) c.quadraticCurveTo(90 - i * 30 - 15, 130 + (i % 2) * 40, 90 - (i + 1) * 30, 160);
    c.closePath(); c.fill();
    c.fillStyle = grey(0.05); c.beginPath(); c.ellipse(-28, -40, 12, 18, 0, 0, TAU); c.ellipse(28, -40, 12, 18, 0, 0, TAU); c.fill();
    c.restore();
  }
  const gek = on(ge, t, 0.4);
  if (gek > 0) for (const [gx, gy, r, n, dir] of [[1340, 470, 120, 12, 1], [1530, 600, 80, 9, -1]] as const) {
    c.save(); c.translate(gx, gy); c.rotate(dir * (t - ge.start) * 1.5 * (12 / n)); c.globalAlpha = gek;
    c.strokeStyle = grey(0.8); c.lineWidth = 8; c.beginPath();
    for (let i = 0; i <= n * 4; i++) { const a = (i / (n * 4)) * TAU, rr = i % 4 < 2 ? r : r * 0.82; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    c.closePath(); c.stroke(); c.beginPath(); c.arc(0, 0, r * 0.25, 0, TAU); c.stroke(); c.restore();
  }
  lyric(s, h1, 300, { width: 700, max: 80, x: 640 });
  sw(s, gh, 'GHOSTS', A(125, 900), 140, 600, 820, { from: 1.4 });
  lyric(s, h2, 300, { width: 700, max: 80, x: 1400 });
  sw(s, ge, 'GEARS', A(125, 900), 140, 1420, 820, { from: 1.4 });
  // darkness with a soft beam hole that snaps to the word being sung
  const targets = [[620, 330], [620, 680], [1400, 330], [1420, 650]];
  const bx = snapV(t, [0, gh.start - 0.15, h2[0]!.start - 0.1, ge.start - 0.15], targets.map((p) => p[0]!), 0.35);
  const by = snapV(t, [0, gh.start - 0.15, h2[0]!.start - 0.1, ge.start - 0.15], targets.map((p) => p[1]!), 0.35);
  const R = 360 + 20 * noise1(t * 3, 4);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  const gr = c.createRadialGradient(bx, by, 0, bx, by, R);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.62, 'rgba(0,0,0,0.05)'); gr.addColorStop(1, 'rgba(0,0,0,0.9)');
  c.fillStyle = gr; c.fillRect(0, 0, W, H);
  c.restore();
  pool(s.g, bx, by, R, '#FFF3D8', 0.08);
  // the beam itself, from the hand off-frame
  cone(s, 1800, 1080, Math.atan2(-(bx - 1800), -(by - 1080)) + Math.PI, 0.16, Math.hypot(bx - 1800, by - 1080), '#FFF6E0', 0.05, 0.1);
}

// FOUND ONLY NUMBERS, STACKED EIGHTY TIERS: a point cloud of one layer of weights; on "stacked" the layers pile up to 80 while
// the camera cranes up and a forward pass climbs the stack. (Holds through the bars after the line.)
function tiers(s: S) {
  const { t, c, sh } = s;
  const l = ln(s), st = fw(l, /stacked/i), ei = fw(l, /eighty/i), ti = fw(l, /tiers/i);
  backdrop(s, 0.015, 0.04);
  cam(s, { x: W / 2, y: H / 2, z: 1, r: 0 }, 0);
  const N = Math.round(1 + 79 * prog(t, st.start - 0.05, ti.start + 0.25, ease.inOutCubic));
  const P = layersCloud(80, 22, 14, 15, 3);
  const crane = prog(t, st.start - 0.1, sh.end, ease.inOutQuad);
  const rise = prog(t, st.start - 0.1, ti.start + 0.6, ease.inOutCubic);
  const ang = 0.6 + 0.9 * crane + 0.05 * Math.sin(t * 0.7);
  const dist = lerp(560, 1350, rise) + 150 * crane;
  const ty = lerp(0, -600, rise), cy0 = lerp(-420, -900, rise) - 200 * crane;
  const cm = lookAt(Math.sin(ang) * dist, cy0, -Math.cos(ang) * dist, 0, ty, 0, 1000, W / 2, H / 2 + 40);
  const wave = (j: number) => { const ph = (t - st.start) * 34; return Math.exp(-(((j - (ph % 110)) ** 2) / 18)); };
  drawCloud(s, P, cm, (q, i) => {
    if (q.k >= N) return null;
    const w = t > st.start ? wave(q.k) : 0;
    const pop = q.k === N - 1 ? 1 : 0;
    const v = hash(i, 9);
    if (w > 0.3 && v > 0.55) return [RED, 0.9 * w, 3, 0.6 * w];
    return [pop ? '#FFFFFF' : '#D9D6CF', 0.42 + 0.3 * v + 0.3 * pop, 2.4, 0];
  }, { base: 1.6 });
  // first layer: numbers you can read
  if (t < st.start + 0.3) {
    const a = 1 - prog(t, st.start - 0.1, st.start + 0.3);
    setFont(c, F.mono(500), 20); c.textAlign = 'center';
    for (let r = 0; r < 5; r++) for (let q = 0; q < 9; q++) { const v = hash(r, q, 2) * 2 - 1; c.fillStyle = grey(0.55, 0.6 * a); c.fillText((v >= 0 ? '+' : '') + v.toFixed(3), 360 + q * 150, 640 + r * 46); }
  }
  lyric(s, l.words.slice(0, st.index), 250, { width: 1300, max: 120 });
  sw(s, st, 'STACKED', A(125, 900), 110, 420, 820, { from: 1.4 });
  // the tier counter
  const cnt = String(Math.max(1, N)).padStart(2, '0');
  if (t > ei.start - 0.1) {
    label(c, cnt, F.mono(700), 150, 1460, 640, hmix('#E8E5DE', RED, heat(ei, t) + heat(ti, t)));
    label(s.g, cnt, F.mono(700), 150, 1460, 640, hx(RED, 0.4 * (heat(ei, t) + heat(ti, t))));
  }
  sw(s, ei, 'EIGHTY', A(62, 900), 80, 1460, 500, { from: 1.3 });
  sw(s, ti, 'TIERS', A(125, 900), 110, 1460, 800, { from: 1.6 });
}

// INSTRUMENTAL — the office: a window with blinds, the HOTEL sign buzzing outside, the detective at the glass, smoke curling
// from the cigarette, a ceiling fan's shadow on the wall; the case sheet types itself on the downbeats.
function office(s: S) {
  const { t, c, g, sh } = s;
  backdrop(s, 0.06, 0.03);
  const db = s.au.downbeats.filter((x) => x >= sh.start - 0.01 && x < sh.end);
  const push = lerp(1, 1.08, prog(t, sh.start, sh.end));
  cam(s, snapCam(t, [sh.start, db[2] ?? sh.end], [{ x: W / 2, y: H / 2, z: push, r: 0 }, { x: W / 2 - 120, y: H / 2 - 20, z: push * 1.12, r: -0.01 }], 0.6), 0.02);
  // the window (left): night, rain, the HOTEL sign
  const wx = 220, wy = 200, ww = 620, wh = 620;
  c.fillStyle = grey(0.03); c.fillRect(wx, wy, ww, wh);
  c.save(); c.beginPath(); c.rect(wx, wy, ww, wh); c.clip();
  for (let i = 0; i < 6; i++) { const bx = wx + 40 + i * 110, bh = 200 + hash(i, 1) * 300; c.fillStyle = grey(0.07); c.fillRect(bx, wy + wh - bh, 90, bh); }
  const fl = ignite(t, sh.start + 0.4, 5, 0.45);
  'HOTEL'.split('').forEach((ch, i) => neon(s, ch, wx + 470, wy + 120 + i * 92, { font: 'readable', size: 96, color: 'red', lit: () => (i === 2 ? fl * (hash(Math.floor(t * 6)) > 0.3 ? 1 : 0.1) : fl), width: 7, standoffs: false }));
  for (let i = 0; i < 60; i++) { const x = wx + hash(i, 4) * ww, y = wy + ((hash(i, 5) * wh + t * (40 + 60 * hash(i, 6))) % wh); c.fillStyle = grey(0.7, 0.35); c.beginPath(); c.ellipse(x, y, 3, 5, 0, 0, TAU); c.fill(); }
  c.restore();
  // window frame + blinds slats (half open)
  c.strokeStyle = grey(0.2); c.lineWidth = 14; c.strokeRect(wx, wy, ww, wh); c.beginPath(); c.moveTo(wx + ww / 2, wy); c.lineTo(wx + ww / 2, wy + wh); c.stroke();
  for (let y = wy + 10; y < wy + wh; y += 28) { c.fillStyle = grey(0.12, 0.85); c.fillRect(wx, y, ww, 9); }
  // the slatted red-teal light thrown across the back wall
  const pulse = 0.8 + 0.2 * Math.sin(t * 1.3);
  blinds(s, 980, 220, 700, 560, -0.35, 16, 0.42, RED, 0.16 * fl * pulse);
  blinds(s, 1040, 230, 640, 540, -0.35, 16, 0.3, TEAL, 0.06);
  // ceiling-fan shadow sweeping the wall
  c.save(); c.translate(1340, 420); c.rotate(t * 2.6);
  c.fillStyle = 'rgba(0,0,0,0.35)';
  for (let k = 0; k < 3; k++) { c.rotate(TAU / 3); c.beginPath(); c.ellipse(240, 0, 230, 34, 0, 0, TAU); c.fill(); }
  c.restore();
  // the detective at the window (rim-lit)
  man(c, 1000, 900, 560, grey(0.015), -1);
  c.save(); c.globalCompositeOperation = 'lighter'; c.translate(-3, 0); man(c, 1000, 900, 560, hx(RED, 0.12 * fl), -1); c.restore();
  // the ember and the smoke
  const ex = 900, ey = 470;
  pool(g, ex, ey, 26, RED, 0.8 + 0.2 * Math.sin(t * 2));
  smoke(s, ex, ey, t, 0.12, 2, 360);
  // desk + lamp + the case sheet typing itself on the downbeats
  c.fillStyle = grey(0.02); c.fillRect(0, 880, W, 200);
  cone(s, 1650, 640, 0, 0.5, 300, AMBER, 0.18, 0.4);
  c.fillStyle = grey(0.1); c.beginPath(); c.moveTo(1600, 640); c.lineTo(1700, 640); c.lineTo(1680, 610); c.lineTo(1620, 610); c.closePath(); c.fill();
  const lines = ['CASE 0.0417', 'STATUS: UNSOLVED', 'SUSPECT: ?'];
  lines.forEach((tx, i) => { const t0 = db[i] ?? sh.end; typeOn(s, tx, 1480, 820 + i * 34, t0, t0 + 0.7, 26, '#E8C890', 'left'); });
  rain(s, 120, 0.05, 0.1, 9);
  void env;
}

// THEN WHO WROTE THE LETTER THAT MADE MY MOTHER CRY? — a letter handwritten in sync, then the line set below; a tear falls on
// CRY and the ink blooms.
function letter(s: S) {
  const { t, c } = s;
  const l = ln(s), who = fw(l, /^who$/i), le = fw(l, /letter/i), th = fw(l, /^that$/i), cry = fw(l, /cry/i);
  backdrop(s, 0.03, 0.05);
  pool(c, W / 2, H / 2, 1000, '#D6D0C0', 0.2);
  c.fillStyle = grey(0.84); c.fillRect(220, 180, 1480, 740);
  c.strokeStyle = grey(0.7, 0.6); c.lineWidth = 1.5;
  for (let y = 320; y < 900; y += 70) { c.beginPath(); c.moveTo(260, y); c.lineTo(1660, y); c.stroke(); }
  const ws = l.words.slice(who.index, le.index + 1), text = ws.map((w) => clean(w.w).toLowerCase()).join(' ');
  const st = stext(text, 'script', 150);
  const len = writtenLength(st, charTimes(text, ws), t);
  const x0 = 300, y0 = 450;
  c.save(); c.translate(x0, y0); c.strokeStyle = hx('#141414', 0.95); c.lineWidth = 4.2; c.lineCap = 'round'; c.lineJoin = 'round';
  const head = drawStrokeText(c, st, len);
  c.restore();
  if (head && len < st.total - 1) { c.fillStyle = grey(0.1); c.beginPath(); c.moveTo(x0 + head.x, y0 + head.y); c.lineTo(x0 + head.x + 40, y0 + head.y - 90); c.lineTo(x0 + head.x + 56, y0 + head.y - 80); c.closePath(); c.fill(); }
  label(c, 'Then', F.serif(400, true), 56, 300, 300, hx('#141414', on(l.words[0]!, t, 0.3)), 'left');
  const hx0 = head ? x0 + head.x : x0 + st.width;
  cam(s, { x: clamp(lerp(W / 2, hx0, 0.35), W / 2 - 120, W / 2 + 160), y: snapV(t, [0, th.start - 0.1], [H / 2 - 20, H / 2 + 60], 0.45), z: snapV(t, [0, th.start - 0.1, cry.start - 0.08], [1.08, 1.0, 1.06], 0.4), r: -0.015 });
  // the rest of the line, in ink type
  const rest = l.words.slice(th.index, cry.index);
  lyric(s, rest, 700, { width: 700, max: 84, x: 780, base: 'ink', hot: 'signal', glow: 0 });
  sw(s, cry, 'CRY?', A(125, 900), 150, 1440, 700, { color: hmix('#141414', RED, Math.max(heat(cry, t), 0.0)), from: 1.6, glow: 0.5 });
  // the tear and the ink bloom
  const fall = prog(t, cry.start - 0.05, cry.start + 0.35, ease.inQuad);
  if (fall > 0 && fall < 1) { const y = lerp(140, 620, fall); c.fillStyle = hx('#DDEBFF', 0.85); c.beginPath(); c.ellipse(1300, y, 12, 18, 0, 0, TAU); c.fill(); }
  const bl = prog(t, cry.start + 0.35, cry.start + 1.6, ease.outCubic);
  if (bl > 0) { c.fillStyle = hx('#1B2433', 0.28 * (1 - bl * 0.4)); c.beginPath(); for (let i = 0; i <= 40; i++) { const a = (i / 40) * TAU, r = 120 * bl * (0.8 + 0.3 * hash(i, 3)); c.lineTo(1300 + Math.cos(a) * r, 620 + Math.sin(a) * r); } c.fill(); }
}

// WHO LEARNED TO SAY SORRY, WHO LEARNED TO ASK WHY? — two neon signs behind a rainy window: SORRY in pink script, WHY? in red.
function sorry(s: S) {
  const { t, c } = s;
  const l = ln(s), so = fw(l, /sorry/i), wh = fw(l, /why/i);
  const w2 = l.words.find((w) => w.index > so.index)!;
  backdrop(s, 0.02, 0.05);
  cam(s, snapCam(t, [0, w2.start - 0.1], [{ x: W / 2 - 60, y: 450, z: 1.06, r: -0.012 }, { x: W / 2 + 80, y: 640, z: 1.06, r: 0.012 }], 0.5));
  // bokeh city beyond the glass
  for (let i = 0; i < 26; i++) { const x = hash(i, 1) * W, y = 200 + hash(i, 2) * 700, r = 30 + 50 * hash(i, 3); pool(c, x, y, r, [AMBER, TEAL, RED][i % 3]!, 0.12); }
  lyric(s, l.words.slice(0, so.index), 250, { width: 1100, max: 100, x: 820 });
  neon(s, 'sorry', 820, 540, { font: 'script', size: 250, color: 'pink', lit: () => ignite(t, so.start - 0.03, 2, 0.04), box: { pad: 50, a: 0.5 } });
  lyric(s, l.words.slice(so.index + 1, wh.index), 670, { width: 1000, max: 90, x: 1150 });
  neon(s, 'WHY?', 1150, 900, { font: 'readable', size: 190, color: 'red', lit: () => ignite(t, wh.start - 0.03, 6, 0.08) });
  // raindrops on the glass
  for (let i = 0; i < 70; i++) { const x = hash(i, 7) * W, y = 140 + ((hash(i, 8) * 800 + t * (30 + 80 * hash(i, 9))) % 800); c.strokeStyle = grey(0.8, 0.25); c.lineWidth = 2; c.beginPath(); c.ellipse(x, y, 4, 6, 0, 0, TAU); c.stroke(); }
  rain(s, 160, 0.1, 0.1, 3);
}

// THERE'S GOT TO BE SOMEONE SMALL IN THE DARK — a vast black frame with one tiny spotlit man; on SMALL the camera dives into the
// spot (the tiny word becomes huge); on DARK the spot gutters out and only the sung word is left burning.
function smallman(s: S) {
  const { t, c } = s;
  const l = ln(s), sm = fw(l, /small/i), dk = fw(l, /dark/i), so = fw(l, /someone/i);
  backdrop(s, 0.0, 0.01);
  const sx = 1060, sy = 640;
  const dive = prog(t, sm.start - 0.15, sm.start + 0.75, ease.inOutCubic);
  const z = Math.exp(lerp(0, Math.log(6.5), dive));
  cam(s, { x: lerp(W / 2, sx + 6, dive), y: lerp(H / 2, sy - 22, dive), z, r: 0 }, 0.03);
  const spot = gutter(t, dk.start - 0.05, 0.3, 4);
  // the floor pool + the cone
  pool(c, sx, sy + 2, 70, '#FFF4DC', 0.5 * spot, 0.28);
  cone(s, sx, sy - 260, 0, 0.09, 262, '#FFF4DC', 0.07 * spot, 0.3);
  man(c, sx, sy, 34, grey(0.75 * spot + 0.05));
  // tiny words beside the man
  if (t > sm.start - 0.06) {
    const k = on(sm, t, 0.2);
    setFont(c, A(100, 900), 18); c.textAlign = 'left'; c.fillStyle = hmix('#E8E5DE', RED, heat(sm, t), k); c.fillText('SMALL', sx + 14, sy - 6);
    if (heat(sm, t) > 0.05) { setFont(s.g, A(100, 900), 18); s.g.textAlign = 'left'; s.g.fillStyle = hx(RED, 0.5 * heat(sm, t)); s.g.fillText('SMALL', sx + 14, sy - 6); }
  }
  lyric(s, l.words.slice(0, so.index + 1), 300, { width: 1300, max: 120, alpha: 1 - dive });
  // IN THE DARK at the dived-in scale, around the man
  const rest = l.words.slice(sm.index + 1);
  rest.forEach((w, i) => {
    const big = clean(w.w).toLowerCase() === 'dark';
    const x = big ? sx + 4 : sx - 70 + i * 26, y = big ? sy + 26 : sy + 20;
    sw(s, w, txt2(w), A(big ? 125 : 62, big ? 900 : 300), big ? 26 : 9, x, y, { from: big ? 1.4 : 1.1, color: big ? undefined : grey(0.5, on(w, t)) });
  });
}
const txt2 = (w: Word) => clean(w.w).toUpperCase();

// PULLING THE LEVERS, KEEPING THE SPARK — three knife switches thrown on the sung words; arcs crackle; SPARK is a faulty
// blue-white tube that buzzes.
function levers(s: S) {
  const { t, c, g } = s;
  const l = ln(s), pu = l.words[0]!, lv = fw(l, /levers/i), ke = fw(l, /keeping/i), spk = fw(l, /spark/i);
  backdrop(s, 0.03, 0.05);
  cam(s, snapCam(t, [0, ke.start - 0.1, spk.start - 0.1], [{ x: W / 2, y: 520, z: 1.04, r: 0 }, { x: W / 2, y: 560, z: 1.0, r: 0.01 }, { x: W / 2, y: 600, z: 1.08, r: -0.01 }], 0.45));
  // panel
  c.fillStyle = grey(0.1); c.fillRect(300, 330, 1320, 420);
  c.strokeStyle = grey(0.3); c.lineWidth = 4; c.strokeRect(300, 330, 1320, 420);
  for (const [x, y] of [[320, 350], [1600, 350], [320, 730], [1600, 730]]) { c.fillStyle = grey(0.4); c.beginPath(); c.arc(x!, y!, 7, 0, TAU); c.fill(); }
  const sw3: [Word, number][] = [[pu, 560], [lv, 960], [spk, 1360]];
  sw3.forEach(([w, x], i) => {
    const thrown = prog(t, w.start - 0.05, w.start + 0.18, ease.inCubic);
    // contacts
    c.fillStyle = grey(0.55); c.fillRect(x - 50, 620, 20, 60); c.fillRect(x + 30, 620, 20, 60);
    c.fillStyle = grey(0.3); c.fillRect(x - 70, 680, 140, 30);
    // the blade: hinged at the bottom contacts, from up (open) to down into the top clips
    const ang = lerp(-1.25, 0, thrown);
    c.save(); c.translate(x, 680); c.rotate(ang);
    c.fillStyle = grey(0.75); c.fillRect(-46, -260, 14, 260); c.fillRect(32, -260, 14, 260);
    c.fillStyle = grey(0.12); c.fillRect(-60, -300, 120, 44);
    c.restore();
    c.fillStyle = grey(0.55); c.fillRect(x - 54, 400, 22, 40); c.fillRect(x + 32, 400, 22, 40);
    // arc on closing
    const arc = pulseAt(t, w.start + 0.15, 0.08) * (t > w.start + 0.12 ? 1 : 0);
    if (arc > 0.02) {
      for (const dx of [-40, 40]) {
        g.strokeStyle = hx('#BFD9FF', 0.9 * arc); g.lineWidth = 4; g.beginPath(); g.moveTo(x + dx, 440);
        for (let k = 1; k <= 6; k++) g.lineTo(x + dx + (hash(k, i, Math.floor(t * 30)) - 0.5) * 30, 440 - k * 10);
        g.stroke();
      }
      s.post.flash = Math.max(s.post.flash ?? 0, 0.12 * arc);
    }
  });
  lyric(s, l.words.slice(0, lv.index + 1), 280, { width: 1200, max: 100, from: 1.5 });
  lyric(s, l.words.slice(ke.index, spk.index), 860, { width: 700, max: 90, x: 700 });
  neon(s, 'SPARK', 1310, 900, { font: 'osmotron', size: 150, color: 'blue', lit: () => ignite(t, spk.start - 0.03, 4, 0.5), width: 8 });
  // the big arc between the panel's terminals once SPARK lands
  const big = t > spk.start ? 0.6 + 0.4 * hash(Math.floor(t * 24), 7) : 0;
  if (big > 0) {
    g.strokeStyle = hx('#CFE3FF', 0.85 * big); g.lineWidth = 5; g.beginPath(); g.moveTo(1560, 380);
    for (let k = 1; k <= 14; k++) g.lineTo(1560 - k * 18 + (hash(k, Math.floor(t * 30)) - 0.5) * 18, 380 + Math.sin(k * 0.6) * 30 + (hash(k, 3, Math.floor(t * 30)) - 0.5) * 30);
    g.stroke();
    pool(g, 1430, 400, 220, '#9FC0FF', 0.25 * big);
  }
}

// ================================================================== PRE-CHORUS 1
// NO LITTLE MAN, NO HIDDEN KEY / NO BOOK OF RULES, NO MEMORY — a police line-up against a height chart marked in weights; every
// slot is an empty dashed outline; each NO slams in red, each noun lands on the placard.
function nolist(s: S) {
  const { t, c } = s;
  const all = s.sh.lines.flatMap((x) => x.words);
  const groups: Word[][] = [];
  for (const w of all) { if (/^no$/i.test(clean(w.w)) || !groups.length) groups.push([]); groups[groups.length - 1]!.push(w); }
  backdrop(s, 0.07, 0.04);
  // the height chart
  c.strokeStyle = grey(0.32); c.lineWidth = 2;
  for (let k = 0; k <= 10; k++) {
    const y = 820 - k * 62; c.beginPath(); c.moveTo(200, y); c.lineTo(1760, y); c.stroke();
    setFont(c, F.mono(600), 22); c.fillStyle = grey(0.55); c.textAlign = 'left'; c.fillText((k / 10).toFixed(1), 150, y + 8); c.textAlign = 'right'; c.fillText((k / 10).toFixed(1), 1800, y + 8);
  }
  const xs = [440, 800, 1160, 1520];
  const cur = Math.max(0, groups.findIndex((g0, i) => t < (groups[i + 1]?.[0]?.start ?? 1e9) - 0.12));
  cam(s, { x: snapV(t, groups.map((g0) => g0[0]!.start - 0.12), groups.map((_, i) => lerp(W / 2, xs[i]!, 0.35))), y: H / 2, z: 1.04, r: 0 });
  void cur;
  const shapes = ['man', 'key', 'book', 'reel'];
  groups.slice(0, 4).forEach((gw, i) => {
    const x = xs[i]!, no = gw[0]!, nouns = gw.slice(1);
    const appearK = on(no, t, 0.3);
    // the empty outline
    c.save(); c.globalAlpha = 0.25 + 0.6 * appearK;
    c.strokeStyle = grey(0.85); c.lineWidth = 3; c.setLineDash([10, 8]);
    if (shapes[i] === 'man') man(c, x, 820, 300, grey(0.85), 1, true, 3);
    else if (shapes[i] === 'key') { c.beginPath(); c.arc(x, 520, 60, 0, TAU); c.stroke(); c.strokeRect(x - 12, 580, 24, 200); c.strokeRect(x + 12, 700, 40, 20); c.strokeRect(x + 12, 740, 30, 20); }
    else if (shapes[i] === 'book') { c.strokeRect(x - 110, 470, 220, 290); c.beginPath(); c.moveTo(x - 80, 470); c.lineTo(x - 80, 760); c.stroke(); }
    else { c.beginPath(); c.arc(x, 600, 140, 0, TAU); c.stroke(); for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU; c.beginPath(); c.arc(x + Math.cos(a) * 80, 600 + Math.sin(a) * 80, 34, 0, TAU); c.stroke(); } }
    c.setLineDash([]); c.restore();
    // placard
    c.fillStyle = grey(0.12, 0.9 * appearK); c.fillRect(x - 160, 850, 320, 76);
    setFont(c, F.mono(700), 22); c.fillStyle = grey(0.6, appearK); c.textAlign = 'left'; c.fillText(`No. ${i + 1}`, x - 150, 872);
    const text = nouns.map((w) => clean(w.w).toUpperCase()).join(' ');
    nouns.forEach((w, j) => { void j; });
    if (nouns.length) {
      const w0 = nouns[0]!, k = on(w0, t, 0.2);
      if (k > 0) {
        const fam = A(text.length > 10 ? 62 : 100, 900);
        const size = Math.min(52, (300 * 52) / Math.max(1, measureText(text, fam, 52)));
        const hk = Math.max(...nouns.map((w) => heat(w, t)));
        label(c, text, fam, size, x, 902, hmix('#E8E5DE', RED, hk, k));
      }
    }
    // the NO
    const nk = on(no, t, 0.14, ease.outQuad);
    if (nk > 0) {
      c.save(); c.translate(x, 360); c.rotate(-0.12 + 0.08 * hash(i)); c.scale(lerp(1.9, 1, nk), lerp(1.9, 1, nk)); c.globalAlpha = nk;
      setFont(c, A(125, 900), 150); c.textAlign = 'center'; c.fillStyle = hx(RED, 0.95); c.fillText('NO', 0, 52);
      setFont(s.g, A(125, 900), 150); s.g.save(); s.g.setTransform(c.getTransform()); s.g.textAlign = 'center'; s.g.fillStyle = hx(RED, 0.4 * heat(no, t)); s.g.fillText('NO', 0, 52); s.g.restore();
      c.restore();
      if (t < no.start + 0.15) s.post.shake = [Math.sin(t * 90) * 8, 0];
    }
  });
}
import { measure as measureText } from '../engine/type';

// JUST MULTIPLY AND PASS IT ON — a vector times a matrix: rows scan and light, × slams; on PASS the result whips right into the
// next layer's matrix.
function matmul(s: S) {
  const { t, c, g } = s;
  const l = ln(s), mu = fw(l, /multiply/i), pa = fw(l, /pass/i), onw = lastW(l);
  backdrop(s, 0.02, 0.04);
  const whip = prog(t, pa.start - 0.12, pa.start + 0.38, ease.inOutCubic);
  cam(s, { x: lerp(W / 2, W / 2 + 1700, whip), y: H / 2, z: lerp(1.0, 1.06, prog(t, mu.start, pa.start)), r: lerp(0, -0.02, whip) });
  const mat = (ox: number, seed: number, scan: number) => {
    setFont(c, F.mono(500), 24); c.textAlign = 'right';
    for (let r = 0; r < 9; r++) for (let q = 0; q < 7; q++) {
      const v = hash(r, q, seed) * 2 - 1, lit = Math.abs(r - scan) < 0.6;
      c.fillStyle = lit ? hx(RED, 0.95) : grey(0.62, 0.8);
      c.fillText((v >= 0 ? '+' : '') + v.toFixed(2), ox + 100 + q * 104, 360 + r * 52);
      if (lit) { g.font = c.font; g.textAlign = 'right'; g.fillStyle = hx(RED, 0.35); g.fillText((v >= 0 ? '+' : '') + v.toFixed(2), ox + 100 + q * 104, 360 + r * 52); }
    }
    c.strokeStyle = grey(0.7); c.lineWidth = 3;
    c.beginPath(); c.moveTo(ox + 14, 318); c.lineTo(ox - 4, 318); c.lineTo(ox - 4, 800); c.lineTo(ox + 14, 800); c.stroke();
    c.beginPath(); c.moveTo(ox + 740, 318); c.lineTo(ox + 758, 318); c.lineTo(ox + 758, 800); c.lineTo(ox + 740, 800); c.stroke();
  };
  const scan = t < mu.start ? -9 : ((t - mu.start) * 14) % 12;
  mat(560, 3, scan);
  // input vector
  setFont(c, F.mono(600), 24); c.textAlign = 'right';
  for (let r = 0; r < 9; r++) { const v = hash(r, 77) * 2 - 1; c.fillStyle = grey(0.85); c.fillText((v >= 0 ? '+' : '') + v.toFixed(2), 380, 360 + r * 52); }
  // ×
  const xk = on(mu, t, 0.2, ease.outBack);
  if (xk > 0) label(c, '×', A(100, 900), 160 * xk, 470, 560, hmix('#E8E5DE', RED, heat(mu, t)));
  // the result column: flies right with the whip
  const rx = lerp(1430, 1430 + 1700 - 140, whip);
  for (let r = 0; r < 9; r++) { const v = hash(r, 99) * 2 - 1, k = t > mu.start + 0.2 ? 1 : 0; c.fillStyle = hx(TEAL, 0.95 * k); c.fillText((v >= 0 ? '+' : '') + v.toFixed(2), rx, 360 + r * 52); g.font = c.font; g.textAlign = 'right'; g.fillStyle = hx(TEAL, 0.3 * k); g.fillText((v >= 0 ? '+' : '') + v.toFixed(2), rx, 360 + r * 52); }
  // speed lines during the whip
  if (whip > 0.05 && whip < 0.95) { c.strokeStyle = grey(0.8, 0.25); c.lineWidth = 2; for (let i = 0; i < 30; i++) { const y = 200 + hash(i, 4) * 700, x = W / 2 + 900 + hash(i, 5) * 1400; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 300, y); c.stroke(); } }
  mat(560 + 1700, 8, t > pa.start + 0.4 ? ((t - pa.start - 0.4) * 14) % 12 : -9);
  lyric(s, l.words.slice(0, mu.index + 1), 230, { width: 900, max: 110, x: 900, from: 1.5 });
  lyric(s, l.words.slice(mu.index + 1), 870, { width: 1100, max: 100, x: W / 2 + 1700, from: 1.6 });
  void onw;
}
const lastW = (l: Line) => l.words[l.words.length - 1]!;

// AND SOMEHOW OUT COMES A SONG — a gramophone horn in silhouette; rings leave the bell on the beat; SONG flies out of the horn as
// pink script neon.
function song(s: S) {
  const { t, c, g } = s;
  const l = ln(s), sg = lastW(l), oc = fw(l, /out/i);
  backdrop(s, 0.03, 0.05);
  cam(s, snapCam(t, [0, oc.start - 0.1, sg.start - 0.1], [{ x: W / 2, y: H / 2, z: 1.0, r: 0 }, { x: W / 2 + 60, y: H / 2, z: 1.04, r: 0.01 }, { x: W / 2 + 200, y: H / 2 + 20, z: 1.08, r: 0 }], 0.45));
  // the horn: a flaring bell from the box at left
  const hxx = 520, hy = 560;
  c.fillStyle = grey(0.08); c.fillRect(220, 700, 300, 170);
  c.fillStyle = grey(0.14); c.beginPath(); c.ellipse(370, 700, 160, 22, 0, 0, TAU); c.fill();
  c.fillStyle = grey(0.06); c.beginPath(); c.moveTo(360, 700); c.quadraticCurveTo(420, 560, hxx, hy - 40); c.lineTo(hxx + 120, hy - 230); c.lineTo(hxx + 150, hy + 170); c.lineTo(hxx, hy + 40); c.quadraticCurveTo(440, 640, 400, 700); c.closePath(); c.fill();
  c.strokeStyle = grey(0.45); c.lineWidth = 3; c.beginPath(); c.ellipse(hxx + 135, hy - 30, 26, 200, 0.1, 0, TAU); c.stroke();
  // rings on the beat
  const beat = 60 / s.au.bpm;
  for (let k = 0; k < 6; k++) {
    const age = ((t - s.sh.start) / beat - k) % 6; if (age < 0) continue;
    const r = 60 + age * 160, a = clamp(1 - age / 5) * 0.5;
    c.strokeStyle = grey(0.8, a); c.lineWidth = 3; c.beginPath(); c.ellipse(hxx + 140, hy - 30, r * 0.35, r, 0.1, -1.2, 1.2); c.stroke();
  }
  lyric(s, l.words.slice(0, oc.index), 250, { width: 900, max: 100, x: 1150 });
  lyric(s, l.words.slice(oc.index, sg.index), 420, { width: 700, max: 110, x: 1150 });
  // SONG flies out of the bell along an arc and settles
  const fk = prog(t, sg.start - 0.08, sg.start + 0.45, ease.outExpo);
  if (fk > 0) {
    const x = lerp(hxx + 150, 1230, fk), y = lerp(hy - 30, 760, fk), sc = lerp(0.2, 1, fk);
    c.save(); g.save(); for (const x2 of [c, g]) { x2.translate(x, y); x2.scale(sc, sc); x2.rotate(lerp(-0.4, -0.06, fk)); }
    neon(s, 'song', 0, 0, { font: 'script', size: 300, color: 'pink', lit: () => ignite(t, sg.start - 0.03, 9, 0) });
    c.restore(); g.restore();
  }
  // notes as points pouring from the bell
  for (let i = 0; i < 40; i++) { const f = ((t * 0.6 + hash(i, 2)) % 1); const x = hxx + 150 + f * 900, y = hy - 30 + Math.sin(f * 6 + i) * 160 * f; c.fillStyle = hx(PINK, 0.6 * (1 - f)); c.fillRect(x, y, 4, 4); }
}

export const A_SHOTS: Record<string, (s: S) => void> = { opened, titleCity, casefile, fluoro, flashlight, tiers, office, letter, sorry, smallman, levers, nolist, matmul, song };
