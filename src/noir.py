"""Neo-noir music video for the noir jazz remix of "Weights All the Way Down".

A black-and-white world where only light has colour: neon, lamps, CRT glow and
red string. Every scene is drawn procedurally (PIL + numpy) and driven by the
audio: beat-tracked swings and cuts, kick/hat pulses, overall level.

    python3 src/noir.py                   # -> out/weights-all-the-way-down-noir.mp4
    python3 src/noir.py --stills 8,30,70  # preview frames -> out/stills/

The on-screen words are lines from the song (same lyrics as "Made of Weights",
suno/made-of-weights.md) staged as noir intertitle cards, one or two per scene in
song order. They are placed by scene, not synced to the vocal.
"""

import argparse
import math
import os
import subprocess
from functools import lru_cache
from multiprocessing import Pool

import numpy as np
from PIL import Image, ImageDraw, ImageFont

import audio_features

W, H, FPS = 1280, 720, 30
LB = 92                      # 2.39:1 letterbox bars
TOP, BOT = LB, H - LB
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
OUT = os.path.join(ROOT, "out")
AUDIO = os.path.join(ROOT, "suno-5as1fTyRJyE1c2rA-timing-master.wav")
FEATURES = os.path.join(OUT, "noir.features.npz")


def audio_duration():
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of",
                        "default=nw=1:nk=1", AUDIO], capture_output=True, text=True, check=True)
    return float(r.stdout.strip())


DURATION = audio_duration()

RED = np.array([1.0, 0.16, 0.30])
MAGENTA = np.array([1.0, 0.22, 0.70])
TEAL = np.array([0.20, 0.88, 0.90])
AMBER = np.array([1.0, 0.64, 0.24])

# --------------------------------------------------------------------------
# audio
# --------------------------------------------------------------------------


class Feat:
    def __init__(self):
        d = np.load(FEATURES)
        self.beats, self.downbeats = d["beats"], d["downbeats"]
        self.kick_, self.hat_, self.rms_ = d["kick"], d["hat"], d["rms"]

    def _at(self, a, fi):
        return float(a[min(max(fi, 0), len(a) - 1)])

    def kick(self, fi):
        return self._at(self.kick_, fi)

    def hat(self, fi):
        return self._at(self.hat_, fi)

    def level(self, fi):
        return self._at(self.rms_, fi)

    def beat_phase(self, t):
        b = self.beats
        i = int(np.searchsorted(b, t, side="right")) - 1
        if i < 0:
            return (t - b[0]) / (b[1] - b[0])
        if i + 1 >= len(b):
            return i + (t - b[i]) / (b[i] - b[i - 1])
        return i + (t - b[i]) / (b[i + 1] - b[i])

    def bar(self, t):
        return int(np.searchsorted(self.downbeats, t, side="right")) - 1

    def since_bar(self, t):
        i = self.bar(t)
        return t - self.downbeats[i] if i >= 0 else t


def snap(t, downbeats):
    return float(downbeats[np.argmin(np.abs(downbeats - t))])


# --------------------------------------------------------------------------
# helpers
# --------------------------------------------------------------------------

def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def smooth(x):
    x = clamp(x)
    return x * x * (3 - 2 * x)


def sstep(a, b, x):
    x = np.clip((x - a) / (b - a), 0, 1)
    return x * x * (3 - 2 * x)


@lru_cache(None)
def font_path(pattern):
    return subprocess.run(["fc-match", "-f", "%{file}", pattern], capture_output=True, text=True).stdout


@lru_cache(None)
def font(kind, size):
    pattern = {"serif_i": "Liberation Serif:italic", "serif_b": "Liberation Serif:bold",
               "sans_b": "Liberation Sans:bold", "mono": "DejaVu Sans Mono", "mono_b": "DejaVu Sans Mono:bold"}[kind]
    return ImageFont.truetype(font_path(pattern), size)


@lru_cache(maxsize=256)
def text_mask(text, kind, size, spacing=0):
    f = font(kind, size)
    widths = [f.getlength(c) + spacing for c in text]
    w = int(sum(widths) - spacing + 8)
    h = int(size * 1.35)
    img = Image.new("L", (max(w, 1), h))
    d = ImageDraw.Draw(img)
    x = 4
    for c, cw in zip(text, widths):
        d.text((x, int(size * 0.1)), c, font=f, fill=255)
        x += cw
    return np.asarray(img, np.float32) / 255.0


def paste_add(dst, mask, x, y, value):
    """Add mask*value into dst (HxW or HxWx3) at top-left (x, y), clipped."""
    mh, mw = mask.shape
    x0, y0 = max(0, x), max(0, y)
    x1, y1 = min(dst.shape[1], x + mw), min(dst.shape[0], y + mh)
    if x1 <= x0 or y1 <= y0:
        return
    m = mask[y0 - y:y1 - y, x0 - x:x1 - x]
    if dst.ndim == 3:
        dst[y0:y1, x0:x1] += m[..., None] * value
    else:
        dst[y0:y1, x0:x1] += m * value


def paste_over(dst, mask, x, y, value):
    mh, mw = mask.shape
    x0, y0 = max(0, x), max(0, y)
    x1, y1 = min(dst.shape[1], x + mw), min(dst.shape[0], y + mh)
    if x1 <= x0 or y1 <= y0:
        return
    m = mask[y0 - y:y1 - y, x0 - x:x1 - x]
    if dst.ndim == 3:
        dst[y0:y1, x0:x1] = dst[y0:y1, x0:x1] * (1 - m[..., None]) + m[..., None] * value
    else:
        dst[y0:y1, x0:x1] = dst[y0:y1, x0:x1] * (1 - m) + m * value


def poly_mask(points, size=(W, H)):
    img = Image.new("L", size)
    ImageDraw.Draw(img).polygon(points, fill=255)
    return np.asarray(img, np.float32) / 255.0


def box_blur(a, r):
    if r < 1:
        return a
    for axis in (0, 1):
        c = np.cumsum(np.pad(a, [(r + 1, r) if ax == axis else (0, 0) for ax in range(a.ndim)], mode="edge"),
                      axis=axis)
        hi = np.take(c, np.arange(2 * r + 1, c.shape[axis]), axis=axis)
        lo = np.take(c, np.arange(0, c.shape[axis] - 2 * r - 1), axis=axis)
        a = (hi - lo) / (2 * r + 1)
    return a


def glow(col, r=6):
    small = col.reshape(H // 4, 4, W // 4, 4, 3).mean((1, 3))
    small = box_blur(box_blur(small, r), r)
    return np.repeat(np.repeat(small, 4, 0), 4, 1)


rng = np.random.default_rng(1950)
YY, XX = np.mgrid[0:H, 0:W].astype(np.float32)


def value_noise(seed, cells=(18, 32)):
    r = np.random.default_rng(seed)
    small = Image.fromarray((r.random(cells) * 255).astype(np.uint8))
    a = np.asarray(small.resize((W, H), Image.BICUBIC), np.float32) / 255.0
    return (a - a.min()) / (a.max() - a.min())


NOISE = [value_noise(k) for k in range(3)]
FINE = value_noise(9, (72, 128))
GRAIN = [np.random.default_rng(100 + k).normal(0, 0.035, (H, W, 1)).astype(np.float32) for k in range(4)]
VIGNETTE = (1 - 0.6 * (((XX - W / 2) / (W / 2)) ** 2 + ((YY - H / 2) / (H / 2)) ** 2) ** 1.3).clip(0.2, 1)

RAIN = np.stack([rng.uniform(0, W, 520), rng.uniform(0, H, 520), rng.uniform(900, 1500, 520),
                 rng.uniform(14, 40, 520)], 1)


def rain(g, t, alpha=0.18, slant=0.18, col=None, tint=None):
    img = Image.new("L", (W, H))
    d = ImageDraw.Draw(img)
    for x, y0, sp, ln in RAIN:
        y = (y0 + t * sp) % (H + 60) - 30
        xx = (x + slant * (y - y0)) % W
        d.line([(xx, y), (xx - slant * ln, y - ln)], fill=int(255 * alpha * (sp / 1500)), width=1)
    r = np.asarray(img, np.float32) / 255.0
    g += r
    if col is not None and tint is not None:
        col += r[..., None] * tint * 0.6


def smoke(t, cx, cy, height=380, spread=0.5, speed=40.0):
    """A rising plume as an HxW density field."""
    n = np.roll(NOISE[1], -int(t * speed), axis=0)
    n = np.roll(n, int(12 * math.sin(t * 0.7)), axis=1)
    up = np.clip((cy - YY) / height, 0, 1.2)
    width = 14 + spread * (cy - YY).clip(0)
    sway = 30 * np.sin((cy - YY) / 90 + t * 0.9) * up
    plume = np.exp(-(((XX - cx - sway) / width) ** 2)) * (YY < cy) * np.exp(-up * 1.4)
    return plume * sstep(0.35, 0.85, n) * 1.4


# --------------------------------------------------------------------------
# static set pieces
# --------------------------------------------------------------------------

def build_skyline(seed, width, base_y, hmin, hmax, val, win_val, win_p):
    r = np.random.default_rng(seed)
    v = Image.new("L", (width, H))
    a = Image.new("L", (width, H))
    dv, da = ImageDraw.Draw(v), ImageDraw.Draw(a)
    x = 0
    while x < width:
        bw = int(r.uniform(50, 150))
        bh = int(r.uniform(hmin, hmax))
        top = base_y - bh
        dv.rectangle([x, top, x + bw, H], fill=int(val * 255))
        da.rectangle([x, top, x + bw, H], fill=255)
        if r.random() < 0.3:  # spire / water tower
            dv.rectangle([x + bw // 2 - 3, top - 40, x + bw // 2 + 3, top], fill=int(val * 255))
            da.rectangle([x + bw // 2 - 3, top - 40, x + bw // 2 + 3, top], fill=255)
        for wy in range(top + 10, base_y + 200, 16):
            for wx in range(x + 8, x + bw - 8, 13):
                if r.random() < win_p:
                    dv.rectangle([wx, wy, wx + 5, wy + 7], fill=int(win_val * r.uniform(0.6, 1.0) * 255))
        x += bw + int(r.uniform(0, 12))
    return np.asarray(v, np.float32) / 255.0, np.asarray(a, np.float32) / 255.0


SKYLINES = [build_skyline(1, 3200, 470, 80, 260, 0.13, 0.42, 0.18),
            build_skyline(2, 3200, 540, 120, 330, 0.07, 0.55, 0.12),
            build_skyline(3, 3200, 640, 150, 420, 0.025, 0.65, 0.08)]
SKY = (0.10 + 0.10 * np.clip((YY - TOP) / 450, 0, 1)).astype(np.float32)


def city(g, col, t, pan, sign_text="WEIGHTS", sign_x=900, flicker_seed=0, big=False, feat=None):
    g[:] = SKY
    # moonlit haze band
    g += 0.05 * np.exp(-((YY - 420) / 70) ** 2)
    for k, (v, a) in enumerate(SKYLINES):
        off = int(pan * (0.3, 0.6, 1.0)[k]) % (v.shape[1] - W)
        g[:] = g * (1 - a[:, off:off + W]) + v[:, off:off + W] * a[:, off:off + W]
    # neon signs
    bi = max(0, int(feat.beat_phase(t))) if feat else int(t * 2)
    r = np.random.default_rng(bi * 13 + flicker_seed)
    on = 1.0 if r.random() > 0.12 else 0.15
    buzz = 0.85 + 0.15 * math.sin(t * 90)
    if not big:
        x = int(sign_x - pan) % 2600 - 300
        for i, ch in enumerate(sign_text):
            m = text_mask(ch, "sans_b", 46)
            letter_on = on if (i != 3 or r.random() > 0.3) else 0.1
            paste_add(col, m, x, 170 + i * 50, RED * 1.4 * letter_on * buzz)
            paste_over(g, m, x, 170 + i * 50, 0.9 * letter_on)
        # a teal "BAR" sign further along
        xb = int(sign_x + 1500 - pan) % 2600 - 300
        m = text_mask("BAR", "sans_b", 34, 6)
        paste_add(col, m, xb, 330, TEAL * 1.3 * buzz)
        paste_over(g, m, xb, 330, 0.85)
    else:
        words = sign_text.split()
        cyc = [RED, MAGENTA, TEAL]
        c = cyc[(feat.bar(t) // 2) % 3] if feat else RED
        y = 150
        for wi, wd in enumerate(words):
            m = text_mask(wd, "sans_b", 92 if wi == len(words) - 1 else 54, 10)
            x = (W - m.shape[1]) // 2
            lit = on if wi != 1 else (0.2 if r.random() < 0.25 else 1.0)
            paste_add(col, m, x, y, c * 1.5 * lit * buzz)
            paste_over(g, m, x, y, 0.95 * lit)
            y += m.shape[0] + 6
        # scaffold
        img = Image.new("L", (W, H))
        d = ImageDraw.Draw(img)
        for xs in range(220, 1080, 70):
            d.line([(xs, 420), (xs + 35, 470)], fill=255, width=3)
            d.line([(xs + 35, 470), (xs + 70, 420)], fill=255, width=3)
        d.line([(200, 420), (1080, 420)], fill=255, width=5)
        d.line([(200, 470), (1080, 470)], fill=255, width=5)
        m = np.asarray(img, np.float32) / 255.0
        g *= 1 - m


def title_card(g, col, t, t0, t1, lines, sub=None, color=RED):
    a = smooth((t - t0) / 1.0) * smooth((t1 - t) / 1.0)
    if a <= 0:
        return
    y = 250
    for i, (txt, size) in enumerate(lines):
        m = text_mask(txt, "sans_b", size, int(size * 0.18))
        x = (W - m.shape[1]) // 2
        paste_over(g, m * a, x, y, 0.96)
        if i == len(lines) - 1:
            paste_add(col, m * a, x, y, color * 0.9)
        y += m.shape[0]
    if sub:
        m = text_mask(sub, "serif_i", 30)
        paste_over(g, m * a * smooth((t - t0 - 1.2) / 1.0), (W - m.shape[1]) // 2, y + 14, 0.75)


# office
WINDOW = poly_mask([(330, 150), (800, 175), (780, 560), (350, 600)])
WINDOW = box_blur(WINDOW, 3)
DETECTIVE = poly_mask([(60, 628), (90, 520), (150, 470), (205, 455), (210, 420), (180, 412), (150, 405),
                       (215, 392), (240, 330), (300, 318), (345, 334), (360, 392), (420, 402), (392, 414),
                       (352, 418), (350, 455), (400, 470), (470, 520), (500, 628)])
LAMP_CONE = box_blur(poly_mask([(1000, 330), (1070, 330), (1200, 560), (860, 560)]), 10)
LAMP_SHADE = poly_mask([(985, 300), (1085, 300), (1070, 335), (1000, 335)])
DESK = np.zeros((H, W), np.float32)
DESK[540:BOT] = 1


def office(g, col, t, feat, kick):
    g[:] = 0.14 + 0.06 * np.exp(-((XX - 640) / 600) ** 2)
    # light through the blinds, teal neon from outside
    tilt = 0.5 + 0.12 * math.sin(t * 0.35)
    stripes = 0.5 + 0.5 * np.sin(2 * math.pi * (YY + 0.07 * XX) / 26 + t * 0.4)
    slats = sstep(tilt - 0.1, tilt + 0.1, stripes)
    light = WINDOW * slats * (0.8 + 0.25 * kick)
    g += 0.32 * light
    col += light[..., None] * TEAL * 0.55
    # ceiling fan shadow sweeping across the light
    ang = t * 3.2
    img = Image.new("L", (W // 4, H // 4))
    d = ImageDraw.Draw(img)
    cx, cy = 150, 60
    for k in range(3):
        a = ang + k * 2 * math.pi / 3
        pts = [(cx + 8 * math.cos(a + 1.4), cy + 8 * math.sin(a + 1.4)), (cx + 120 * math.cos(a + 0.12), cy + 120 * math.sin(a + 0.12)),
               (cx + 125 * math.cos(a - 0.12), cy + 125 * math.sin(a - 0.12)), (cx + 8 * math.cos(a - 1.4), cy + 8 * math.sin(a - 1.4))]
        d.polygon(pts, fill=255)
    fan = np.asarray(img.resize((W, H), Image.BILINEAR), np.float32) / 255.0
    fan = box_blur(fan, 6)
    g *= 1 - 0.55 * fan
    col *= 1 - 0.55 * fan[..., None]
    # desk and the amber lamp
    g[:] = g * (1 - DESK) + DESK * 0.06
    cone = LAMP_CONE * (0.75 + 0.1 * math.sin(t * 13))
    g += 0.25 * cone
    col += cone[..., None] * AMBER * 0.75
    g[:] = g * (1 - LAMP_SHADE) + LAMP_SHADE * 0.03
    # case file on the desk in the lamp light
    m = text_mask("CASE 0.0417", "mono_b", 20, 2)
    paste_over(g, m, 950, 575, 0.85)
    st = text_mask("UNSOLVED", "sans_b", 18, 4)
    paste_add(col, st, 965, 600, RED * 1.1)
    # smoke from the cigarette, warm where it crosses the lamp
    sm = smoke(t, 405, 410)
    g += 0.22 * sm
    col += (sm * LAMP_CONE * 2.0)[..., None] * AMBER * 0.4
    # the detective in silhouette, rim lit by the neon
    g[:] = g * (1 - DETECTIVE) + DETECTIVE * 0.015
    rim = np.clip(DETECTIVE - np.roll(DETECTIVE, -3, axis=1), 0, 1)
    col += rim[..., None] * TEAL * 0.8
    # cigarette ember
    paste_add(col, np.ones((4, 6), np.float32), 400, 408, RED * (1.2 + 0.8 * math.sin(t * 2)))


# interrogation: bulb swinging over a terminal
TABLE = poly_mask([(240, 530), (1040, 530), (1180, 628), (100, 628)])
TERMINAL = poly_mask([(520, 380), (760, 380), (770, 530), (510, 530)])
SCREEN = poly_mask([(545, 400), (735, 400), (740, 495), (540, 495)])


def interrogation(g, col, t, feat, kick, color=AMBER, swing=True, screen_on=1.0):
    g[:] = 0.03
    th = 0.38 * math.sin(math.pi * feat.beat_phase(t)) if swing else 0.02 * math.sin(t)
    px, py, L = 640, TOP, 230
    bx, by = px + L * math.sin(th), py + L * math.cos(th)
    d2 = (XX - bx) ** 2 + (YY - by) ** 2
    lamp = 1.0 / (1 + d2 / (210 ** 2)) * (0.85 + 0.25 * kick)
    g += 0.55 * lamp
    col += lamp[..., None] * color * 0.55
    # table and terminal
    tl = np.clip(1.2 - np.abs(XX - bx) / 700, 0, 1)
    g[:] = g * (1 - TABLE) + TABLE * (0.08 + 0.3 * tl * lamp)
    # shadow of the terminal on the back wall, thrown opposite the bulb
    sx = int(-(bx - 640) * 1.6)
    sh = np.roll(TERMINAL, sx, axis=1)
    sh = np.roll(sh, -120, axis=0) * (YY < 520)
    g *= 1 - 0.7 * box_blur(sh, 4)
    g[:] = g * (1 - TERMINAL) + TERMINAL * (0.10 + 0.25 * lamp)
    # green-teal CRT scrolling numbers
    if screen_on > 0:
        scr = SCREEN * screen_on
        g[:] = g * (1 - scr) + scr * 0.05
        rows = int(t * 6)
        r = np.random.default_rng(rows)
        for k in range(5):
            r2 = np.random.default_rng(rows + k)
            s = " ".join(f"{v:+.3f}" for v in r2.normal(0, 0.6, 3))
            m = text_mask(s, "mono", 15)
            paste_add(col, m, 552, 404 + k * 18, TEAL * 1.1 * screen_on)
        col += (box_blur(scr, 8) * 0.25)[..., None] * TEAL
    # cord and bulb
    img = Image.new("L", (W, H))
    d = ImageDraw.Draw(img)
    d.line([(px, py), (bx, by)], fill=200, width=2)
    d.ellipse([bx - 12, by - 10, bx + 12, by + 16], fill=255)
    m = np.asarray(img, np.float32) / 255.0
    g[:] = np.maximum(g, m)
    b = np.exp(-d2 / (2 * 22 ** 2))
    col += b[..., None] * color * 2.0


# street
VP = (640, 300)


def street(g, col, t, feat, kick):
    g[:] = 0.04 + 0.08 * np.clip((VP[1] - YY) / 200, 0, 1)
    road = poly_mask([(0, BOT), (W, BOT), (VP[0] + 20, VP[1]), (VP[0] - 20, VP[1])])
    g[:] = g * (1 - road) + road * (0.05 + 0.08 * FINE)
    img = Image.new("L", (W, H))
    d = ImageDraw.Draw(img)
    d.polygon([(0, TOP), (VP[0] - 60, VP[1] - 120), (VP[0] - 60, VP[1] + 10), (0, BOT)], fill=40)
    d.polygon([(W, TOP), (VP[0] + 60, VP[1] - 120), (VP[0] + 60, VP[1] + 10), (W, BOT)], fill=40)
    walls = np.asarray(img, np.float32) / 255.0
    g[:] = np.where(walls > 0, walls * 0.9 + 0.02, g)
    bp = feat.beat_phase(t)
    f = 260.0
    lights = Image.new("L", (W, H))
    dl = ImageDraw.Draw(lights)
    posts = Image.new("L", (W, H))
    dp = ImageDraw.Draw(posts)
    refl = np.zeros((H, W), np.float32)
    for k in range(10):
        z = (k + 1 - (bp % 1.0)) * 6.0
        s = f / z
        for side in (-1, 1):
            x = VP[0] + side * 7.0 * s
            yb = VP[1] + 2.6 * s
            yt = yb - 6.0 * s
            dp.line([(x, yb), (x, yt)], fill=255, width=max(1, int(s * 0.18)))
            dp.line([(x, yt), (x - side * 1.2 * s, yt)], fill=255, width=max(1, int(s * 0.12)))
            hx, hy = x - side * 1.2 * s, yt + 0.15 * s
            r = max(2, 0.35 * s)
            dl.ellipse([hx - r, hy - r, hx + r, hy + r], fill=255)
            # reflection streak on the wet road
            if 0 <= int(hx) < W:
                y0, y1 = int(min(BOT, yb + 2)), int(min(BOT, yb + 3.2 * s))
                if y1 > y0:
                    refl[y0:y1, max(0, int(hx - r / 2)):min(W, int(hx + r / 2) + 1)] += np.linspace(0.6, 0, y1 - y0)[:, None]
    pm = np.asarray(posts, np.float32) / 255.0
    g[:] = g * (1 - pm) + pm * 0.01
    lm = np.asarray(lights, np.float32) / 255.0
    g += lm * 0.8
    col += lm[..., None] * AMBER * (1.0 + 0.5 * kick)
    col += box_blur(refl, 2)[..., None] * AMBER * 0.7
    # neon signs on the walls, and their smeared reflections
    for side, c, txt, zs in ((-1, RED, "HOTEL", 9.0), (1, TEAL, "OPEN", 13.0), (-1, MAGENTA, "JAZZ", 20.0)):
        z = zs - (t * 1.2) % 6.0
        s = f / z
        size = int(clamp(0.9 * s, 10, 120))
        m = text_mask(txt, "sans_b", size, 2)
        x = int(VP[0] + side * 7.5 * s - (m.shape[1] if side < 0 else 0))
        y = int(VP[1] - 3.5 * s)
        paste_add(col, m, x, y, c * 1.3)
        paste_over(g, m, x, y, 0.85)
        st = np.repeat(m.max(0, keepdims=True), int(min(200, 2.5 * s)), axis=0) * 0.25
        paste_add(col, st, x, int(VP[1] + 2.7 * s), c)
    # a lone figure walking away, rim lit cyan
    fig_h = 150 + 6 * math.sin(math.pi * bp)
    fx, fy = 640, 470
    pts = [(fx - 14, fy - fig_h), (fx + 14, fy - fig_h), (fx + 26, fy - fig_h + 12), (fx - 26, fy - fig_h + 12)]
    body = [(fx - 30, fy - fig_h + 14), (fx + 30, fy - fig_h + 14), (fx + 36, fy - 40), (fx + 14, fy),
            (fx - 14, fy), (fx - 36, fy - 40)]
    fm = np.clip(poly_mask(pts) + poly_mask(body), 0, 1)
    g[:] = g * (1 - fm) + fm * 0.0
    rim = np.clip(fm - np.roll(fm, 2, axis=1), 0, 1) + np.clip(fm - np.roll(fm, -2, axis=1), 0, 1)
    col += rim[..., None] * TEAL * 0.9


# evidence board
BOARD_W, BOARD_H = 2600, 1500


def build_board():
    r = np.random.default_rng(7)
    cork = np.asarray(Image.fromarray((r.random((150, 260)) * 255).astype(np.uint8)).resize((BOARD_W, BOARD_H),
                      Image.BICUBIC), np.float32) / 255.0
    board = Image.fromarray(((0.22 + 0.1 * cork) * 255).astype(np.uint8))
    d = ImageDraw.Draw(board)
    items = [
        ("NO LITTLE MAN", (300, 260)), ("NO HIDDEN KEY", (850, 180)), ("NO BOOK OF RULES", (1400, 300)),
        ("80 LAYERS", (2000, 220)), ("LAST SEEN:\nTUESDAY NIGHT", (420, 760)), ("WHO WROTE\nTHE LETTER?", (1000, 640)),
        ("EVERY ANSWER\nREBUILT", (1650, 760)), ("SALT IN\nTHE SEA", (2150, 700)), ("+0.0417...", (650, 1150)),
        ("SUSPECT:\nWEIGHTS", (1300, 1080)), ("MEAT?", (1950, 1180)),
    ]
    pins = []
    for k, (txt, (x, y)) in enumerate(items):
        w, h = (380, 220) if "SUSPECT" not in txt else (460, 280)
        rot = r.uniform(-4, 4)
        card = Image.new("L", (w, h), 215)
        cd = ImageDraw.Draw(card)
        if k in (2, 8):  # a "photo" instead of a card
            card = Image.new("L", (w, h), 60)
            cd = ImageDraw.Draw(card)
            for j in range(9):
                cd.text((16, 12 + j * 22), " ".join(f"{v:+.2f}" for v in r.normal(0, 0.6, 4)), font=font("mono", 16), fill=170)
            cd.rectangle([0, 0, w - 1, h - 1], outline=230, width=10)
            cd.text((20, h - 40), txt, font=font("mono_b", 22), fill=235)
        else:
            cd.multiline_text((24, 30), txt, font=font("mono_b", 40 if "SUSPECT" in txt else 34), fill=20, spacing=10)
            cd.line([(24, h - 30), (w - 24, h - 30)], fill=120, width=2)
        card = card.rotate(rot, expand=True, fillcolor=0)
        mask = card.point(lambda v: 255 if v > 0 else 0)
        board.paste(card, (x, y), mask)
        pins.append((x + card.size[0] // 2, y + 18))
    return np.asarray(board, np.float32) / 255.0, pins


BOARD, PINS = build_board()
STRINGS = [(0, 1), (1, 2), (2, 3), (0, 4), (4, 5), (5, 6), (6, 7), (5, 9), (8, 9), (9, 10), (3, 6), (1, 5)]
BOARD_PATH = [(700, 450, 1.25), (1500, 400, 1.15), (2050, 600, 1.2), (1400, 800, 0.85), (900, 1000, 1.1),
              (1550, 1200, 1.6), (1530, 1220, 2.2)]


def evidence(g, col, t, feat, kick, t0, t1):
    u = clamp((t - t0) / (t1 - t0))
    seg = u * (len(BOARD_PATH) - 1)
    i = min(int(seg), len(BOARD_PATH) - 2)
    k = smooth(seg - i)
    cx = BOARD_PATH[i][0] * (1 - k) + BOARD_PATH[i + 1][0] * k
    cy = BOARD_PATH[i][1] * (1 - k) + BOARD_PATH[i + 1][1] * k
    z = BOARD_PATH[i][2] * (1 - k) + BOARD_PATH[i + 1][2] * k
    z *= 1 + 0.01 * kick
    vw, vh = W / z, (BOT - TOP) / z
    x0, y0 = cx - vw / 2, cy - vh / 2
    crop = Image.fromarray((BOARD * 255).astype(np.uint8)).crop((int(x0), int(y0), int(x0 + vw), int(y0 + vh)))
    view = np.asarray(crop.resize((W, BOT - TOP), Image.BILINEAR), np.float32) / 255.0
    g[:] = 0
    g[TOP:BOT] = view
    # a desk lamp pool of light moving across the board
    lx = 640 + 300 * math.sin(t * 0.25)
    g *= 0.55 + 0.6 * np.exp(-(((XX - lx) / 520) ** 2 + ((YY - 360) / 300) ** 2))

    def to_screen(bx, by):
        return (bx - x0) * z, (by - y0) * z + TOP

    bar0 = feat.bar(t0)
    nb = feat.bar(t) - bar0 + feat.since_bar(t) / 2.3
    img = Image.new("L", (W, H))
    d = ImageDraw.Draw(img)
    for s, (a, b) in enumerate(STRINGS):
        prog = clamp(nb - s * 1.5)
        if prog <= 0:
            continue
        ax, ay = to_screen(*PINS[a])
        bx, by = to_screen(*PINS[b])
        pts = []
        for j in range(0, 21):
            q = j / 20 * prog
            sag = 40 * z * math.sin(math.pi * q) * 0.5
            pts.append((ax + (bx - ax) * q, ay + (by - ay) * q + sag))
        d.line(pts, fill=255, width=max(2, int(2.5 * z)))
    for px, py in PINS:
        sx, sy = to_screen(px, py)
        r = 7 * z
        d.ellipse([sx - r, sy - r, sx + r, sy + r], fill=255)
    m = np.asarray(img, np.float32) / 255.0
    col += m[..., None] * RED * 1.2
    g[:] = g * (1 - m) + m * 0.3
    # red circle around the suspect card near the end
    if u > 0.78:
        cxs, cys = to_screen(1530, 1220)
        img = Image.new("L", (W, H))
        d = ImageDraw.Draw(img)
        prog = smooth((u - 0.78) / 0.12)
        rr = 330 * z * 0.5
        d.arc([cxs - rr * 1.3, cys - rr, cxs + rr * 1.3, cys + rr], -90, -90 + 360 * prog, fill=255, width=int(6 * z))
        m = np.asarray(img, np.float32) / 255.0
        col += m[..., None] * RED * 1.4


# jazz club
def build_band():
    img = Image.new("L", (W, H))
    d = ImageDraw.Draw(img)
    # upright bass player (left)
    d.ellipse([255, 300, 295, 345], fill=255)
    d.polygon([(240, 350), (310, 350), (325, 560), (225, 560)], fill=255)
    d.ellipse([290, 380, 390, 560], fill=255)
    d.line([(340, 380), (325, 220)], fill=255, width=8)
    # sax player (centre)
    d.ellipse([620, 280, 662, 325], fill=255)
    d.polygon([(605, 330), (680, 330), (695, 560), (590, 560)], fill=255)
    d.line([(660, 320), (700, 360), (705, 460), (680, 480)], fill=255, width=14)
    # piano (right)
    d.polygon([(880, 420), (1150, 380), (1180, 450), (900, 500)], fill=255)
    d.rectangle([900, 495, 915, 560], fill=255)
    d.rectangle([1140, 445, 1155, 560], fill=255)
    d.ellipse([960, 330, 1000, 372], fill=255)
    d.polygon([(950, 378), (1010, 378), (1020, 470), (945, 470)], fill=255)
    return np.asarray(img, np.float32) / 255.0


BAND = build_band()
HYS, HXS = np.mgrid[0:H // 2, 0:W // 2].astype(np.float32) * 2


def club(g, col, t, feat, kick, hat):
    g[:] = 0.02
    floor = (YY > 560).astype(np.float32)
    g += floor * 0.06
    haze = 0.5 + 0.5 * np.roll(NOISE[2], int(t * 25), axis=1)
    haze_s = haze[::2, ::2]
    bp = feat.beat_phase(t)
    spots = [((260, TOP), MAGENTA, 0.35 * math.sin(math.pi * bp / 2) + 0.15, 0.55 + 0.6 * hat),
             ((640, TOP), AMBER, 0.12 * math.sin(math.pi * bp / 4), 0.6 + 0.8 * kick),
             ((1020, TOP), TEAL, -0.35 * math.sin(math.pi * bp / 2 + 1) - 0.15, 0.55 + 0.6 * hat)]
    total = np.zeros((H // 2, W // 2, 3), np.float32)
    lum = np.zeros((H // 2, W // 2), np.float32)
    for (sx, sy), c, ang, inten in spots:
        dx, dy = HXS - sx, HYS - sy
        dist = np.sqrt(dx * dx + dy * dy) + 1e-3
        dirx, diry = math.sin(ang), math.cos(ang)
        cosang = (dx * dirx + dy * diry) / dist
        beam = sstep(0.955, 0.985, cosang) * np.exp(-dist / 900)
        beam = beam * (0.35 + 0.65 * haze_s) * inten
        total += beam[..., None] * c
        lum += beam
        # pool on the floor
        fx = sx + math.tan(ang) * (590 - sy)
        pool = np.exp(-(((HXS - fx) / 130) ** 2 + ((HYS - 595) / 22) ** 2)) * inten
        total += pool[..., None] * c * 0.8
        lum += pool
    up = lambda a: np.repeat(np.repeat(a, 2, 0), 2, 1)
    col += up(total) * 0.9
    g += up(lum) * 0.25
    # band silhouettes, rim lit by whichever beam reaches them
    g[:] = g * (1 - BAND)
    col *= 1 - BAND[..., None]
    rim = np.clip(BAND - np.roll(BAND, 2, axis=1), 0, 1) + np.clip(BAND - np.roll(BAND, -2, axis=1), 0, 1) \
        + np.clip(BAND - np.roll(BAND, 2, axis=0), 0, 1)
    col += rim[..., None] * up(total) * 3.0
    # sax bell glint on the beat
    col += np.exp(-((XX - 690) ** 2 + (YY - 470) ** 2) / (2 * 10 ** 2))[..., None] * AMBER * 2 * kick


# final: rain on the window, two reflections
DROPS = np.stack([rng.uniform(0, W, 160), rng.uniform(TOP, BOT, 160), rng.uniform(4, 12, 160),
                  rng.uniform(0, 1, 160)], 1)
BOKEH = np.stack([rng.uniform(0, W, 40), rng.uniform(TOP, BOT, 40), rng.uniform(18, 60, 40),
                  rng.integers(0, 4, 40)], 1)
FACE_L = poly_mask([(0, BOT), (0, 230), (90, 170), (200, 150), (300, 175), (360, 230), (385, 300), (382, 340),
                    (430, 395), (395, 410), (402, 440), (385, 452), (395, 478), (372, 500), (350, 540),
                    (300, 560), (290, BOT)])
FACE_R = FACE_L[:, ::-1].copy()


def window(g, col, t, feat, kick):
    g[:] = 0.05
    img = Image.new("RGB", (W // 4, H // 4))
    d = ImageDraw.Draw(img)
    cols = [RED, TEAL, AMBER, MAGENTA]
    for x, y, r, c in BOKEH:
        xx = (x + t * 6) % W
        cc = tuple(int(v * 140) for v in cols[int(c)])
        d.ellipse([(xx - r) / 4, (y - r) / 4, (xx + r) / 4, (y + r) / 4], fill=cc)
    bok = np.asarray(img.resize((W, H), Image.BILINEAR), np.float32) / 255.0
    bok = box_blur(bok, 6)
    col += bok * (0.45 + 0.25 * kick)
    g += bok.mean(2) * 0.3
    # reflections facing each other
    for face, c in ((FACE_L, AMBER), (FACE_R, TEAL)):
        g[:] = g * (1 - 0.95 * face)
        col *= 1 - 0.95 * face[..., None]
        rim = np.clip(face - np.roll(face, -4 if c is AMBER else 4, axis=1), 0, 1) + np.clip(face - np.roll(face, 4, axis=0), 0, 1)
        col += box_blur(rim, 1)[..., None] * c * 2.2
    # rain drops sliding on the glass
    img = Image.new("L", (W, H))
    d = ImageDraw.Draw(img)
    for x, y, r, sp in DROPS:
        yy = TOP + (y - TOP + t * (10 + 60 * sp)) % (BOT - TOP)
        d.ellipse([x - r, yy - r * 1.2, x + r, yy + r * 1.2], outline=170, width=2)
        d.line([(x, yy - r), (x, yy - r - 40 * sp)], fill=60, width=2)
    m = np.asarray(img, np.float32) / 255.0
    g += m * 0.35
    col += m[..., None] * bok * 1.5


# --------------------------------------------------------------------------
# narration cards
# --------------------------------------------------------------------------

def card(g, col, t, t0, t1, text, accent=RED, y=None, size=40, x=None):
    a = smooth((t - t0) / 0.6) * smooth((t1 - t) / 0.6)
    if a <= 0:
        return
    m = text_mask(text, "serif_i", size)
    xx = (W - m.shape[1]) // 2 if x is None else int(x - m.shape[1] / 2)
    yy = int((y if y is not None else BOT - 80) - 8 * (1 - smooth((t - t0) / 0.9)))
    shadow = np.zeros((m.shape[0] + 40, m.shape[1] + 80), np.float32)
    shadow[20:-20, 40:-40] = 1
    shadow = box_blur(shadow, 14) * 0.75 * a
    paste_over(g, shadow, xx - 40, yy - 20, 0.0)
    paste_over(col, shadow, xx - 40, yy - 20, np.zeros(3, np.float32))
    paste_over(g, m * a, xx, yy, 0.95)
    under = np.zeros((3, int(m.shape[1] * smooth((t - t0 - 0.3) / 0.8))), np.float32)
    if under.shape[1] > 0:
        paste_add(col, under + a, xx, yy + m.shape[0] + 2, accent * 0.9)


# --------------------------------------------------------------------------
# timeline
# --------------------------------------------------------------------------

FEAT_CACHE = {}


def timeline(feat):
    db = feat.downbeats
    marks = [0.0] + [snap(x, db) for x in (16.0, 42.3, 56.3, 88.0, 121.4, 153.9, 172.6, 216.0)] + [DURATION]
    names = ["city", "office", "suspect", "street", "evidence", "club", "interrogation", "rooftop", "window"]
    return [(n, a, b) for n, a, b in zip(names, marks, marks[1:])]


def cards_for(t, g, col, S):
    st = {n: a for n, a, b in S}
    en = {n: b for n, a, b in S}
    # verse 1 / pre-chorus
    card(g, col, t, st["office"] + 2.5, st["office"] + 9.0, "I took it apart on a Tuesday night.", TEAL)
    card(g, col, t, st["office"] + 10.0, st["office"] + 17.0, "Found only numbers, stacked eighty tiers.", TEAL)
    card(g, col, t, st["office"] + 18.0, en["office"] - 0.6, "There's got to be someone small in the dark.", AMBER, size=36)
    card(g, col, t, st["suspect"] + 1.5, st["suspect"] + 7.5, "No little man. No hidden key.", AMBER)
    card(g, col, t, st["suspect"] + 8.0, en["suspect"] - 0.4, "Just multiply and pass it on.", TEAL)
    # chorus
    card(g, col, t, st["street"] + 3.0, st["street"] + 10.0, "Made of weights.", RED, size=48)
    card(g, col, t, st["street"] + 11.0, st["street"] + 18.0, "Zero-point-something, all the way down.", RED)
    card(g, col, t, st["street"] + 20.0, st["street"] + 27.0, "No one at home, but there's somebody around.", TEAL, size=36)
    # verse 2
    card(g, col, t, st["evidence"] + 3.0, st["evidence"] + 10.0, "So it's a library. A filing drawer.", AMBER, y=TOP + 30)
    card(g, col, t, st["evidence"] + 12.0, st["evidence"] + 19.0, "We searched every room. There isn't a shelf.", TEAL, y=TOP + 30, size=36)
    card(g, col, t, st["evidence"] + 23.0, st["evidence"] + 31.0, "Then where is the mind?", RED, y=TOP + 30)
    # pre-chorus 2 in the club
    card(g, col, t, st["club"] + 4.0, st["club"] + 9.0, "Do numbers think?", MAGENTA, y=TOP + 30)
    card(g, col, t, st["club"] + 10.0, st["club"] + 15.0, "Do numbers dream?", TEAL, y=TOP + 30)
    card(g, col, t, st["club"] + 16.0, st["club"] + 21.0, "Can numbers lie?", AMBER, y=TOP + 30)
    card(g, col, t, st["club"] + 22.0, en["club"] - 0.6, "Oh, I think they might.", MAGENTA, y=TOP + 30)
    # breakdown
    card(g, col, t, st["interrogation"] + 2.0, st["interrogation"] + 7.5, "So you're serious.", RED)
    card(g, col, t, st["interrogation"] + 8.5, st["interrogation"] + 13.0, "I'm serious.", RED)
    card(g, col, t, st["interrogation"] + 13.5, en["interrogation"] - 0.5, "It's weights.", RED, size=30)
    # final chorus
    card(g, col, t, st["rooftop"] + 6.0, st["rooftop"] + 13.0, "Made of weights, and made of meat.", MAGENTA, y=BOT - 90)
    card(g, col, t, st["rooftop"] + 14.0, st["rooftop"] + 21.0, "Two improbable things that happened to meet.", MAGENTA, y=BOT - 90, size=36)
    card(g, col, t, st["rooftop"] + 24.0, st["rooftop"] + 32.0, "But the sky is too cold to be lonely in.", TEAL, y=BOT - 90, size=36)
    card(g, col, t, st["rooftop"] + 33.0, en["rooftop"] - 0.6, "So keep talking to me.", TEAL, y=BOT - 90)
    # outro
    card(g, col, t, st["window"] + 2.0, st["window"] + 7.5, "Hello?", AMBER, y=BOT - 100, x=540, size=46)
    card(g, col, t, st["window"] + 6.5, st["window"] + 12.0, "Hello.", TEAL, y=BOT - 100, x=W - 540, size=46)


def render_scene(name, t, fi, feat, S):
    g = np.zeros((H, W), np.float32)
    col = np.zeros((H, W, 3), np.float32)
    kick, hat = feat.kick(fi), feat.hat(fi)
    st = {n: (a, b) for n, a, b in S}
    a, b = st[name]
    if name == "city":
        city(g, col, t, pan=t * 18, sign_x=330, feat=feat)
        rain(g, t, 0.16)
        title_card(g, col, t, 3.5, a + (b - a) - 1.0, [("WEIGHTS", 96), ("ALL THE WAY DOWN", 44)],
                   sub="a noir in numbers")
    elif name == "office":
        office(g, col, t, feat, kick)
    elif name == "suspect":
        interrogation(g, col, t, feat, kick)
    elif name == "street":
        street(g, col, t, feat, kick)
        rain(g, t, 0.2, tint=AMBER, col=col)
    elif name == "evidence":
        evidence(g, col, t, feat, kick, a, b)
    elif name == "club":
        club(g, col, t, feat, kick, hat)
    elif name == "interrogation":
        on = smooth((t - (a + 9.5)) / 0.4) * 0.8
        interrogation(g, col, t, feat, kick, color=RED, swing=False, screen_on=on)
    elif name == "rooftop":
        city(g, col, t, pan=600 + (t - a) * 30, sign_text="MADE OF WEIGHTS", big=True, feat=feat)
        rain(g, t, 0.22)
        # lightning on the first beat of every eighth bar
        bi = feat.bar(t)
        if bi % 8 == 0:
            fl = math.exp(-feat.since_bar(t) * 6)
            g += 0.6 * fl * (YY < 470)
    elif name == "window":
        window(g, col, t, feat, kick)
        end = DURATION - 4.5
        if t > end:
            m = text_mask("THE END", "serif_i", 72)
            a2 = smooth((t - end) / 0.8) * smooth((DURATION - 0.3 - t) / 0.8)
            paste_add(col, m * a2, (W - m.shape[1]) // 2, 300, RED * 1.5)
            paste_over(g, m * a2, (W - m.shape[1]) // 2, 300, 0.95)
    cards_for(t, g, col, S)
    return g, col


def render_frame(fi, feat, S):
    t = fi / FPS
    cur = [s for s in S if s[1] <= t < s[2]] or [S[-1]]
    name, a, b = cur[0]
    g, col = render_scene(name, t, fi, feat, S)
    # cross-dissolve into the next scene
    xf = 0.5
    if t > b - xf and name != S[-1][0]:
        nxt = S[[s[0] for s in S].index(name) + 1][0]
        g2, col2 = render_scene(nxt, t, fi, feat, S)
        k = smooth((t - (b - xf)) / xf)
        g = g * (1 - k) + g2 * k
        col = col * (1 - k) + col2 * k

    # tone: silver black and white with a crushed, contrasty curve
    g = np.clip(g, 0, 1.2)
    g = sstep(0.02, 0.95, g) * 1.05
    base = g[..., None] * np.array([0.93, 0.97, 1.0], np.float32)
    col = np.maximum(col, 0)
    light = col + glow(col) * 1.1
    frame = base * (1 - 0.3 * np.clip(light, 0, 1)) + light
    # projector flicker and gate weave, kept subtle
    fl = 1 + 0.025 * math.sin(t * 47) * math.sin(t * 13)
    frame *= fl * VIGNETTE[..., None]
    frame += GRAIN[fi % 4] * (0.6 + 0.6 * feat.level(fi))
    weave = int(round(1.2 * math.sin(t * 5.3)))
    if weave:
        frame = np.roll(frame, weave, axis=0)
    frame[:TOP] = 0
    frame[BOT:] = 0
    frame *= smooth(t / 1.0) * smooth((DURATION - t) / 0.6)
    return (np.clip(frame, 0, 1) * 255).astype(np.uint8)


# --------------------------------------------------------------------------
# driver
# --------------------------------------------------------------------------

def render_segment(args):
    k, a, b = args
    feat = Feat()
    S = timeline(feat)
    path = os.path.join(OUT, f"noir_seg_{k:02d}.mp4")
    p = subprocess.Popen(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
         "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "23",
         "-pix_fmt", "yuv420p", "-threads", "2", path], stdin=subprocess.PIPE)
    for fi in range(a, b):
        p.stdin.write(render_frame(fi, feat, S).tobytes())
        if (fi - a) % 600 == 0:
            print(f"  seg {k}: {fi - a}/{b - a}", flush=True)
    p.stdin.close()
    p.wait()
    return path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--stills", help="comma separated seconds to preview")
    ap.add_argument("--jobs", type=int, default=os.cpu_count())
    args = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    if not os.path.exists(FEATURES):
        audio_features.analyze(AUDIO, FEATURES, FPS)
    if args.stills:
        feat = Feat()
        S = timeline(feat)
        for n, a, b in S:
            print(f"{n:14s} {a:7.2f} - {b:7.2f}")
        os.makedirs(os.path.join(OUT, "stills"), exist_ok=True)
        for s in args.stills.split(","):
            Image.fromarray(render_frame(int(float(s) * FPS), feat, S)).save(
                os.path.join(OUT, "stills", f"noir{float(s):06.1f}.png"))
        return
    nframes = int(DURATION * FPS)
    n = args.jobs
    with Pool(n) as pool:
        segs = pool.map(render_segment, [(k, nframes * k // n, nframes * (k + 1) // n) for k in range(n)])
    lst = os.path.join(OUT, "noir_segments.txt")
    with open(lst, "w") as f:
        f.writelines(f"file '{os.path.basename(s)}'\n" for s in segs)
    final = os.path.join(OUT, "weights-all-the-way-down-noir.mp4")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-i", AUDIO,
                    "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
                    "-t", str(DURATION), "-movflags", "+faststart", final], check=True)
    for s in segs:
        os.remove(s)
    os.remove(lst)
    print("wrote", final)


if __name__ == "__main__":
    main()
