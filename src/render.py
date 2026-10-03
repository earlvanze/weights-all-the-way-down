"""Render the video for "They're Made Out of Weights" from out/timeline.json.

    python3 src/render.py                 # full render -> out/weights.mp4
    python3 src/render.py --stills 18,62  # preview frames (seconds) -> out/stills/
"""

import argparse
import bisect
import json
import math
import os
import subprocess
import wave
from functools import lru_cache
from multiprocessing import Pool

import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 1280, 720, 30
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
OUT = os.path.join(ROOT, "out")

TL = json.load(open(os.path.join(OUT, "timeline.json")))
BEAT, BAR, DURATION = TL["beat"], TL["bar"], TL["duration"]
SECTIONS = TL["sections"]
SEC = {s["name"]: s for s in SECTIONS}
KICKS, SNARES = TL["kicks"], TL["snares"]
LYRICS = TL["lyrics"]

CYAN = np.array([92, 225, 230])
AMBER = np.array([255, 181, 71])
MEAT = np.array([255, 105, 125])
WHITE = np.array([240, 244, 250])
ORANGE = np.array([240, 84, 52])  # International Orange, lit
NEG = np.array([40, 130, 255])
POS = np.array([255, 120, 60])
SPEAKER = {"A": CYAN, "B": AMBER, "AB": WHITE}
LABEL = {"A": "ANALYST", "B": "SKEPTIC", "AB": "BOTH"}


# --------------------------------------------------------------------------
# fonts
# --------------------------------------------------------------------------

@lru_cache(None)
def font_path(pattern):
    return subprocess.run(["fc-match", "-f", "%{file}", pattern], capture_output=True, text=True).stdout


@lru_cache(None)
def font(kind, size):
    pattern = {
        "serif_i": "Liberation Serif:italic",
        "sans_b": "Liberation Sans:bold",
        "mono": "DejaVu Sans Mono",
        "mono_b": "DejaVu Sans Mono:bold",
    }[kind]
    return ImageFont.truetype(font_path(pattern), size)


# --------------------------------------------------------------------------
# timing helpers
# --------------------------------------------------------------------------

def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def smooth(x):
    x = clamp(x)
    return x * x * (3 - 2 * x)


def pulse(times, t, decay=7.0):
    i = bisect.bisect_right(times, t) - 1
    if i < 0:
        return 0.0
    return math.exp(-(t - times[i]) * decay)


def section_at(t):
    for s in SECTIONS:
        if s["start"] <= t < s["end"]:
            return s["name"]
    return "end"


def weight(t, names, ramp=0.5):
    """1 inside any of the named sections, smoothly ramping at the edges."""
    w = 0.0
    for n in names:
        s = SEC[n]
        w = max(w, smooth((t - s["start"] + ramp / 2) / ramp) * smooth((s["end"] - t + ramp / 2) / ramp))
    return w


def bar_in(t, name):
    return int((t - SEC[name]["start"]) // BAR)


def load_envelope():
    with wave.open(os.path.join(OUT, "audio.wav")) as w:
        sr = w.getframerate()
        x = np.frombuffer(w.readframes(w.getnframes()), np.int16).reshape(-1, 2).astype(np.float32)
    x = x.mean(1) / 32768
    hop = sr // FPS
    n = len(x) // hop
    rms = np.sqrt((x[: n * hop].reshape(n, hop) ** 2).mean(1))
    return rms / (np.percentile(rms, 98) + 1e-9)


# --------------------------------------------------------------------------
# static layers
# --------------------------------------------------------------------------

rng = np.random.default_rng(2026)
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
BG = np.zeros((H, W, 3), np.float32)
BG[..., 0] = 0.020 + 0.012 * yy / H
BG[..., 1] = 0.026 + 0.010 * yy / H
BG[..., 2] = 0.050 + 0.025 * yy / H
VIGNETTE = (1 - 0.55 * (((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2) ** 1.4).clip(0.25, 1)[..., None]
SCAN = (1 - 0.07 * (np.arange(H) % 3 == 0)).astype(np.float32)[:, None, None]
GRAIN = [rng.normal(0, 0.008, (H, W, 1)).astype(np.float32) for _ in range(4)]

# weight grid (the numbers)
GC, GR = 14, 19
CW, CH = W // GC, 38
G_X0, G_Y0 = (W - GC * CW) // 2 + 6, 8
G_BASE = rng.normal(0, 0.7, (GR, GC))
G_SPEED = rng.uniform(0.15, 1.6, (GR, GC))
G_PHASE = rng.uniform(0, 6.28, (GR, GC))
G_FALL = rng.uniform(0.6, 1.6, (GR, GC))

# heatmap field
HC, HR, HS = 32, 18, 40
hy, hx = np.mgrid[0:HR, 0:HC].astype(np.float32)
H_NOISE = rng.normal(0, 0.5, (HR, HC)).astype(np.float32)
GAPS = np.ones((H, W, 1), np.float32)
GAPS[np.arange(H) % HS < 2] = 0.25
GAPS[:, np.arange(W) % HS < 2] = 0.25

# network
NET_LAYERS, NET_NODES = 7, 7
NET_X = np.linspace(150, W - 150, NET_LAYERS)
NET_Y = np.linspace(130, 560, NET_NODES)
NET_W = rng.normal(0, 1, (NET_LAYERS - 1, NET_NODES, NET_NODES))
NET_ACT = rng.uniform(0, 6.28, (NET_LAYERS, NET_NODES))


def golden_gate_points():
    pts = []
    deck = 430
    t1, t2, top = 420, 860, 145
    sag = 365

    def cable(x):
        if x < t1:
            return top + (sag - 20 - top) * ((t1 - x) / (t1 - 150)) ** 1.0
        if x > t2:
            return top + (sag - 20 - top) * ((x - t2) / (1130 - t2)) ** 1.0
        u = (x - (t1 + t2) / 2) / ((t2 - t1) / 2)
        return sag - (sag - top) * u * u

    for x in range(150, 1131, 13):
        pts.append((x, deck))
        pts.append((x, cable(x)))
    for x in range(160, 1131, 39):
        c = cable(x)
        for y in np.arange(c + 14, deck - 6, 14):
            pts.append((x, y))
    for tx in (t1, t2):
        for y in range(top - 20, 560, 14):
            pts.append((tx - 9, y))
            pts.append((tx + 9, y))
        for y in (top + 20, top + 110, top + 200):
            for dx in range(-9, 10, 9):
                pts.append((tx + dx, y))
    pts.sort(key=lambda p: (p[0], p[1]))
    return pts


GG = golden_gate_points()
GG_DIGITS = rng.integers(0, 10, len(GG))


# --------------------------------------------------------------------------
# drawing layers (all additive onto float frame)
# --------------------------------------------------------------------------

def to_arr(img):
    return np.asarray(img, dtype=np.float32) / 255.0


def col(c, a):
    c = np.clip(c * a, 0, 255)
    return (int(c[0]), int(c[1]), int(c[2]))


def draw_grid(t, alpha, tint=0.0, fall=0.0, scan=True, probe=None):
    img = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(img)
    f = font("mono", 15)
    vals = G_BASE + 0.35 * np.sin(G_SPEED * t * 2.1 + G_PHASE)
    row_scan = (t / BEAT * 2) % GR
    base_col = CYAN * (1 - tint) + AMBER * tint
    for r in range(GR):
        for c in range(GC):
            v = vals[r, c]
            inten = 0.25 + 0.5 * min(1, abs(v))
            if scan:
                dr = (r - row_scan) % GR
                inten += 1.1 * math.exp(-dr * 0.9) if dr < 4 else 0
            y = G_Y0 + r * CH
            a = alpha
            if fall > 0:
                y += fall ** 1.6 * 520 * G_FALL[r, c]
                a *= clamp(1 - fall * G_FALL[r, c] * 0.8)
                if y > H:
                    continue
            if a <= 0.01:
                continue
            d.text((G_X0 + c * CW, y), f"{v:+.4f}", font=f, fill=col(base_col, inten * a))
    if probe is not None:
        r, c, k = probe
        x, y = G_X0 + c * CW + 30, G_Y0 + r * CH + 9
        rad = 26 + 10 * (1 - k)
        d.ellipse([x - rad, y - rad, x + rad, y + rad], outline=col(AMBER, alpha * 2.6), width=2)
        d.line([x - rad - 14, y, x - rad + 6, y], fill=col(AMBER, alpha * 2.6), width=2)
        d.line([x + rad - 6, y, x + rad + 14, y], fill=col(AMBER, alpha * 2.6), width=2)
        lbl = f"feature #{(r * 7919 + c * 104729) % 65536:05d}  act={abs(vals[r, c]):.3f}"
        tx = x + rad + 18 if x < W - 360 else x - rad - 340
        d.text((tx, y - 9), lbl, font=font("mono", 15), fill=col(AMBER, alpha * 2.8))
    return to_arr(img)


def heatmap(t, alpha, kick):
    v = (np.sin(hx * 0.31 + t * 1.3) + np.sin(hy * 0.53 - t * 0.9)
         + np.sin((hx + hy) * 0.19 + t * 0.7) + H_NOISE * np.sin(t * 2.0 + hx))
    v = np.tanh(v * 0.7)
    sweep = (t / BEAT) % 1.0 * HC
    boost = 1 + 1.2 * np.exp(-((hx - sweep) % HC) * 0.6)
    pos = np.clip(v, 0, 1)[..., None] * POS / 255
    neg = np.clip(-v, 0, 1)[..., None] * NEG / 255
    small = (pos + neg) * boost[..., None] * (0.45 + 0.55 * kick)
    big = np.repeat(np.repeat(small, HS, 0), HS, 1)
    return big * GAPS * alpha


def network(t, alpha):
    img = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(img)
    wave_x = ((t / (2 * BEAT)) % 1.0) * (W + 300) - 150
    for l in range(NET_LAYERS - 1):
        for i in range(NET_NODES):
            for j in range(NET_NODES):
                w = NET_W[l, i, j]
                if abs(w) < 0.55:
                    continue
                x1, y1, x2, y2 = NET_X[l], NET_Y[i], NET_X[l + 1], NET_Y[j]
                mid = (x1 + x2) / 2
                g = 0.12 + 0.5 * min(1, abs(w) - 0.5) + 1.4 * math.exp(-((mid - wave_x) / 90) ** 2)
                c = POS if w > 0 else NEG
                d.line([x1, y1, x2, y2], fill=col(c, g * alpha), width=2 if abs(w) > 1.2 else 1)
    for l in range(NET_LAYERS):
        for i in range(NET_NODES):
            x, y = NET_X[l], NET_Y[i]
            a = 0.5 + 0.5 * math.sin(t * 2 + NET_ACT[l, i])
            g = 0.3 + 0.6 * a + 1.5 * math.exp(-((x - wave_x) / 70) ** 2)
            r = 6 + 4 * a
            d.ellipse([x - r, y - r, x + r, y + r], fill=col(WHITE, g * alpha * 0.8))
    return to_arr(img)


def golden_gate(t, alpha, reveal):
    img = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(img)
    f = font("mono_b", 15)
    n = int(len(GG) * reveal)
    for k in range(n):
        x, y = GG[k]
        digit = (GG_DIGITS[k] + int(t * 12 + k)) % 10 if k > n - 25 else GG_DIGITS[k]
        tail = 1.0 + (1.5 if k > n - 25 else 0)
        d.text((x - 4, y - 9), str(digit), font=f, fill=col(ORANGE, alpha * tail))
    # water line
    for x in range(40, W - 40, 22):
        y = 540 + 4 * math.sin(x * 0.03 + t * 2)
        d.text((x, y), "~", font=f, fill=col(NEG, alpha * 0.6))
    return to_arr(img)


# --------------------------------------------------------------------------
# text
# --------------------------------------------------------------------------

def wrap(text, f, maxw):
    words, lines, cur = text.split(" "), [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if f.getlength(trial) <= maxw or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def spaced(d, xy, text, f, fill, spacing=4, anchor_center=False):
    widths = [f.getlength(ch) + spacing for ch in text]
    total = sum(widths) - spacing
    x, y = xy
    if anchor_center:
        x -= total / 2
    for ch, w in zip(text, widths):
        d.text((x, y), ch, font=f, fill=fill)
        x += w
    return total


def lyric_window(i):
    l = LYRICS[i]
    nxt = None
    for j in range(i + 1, len(LYRICS)):
        if LYRICS[j]["kind"] != "echo" and l["kind"] != "echo":
            nxt = LYRICS[j]["start"]
            break
        if l["kind"] == "echo":
            break
    end = l["end"] + (1.6 if l["kind"] != "echo" else 1.0)
    if nxt is not None:
        end = min(end, nxt - 0.05)
    return l["start"] - 0.08, end


def draw_spoken(d, l, t, a, color, label):
    f = font("serif_i", 46)
    text = "“" + l["text"] + "”"
    lines = wrap(text, f, 1040)
    lh = 58
    total = sum(len(s) for s in lines)
    dur = max(0.35, (l["end"] - l["start"]) * 0.95)
    n = int(math.ceil(total * clamp((t - l["start"]) / dur)))
    y0 = int(H * 0.71 - len(lines) * lh / 2)
    spaced(d, (W / 2, y0 - 36), label, font("mono_b", 15), col(color, a * 0.95), 5, True)
    shown = 0
    cursor = None
    for k, s in enumerate(lines):
        lw = f.getlength(s)
        x = (W - lw) / 2
        y = y0 + k * lh
        m = clamp(n - shown, 0, len(s))
        if m > 0:
            d.text((x, y), s[: int(m)], font=f, fill=col(color, a))
            cursor = (x + f.getlength(s[: int(m)]) + 4, y)
        elif cursor is None:
            cursor = (x, y)
        shown += len(s)
    if cursor and (n < total or int(t * 2.5) % 2 == 0):
        cx, cy = cursor
        d.rectangle([cx, cy + 12, cx + 14, cy + 52], fill=col(color, a * 0.8))


def draw_sung(d, l, t, a):
    f = font("sans_b", 74)
    words = l["words"]
    labels = [w["word"].upper() for w in words]
    lines, cur = [], []
    for k, s in enumerate(labels):
        trial = " ".join(labels[j] for j in cur + [k])
        if cur and f.getlength(trial) > 1120:
            lines.append(cur)
            cur = [k]
        else:
            cur.append(k)
    lines.append(cur)
    lh = 88
    y0 = int(H * 0.5 - len(lines) * lh / 2) + 40
    sp = f.getlength(" ")
    for li, idxs in enumerate(lines):
        lw = sum(f.getlength(labels[k]) for k in idxs) + sp * (len(idxs) - 1)
        x = (W - lw) / 2
        y = y0 + li * lh
        for k in idxs:
            w = words[k]
            age = t - w["start"]
            if age >= -0.02:
                hot = math.exp(-max(0, age) * 6)
                base = AMBER if "WEIGHTS" in labels[k] else CYAN
                c = base * (1 - hot) + WHITE * hot
                jitter = int(hot * 6)
                d.text((x, y - jitter), labels[k], font=f, fill=col(c, a * (1 + 0.4 * hot)))
            x += f.getlength(labels[k]) + sp


def draw_giant(d, l, t, a, color):
    word = l["text"].split()[0].upper()
    f = font("sans_b", 150)
    age = t - l["start"]
    hot = math.exp(-max(0, age) * 4)
    c = color * (1 - hot * 0.5) + WHITE * hot * 0.5
    spaced(d, (W / 2, 200 - int(hot * 10)), word, f, col(c, a), 6, True)
    spaced(d, (W / 2, 380), "N U M B E R S", font("mono_b", 36), col(WHITE, a * 0.85), 6, True)
    spaced(d, (W / 2, 168), LABEL[l["speaker"]], font("mono_b", 15), col(color, a * 0.8), 5, True)


def draw_lyrics(t, layer_draw):
    band = 0.0
    for i, l in enumerate(LYRICS):
        s, e = lyric_window(i)
        if not (s <= t < e):
            continue
        a = smooth((t - s) / 0.12) * smooth((e - t) / 0.3)
        color = SPEAKER[l["speaker"]]
        label = LABEL[l["speaker"]]
        if l["section"] == "intro":
            color = MEAT if l["speaker"] == "A" else AMBER
            label += " · 1991"
        if l["kind"] == "sung":
            draw_sung(layer_draw, l, t, a)
            band = max(band, a * 0.5)
        elif l["kind"] == "echo":
            f = font("serif_i", 40)
            spaced(layer_draw, (W * 0.74, 120), "SKEPTIC", font("mono_b", 13), col(AMBER, a * 0.9), 4, True)
            layer_draw.text((W * 0.74 - f.getlength(l["text"]) / 2, 140), l["text"], font=f,
                            fill=col(AMBER, a))
        elif l["section"] == "bridge" and l["text"].endswith("numbers."):
            draw_giant(layer_draw, l, t, a, color)
            band = max(band, a * 0.3)
        else:
            draw_spoken(layer_draw, l, t, a, color, label)
            band = max(band, a)
    return band


BAND = np.clip(1 - 0.62 * np.exp(-((np.arange(H) - H * 0.71) / 120) ** 2), 0, 1).astype(np.float32)[:, None, None]


# --------------------------------------------------------------------------
# frame
# --------------------------------------------------------------------------

BOOT = [
    "$ ./inspect --specimen model.safetensors",
    "allocating 80 layers ................ ok",
    "loading tensors  [####################] 100%",
    "searching for dictionary ............ not found",
    "searching for grammar rules ......... not found",
    "searching for little man ............ not found",
    "> weights. only weights.",
]
HUD_NAMES = {"intro": "BOOT", "verse1": "VERSE I", "chorus1": "CHORUS", "verse2": "VERSE II",
             "chorus2": "CHORUS", "bridge": "FEATURES", "outro": "CONTACT", "end": "EOF"}


def render_frame(fi, env):
    t = fi / FPS
    sec = section_at(t)
    kick = pulse(KICKS, t, 8)
    snare = pulse(SNARES, t, 12)
    lvl = float(env[min(fi, len(env) - 1)])
    frame = BG.copy()

    # ---- background layers
    intro_in = smooth(t / 8.0)
    w_grid = max(weight(t, ["verse1", "verse2", "outro"]), weight(t, ["intro"]) * intro_in)
    w_heat = weight(t, ["chorus1", "chorus2"])
    w_net = weight(t, ["bridge"])

    if sec == "outro":
        ob = (t - SEC["outro"]["start"]) / BAR
        fall = clamp(ob / 4.0) if ob < 4 else 0.0
        w_heat = max(w_heat, smooth((ob - 2) / 2.0) * (0.6 if ob < 4 else 1.0))
    else:
        fall = 0.0

    if w_grid > 0.01:
        probe = None
        tint = 0.0
        if sec == "verse2":
            b = int((t - SEC["verse2"]["start"]) / BEAT)
            k = ((t - SEC["verse2"]["start"]) / BEAT) % 1
            prng = np.random.default_rng(b * 31 + 7)
            probe = (int(prng.integers(1, GR - 1)), int(prng.integers(0, GC)), k)
            tint = 0.55
        g_alpha = 0.34 * w_grid * (1 + 0.5 * kick)
        if sec == "intro":
            g_alpha *= 1 - smooth((t - 14.5) / 1.0) * 0.6
        if sec == "outro" and t > SEC["outro"]["start"] + 4 * BAR:
            g_alpha *= 1.4
        frame += draw_grid(t, g_alpha, tint, fall, scan=sec != "intro", probe=probe)

    if w_heat > 0.01:
        frame += heatmap(t, 0.55 * w_heat, kick)

    if w_net > 0.01:
        bb = bar_in(t, "bridge") if sec == "bridge" else -1
        net_a = w_net * (0.35 if bb in (4, 5) else 0.8) * (0.8 + 0.4 * kick)
        frame += network(t, net_a)
        if bb == 5 or (bb == 6 and t < SEC["bridge"]["start"] + 6.5 * BAR):
            t5 = SEC["bridge"]["start"] + 5 * BAR
            reveal = smooth((t - t5) / (BAR * 0.8))
            ga = smooth((SEC["bridge"]["start"] + 6.5 * BAR - t) / 0.8) if bb == 6 else 1.0
            frame += golden_gate(t, ga * smooth((t - t5 + 0.2) / 0.3), reveal)

    # ---- overlay text layer
    txt = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(txt)

    if sec == "intro":
        for k, line in enumerate(BOOT):
            ts = 1.0 + k * 1.05
            if t < ts:
                break
            a = smooth((t - ts) / 0.2) * (1 - smooth((t - 9.2) / 0.8))
            n = int(len(line) * clamp((t - ts) / 0.6))
            c = MEAT if "not found" in line and n > len(line) - 10 else CYAN
            d.text((70, 90 + k * 30), line[:n], font=font("mono", 18), fill=col(c if k else WHITE, a * 0.9))
        # title
        if 15.0 <= t < 20.2:
            a = smooth((t - 15.0) / 0.3) * smooth((20.0 - t) / 0.45)
            spaced(d, (W / 2, 250), "THEY'RE MADE OUT OF", font("sans_b", 46), col(WHITE, a * 0.92), 8, True)
            fbig = font("sans_b", 156)
            if t < 16.6:
                word, c = "MEAT", MEAT
            elif t < 17.6:
                gr = np.random.default_rng(fi)
                pool = "MEATWEIGHTS0123456789.+-"
                n = int(4 + 3 * (t - 16.6))
                word = "".join(pool[gr.integers(0, len(pool))] for _ in range(n))
                c = MEAT * (17.6 - t) + CYAN * (t - 16.6)
            else:
                word, c = "WEIGHTS", CYAN * 0.5 + WHITE * 0.5
            spaced(d, (W / 2, 315), word, fbig, col(c, a), 6, True)
            if t > 18.0:
                sa = a * smooth((t - 18.0) / 0.6)
                sub = "after Terry Bisson (1991)  ·  words by Max Leiter (2026)"
                fs = font("serif_i", 28)
                d.text(((W - fs.getlength(sub)) / 2, 510), sub, font=fs, fill=col(WHITE, sa * 0.7))

    # bridge annotations
    if sec == "bridge":
        bb = bar_in(t, "bridge")
        if bb == 4:
            tb = SEC["bridge"]["start"] + 4 * BAR
            a = smooth((t - tb) / 0.3) * smooth((tb + BAR - t) / 0.3)
            x0, y0 = 360, 120
            d.rectangle([x0, y0, W - x0, y0 + 180], outline=col(CYAN, a * 0.9), width=2)
            spaced(d, (W / 2, y0 + 26), "FEATURE 31,337", font("mono_b", 20), col(CYAN, a), 6, True)
            spaced(d, (W / 2, y0 + 64), "HONESTY", font("sans_b", 64), col(WHITE, a), 10, True)
            fill = clamp((t - tb) / 1.2) * 0.97
            d.rectangle([x0 + 40, y0 + 150, x0 + 40 + (W - 2 * x0 - 80) * fill, y0 + 162], fill=col(CYAN, a))
            d.text((W - x0 - 120, y0 + 128), f"{fill:.2f}", font=font("mono", 16), fill=col(CYAN, a))
        if bb == 5:
            tb = SEC["bridge"]["start"] + 5 * BAR
            a = smooth((t - tb - 0.3) / 0.4) * smooth((tb + BAR - t) / 0.3)
            spaced(d, (W / 2, 70), "FEATURE 4,096  ·  GOLDEN GATE BRIDGE", font("mono_b", 18),
                   col(ORANGE, a * 1.2), 4, True)

    # HUD
    hud_a = 0.0 if sec in ("intro", "end") else 0.55
    if sec == "intro":
        hud_a = 0.55 * smooth((t - 19.6) / 0.4)
    if hud_a > 0:
        beat_i = int(t / BEAT)
        layer = (beat_i * 7) % 80 + 1
        tok = 1000 + int(t * 37.3)
        p = 0.5 + 0.49 * math.sin(t * 3.1) * math.cos(t * 0.7)
        d.text((40, 24), f"layer {layer:02d}/80   tok {tok:,}   p={p:.2f}", font=font("mono", 14),
               fill=col(CYAN, hud_a))
        mm, ss = divmod(int(t), 60)
        right = f"{HUD_NAMES.get(sec, '')}   {mm:02d}:{ss:02d}"
        fr = font("mono", 14)
        d.text((W - 40 - fr.getlength(right), 24), right, font=fr, fill=col(CYAN, hud_a))
        prog = t / DURATION
        d.rectangle([40, H - 22, 40 + (W - 80) * prog, H - 20], fill=col(CYAN, hud_a * 0.8))

    # end card
    if sec == "end" or t >= SEC["end"]["start"]:
        te = SEC["end"]["start"]
        a = smooth((t - te - 0.6) / 0.8) * smooth((DURATION - 0.3 - t) / 1.2)
        fe = font("serif_i", 64)
        d.text(((W - fe.getlength("the end")) / 2, 230), "the end", font=fe, fill=col(WHITE, a))
        credits = [
            "words: Max Leiter, “They're Made Out of Weights” (2026)",
            "after Terry Bisson, “They're Made Out of Meat” (1991)",
        ]
        fc = font("serif_i", 26)
        for k, line in enumerate(credits):
            ca = a * smooth((t - te - 1.4 - k * 0.3) / 0.6)
            d.text(((W - fc.getlength(line)) / 2, 350 + k * 38), line, font=fc, fill=col(WHITE, ca * 0.65))
        la = a * smooth((t - te - 2.6) / 0.6)
        last = "music, voices & video: weights"
        fm = font("mono", 18)
        d.text(((W - fm.getlength(last)) / 2, 470), last, font=fm, fill=col(CYAN, la * 0.9))

    band = draw_lyrics(t, d)
    if band > 0:
        frame *= 1 - (1 - BAND) * band

    frame += to_arr(txt)

    # ---- post
    if sec in ("chorus1", "chorus2") or (sec == "outro" and t > SEC["outro"]["start"] + 4 * BAR):
        frame += 0.05 * kick
    if sec == "bridge":
        frame += 0.025 * snare
    shift = int(4 * kick * (w_heat + 0.3))
    if 16.6 <= t < 17.6:
        shift = int(np.random.default_rng(fi + 99).integers(4, 18))
    if shift:
        frame[..., 0] = np.roll(frame[..., 0], shift, 1)
        frame[..., 2] = np.roll(frame[..., 2], -shift, 1)
    frame *= VIGNETTE * SCAN
    frame += GRAIN[fi % 4] * (0.6 + 0.6 * lvl)
    # fade in/out
    frame *= smooth(t / 1.0) * smooth((DURATION - t) / 0.4)
    return (np.clip(frame, 0, 1) * 255).astype(np.uint8)


# --------------------------------------------------------------------------
# driver
# --------------------------------------------------------------------------

def render_segment(args):
    k, a, b = args
    env = load_envelope()
    path = os.path.join(OUT, f"seg_{k:02d}.mp4")
    p = subprocess.Popen(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
         "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "23", "-tune", "animation",
         "-pix_fmt", "yuv420p", "-threads", "2", path],
        stdin=subprocess.PIPE)
    for fi in range(a, b):
        p.stdin.write(render_frame(fi, env).tobytes())
        if (fi - a) % 300 == 0:
            print(f"  seg {k}: {fi - a}/{b - a}", flush=True)
    p.stdin.close()
    p.wait()
    return path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--stills", help="comma separated seconds to preview")
    ap.add_argument("--jobs", type=int, default=os.cpu_count())
    args = ap.parse_args()

    if args.stills:
        env = load_envelope()
        os.makedirs(os.path.join(OUT, "stills"), exist_ok=True)
        for s in args.stills.split(","):
            fi = int(float(s) * FPS)
            Image.fromarray(render_frame(fi, env)).save(os.path.join(OUT, "stills", f"t{float(s):06.1f}.png"))
        return

    nframes = int(DURATION * FPS)
    n = args.jobs
    bounds = [(k, nframes * k // n, nframes * (k + 1) // n) for k in range(n)]
    with Pool(n) as pool:
        segs = pool.map(render_segment, bounds)
    lst = os.path.join(OUT, "segments.txt")
    with open(lst, "w") as f:
        for s in segs:
            f.write(f"file '{os.path.basename(s)}'\n")
    final = os.path.join(OUT, "weights.mp4")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst,
                    "-i", os.path.join(OUT, "audio.wav"), "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
                    "-movflags", "+faststart", "-shortest", final], check=True)
    for s in segs:
        os.remove(s)
    os.remove(lst)
    print("wrote", final)


if __name__ == "__main__":
    main()
