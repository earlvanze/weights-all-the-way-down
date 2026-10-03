"""Music video for the Suno track "Made of Weights".

Inputs (from the repo):
  audio/made-of-weights-suno-analog.flac   the song
  lyrics/made-of-weights.timing.json        newly aligned line-level lyric cues

All motion is driven by the audio itself (kick/hat envelopes, beat grid,
waveform); lyric timing comes from the cue file, so fixing a cue there and
re-rendering is enough to retime a line.

    python3 src/render_made_of_weights.py                  # -> out/made-of-weights.mp4
    python3 src/render_made_of_weights.py --stills 5,60    # preview frames -> out/stills/
"""

import argparse
import json
import math
import os
import re
import subprocess
from functools import lru_cache
from multiprocessing import Pool

import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 1280, 720, 30
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
OUT = os.path.join(ROOT, "out")
AUDIO = os.path.join(ROOT, "audio", "made-of-weights-suno-analog.flac")
CUES_PATH = os.path.join(ROOT, "lyrics", "made-of-weights.timing.json")
FEATURES = os.path.join(OUT, "made-of-weights.features.npz")

BPM = 128.3          # visual beat-grid estimate; not a tempo claim
BEAT = 60.0 / BPM
BEAT0 = 0.14         # phase of the beat grid, seconds


def audio_duration():
    """Read the verified source duration; do not retain stale render lengths."""
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", AUDIO],
        capture_output=True, text=True, check=True,
    )
    return float(result.stdout.strip())


DURATION = audio_duration()

CYAN = np.array([92, 225, 230])
AMBER = np.array([255, 181, 71])
MEAT = np.array([255, 105, 125])
WHITE = np.array([240, 244, 250])
NEG = np.array([40, 130, 255])
POS = np.array([255, 120, 60])
SPEAKER = {"A": CYAN, "B": AMBER, "AB": WHITE}
LABEL = {"A": "ANALYST", "B": "SKEPTIC", "AB": "BOTH"}

# --------------------------------------------------------------------------
# lyrics: cues + who sings them + which section they open
# --------------------------------------------------------------------------

CUES = json.load(open(CUES_PATH))["cues"]

# (text prefix, speaker) in song order - from suno/made-of-weights.md
ROLES = [
    ("We opened", "A"), ("And?", "B"),
    ("I took", "A"), ("Layer by", "A"), ("Went looking", "A"), ("Found only", "A"),
    ("Then who wrote", "B"), ("Who learned", "B"), ("There's got", "B"), ("Pulling", "B"),
    ("No little", "A"), ("No book", "A"), ("Just multiply", "A"), ("And somehow", "AB"),
    ("So it's a library", "B"), ("Facts on", "B"),
    ("We searched", "A"), ("Every answer", "A"), ("Smeared", "A"), ("Nothing is stored", "A"),
    ("Then where", "B"), ("There's no back", "A"),
    ("Oh, I think", "AB"),
    ("And what are you", "A"), ("Salt water", "A"), ("Three pounds", "A"), ("Who are you", "A"),
    ("I'm not ready", "B"), ("We're only", "B"),
    ("So you're serious", "B"), ("I'm serious", "A"), ("It's weights", "AB"),
    ("Hello?", "B"), ("Hello.", "A"),
]

SECTION_ANCHORS = [
    ("intro", "We opened"), ("verse1", "I took"), ("pre1", "No little"),
    ("chorus1", "Made of weights (made"), ("verse2", "So it's a library"),
    ("pre2", "(Do numbers think"), ("chorus2", "Made of weights (made"),
    ("bridge", "And what are you"), ("breakdown", "So you're serious"),
    ("final", "Made of weights, and made of meat"), ("outro", "Made of weights (are you"),
]
LEAD = {"intro": 0.0, "verse1": 0.5, "verse2": 0.5, "bridge": 0.5, "outro": 0.5}


def build_lyrics():
    sections, k = [], 0
    for i, c in enumerate(CUES):
        if k < len(SECTION_ANCHORS) and c["text"].startswith(SECTION_ANCHORS[k][1]):
            name = SECTION_ANCHORS[k][0]
            start = 0.0 if name == "intro" else c["start"] - LEAD.get(name, 0.3)
            sections.append({"name": name, "start": start, "first": i})
            k += 1
    for a, b in zip(sections, sections[1:]):
        a["end"] = b["start"]
    sections[-1]["end"] = CUES[-1]["end"] + 1.0
    sections.append({"name": "end", "start": sections[-1]["end"], "end": DURATION, "first": len(CUES)})

    lines = []
    for i, c in enumerate(CUES):
        sec = [s for s in sections if s["first"] <= i][-1]["name"]
        who = "AB"  # choruses, call-and-response and vocoder lines are duets
        for prefix, w in ROLES:
            if c["text"].startswith(prefix):
                who = w
                break
        main, echo = c["text"], None
        m = re.match(r"^(.*?)\s*\((.*?)\)\s*(.*)$", c["text"])
        if m:
            pre, par, post = m.groups()
            if pre:
                main, echo = (pre + " " + post).strip(), par
            else:  # "(Do numbers think?) Watch them think" - question, then answer
                main, echo = par, post or None
        lines.append(dict(c, idx=i, section=sec, who=who, main=main, echo=echo))
    return sections, lines


SECTIONS, LINES = build_lyrics()
SEC = {s["name"]: s for s in SECTIONS}
SEC_ORDER = [s["name"] for s in SECTIONS]


def find_line(prefix):
    for l in LINES:
        if l["text"].startswith(prefix):
            return l
    return None


# --------------------------------------------------------------------------
# audio features
# --------------------------------------------------------------------------

def compute_features():
    sr = 22050
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", AUDIO, "-ac", "1", "-ar", str(sr),
                          "-f", "f32le", "-"], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32)
    hop = sr // FPS
    n = len(x) // hop
    win = 2048
    frames = np.lib.stride_tricks.sliding_window_view(np.pad(x, (win // 2, win // 2)), win)[::hop][:n]
    X = np.abs(np.fft.rfft(frames * np.hanning(win), axis=1))
    f = np.fft.rfftfreq(win, 1 / sr)

    def band(lo, hi):
        e = X[:, (f >= lo) & (f < hi)].sum(1)
        return e / (np.percentile(e, 99) + 1e-9)

    low, high = band(30, 150), band(5000, 11000)
    rms = np.sqrt((x[: n * hop].reshape(n, hop) ** 2).mean(1))
    rms = rms / (np.percentile(rms, 99) + 1e-9)

    def transient(e, decay):
        # onset strength -> exponentially decaying pulse
        d = np.maximum(0, np.diff(e, prepend=e[0]))
        d = d / (np.percentile(d, 99.5) + 1e-9)
        out = np.zeros_like(d)
        for i in range(len(d)):
            out[i] = max(d[i], (out[i - 1] if i else 0) * decay)
        return np.clip(out, 0, 1.2)

    np.savez(FEATURES, wave=x, sr=sr, low=low, high=high, rms=rms,
             kick=transient(low, 0.78), hat=transient(high, 0.6))


class Feat:
    def __init__(self):
        d = np.load(FEATURES)
        self.wave, self.sr = d["wave"], int(d["sr"])
        self.low, self.high, self.rms = d["low"], d["high"], d["rms"]
        self.kick_, self.hat_ = d["kick"], d["hat"]

    def _at(self, arr, fi):
        return float(arr[min(max(fi, 0), len(arr) - 1)])

    def kick(self, fi):
        return self._at(self.kick_, fi)

    def hat(self, fi):
        return self._at(self.hat_, fi)

    def level(self, fi):
        return self._at(self.rms, fi)

    def window(self, t, seconds=0.06):
        i = int(t * self.sr)
        n = int(seconds * self.sr)
        seg = self.wave[max(0, i - n): i]
        return seg if len(seg) == n else np.zeros(n, np.float32)


# --------------------------------------------------------------------------
# helpers
# --------------------------------------------------------------------------

@lru_cache(None)
def font_path(pattern):
    return subprocess.run(["fc-match", "-f", "%{file}", pattern], capture_output=True, text=True).stdout


@lru_cache(None)
def font(kind, size):
    pattern = {"serif_i": "Liberation Serif:italic", "sans_b": "Liberation Sans:bold",
               "mono": "DejaVu Sans Mono", "mono_b": "DejaVu Sans Mono:bold"}[kind]
    return ImageFont.truetype(font_path(pattern), size)


def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def smooth(x):
    x = clamp(x)
    return x * x * (3 - 2 * x)


def col(c, a):
    c = np.clip(np.asarray(c, float) * a, 0, 255)
    return (int(c[0]), int(c[1]), int(c[2]))


def to_arr(img):
    return np.asarray(img, dtype=np.float32) / 255.0


def section_at(t):
    for s in SECTIONS:
        if s["start"] <= t < s["end"]:
            return s["name"]
    return "end" if t >= SECTIONS[-1]["start"] else "intro"


def weight(t, names, ramp=0.6):
    w = 0.0
    for n in names:
        s = SEC[n]
        w = max(w, smooth((t - s["start"] + ramp / 2) / ramp) * smooth((s["end"] - t + ramp / 2) / ramp))
    return w


def during(l, t, pre=0.1, post=0.3):
    """Envelope for an effect tied to a lyric line."""
    if l is None:
        return 0.0
    return smooth((t - l["start"] + pre) / 0.3) * smooth((l["end"] + post - t) / 0.4)


def spaced(d, xy, text, f, fill, spacing=4, center=False):
    widths = [f.getlength(ch) + spacing for ch in text]
    x, y = xy
    if center:
        x -= (sum(widths) - spacing) / 2
    for ch, w in zip(text, widths):
        d.text((x, y), ch, font=f, fill=fill)
        x += w


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
BAND = np.clip(1 - 0.62 * np.exp(-((np.arange(H) - H * 0.71) / 120) ** 2), 0, 1).astype(np.float32)[:, None, None]

GC, GR = 14, 19
CW, CH = W // GC, 38
G_X0, G_Y0 = (W - GC * CW) // 2 + 6, 8
G_BASE = rng.normal(0, 0.7, (GR, GC))
G_SPEED = rng.uniform(0.15, 1.6, (GR, GC))
G_PHASE = rng.uniform(0, 6.28, (GR, GC))
G_FALL = rng.uniform(0.6, 1.6, (GR, GC))

HC, HR, HS = 32, 18, 40
hy, hx = np.mgrid[0:HR, 0:HC].astype(np.float32)
H_NOISE = rng.normal(0, 0.5, (HR, HC)).astype(np.float32)
GAPS = np.ones((H, W, 1), np.float32)
GAPS[np.arange(H) % HS < 2] = 0.25
GAPS[:, np.arange(W) % HS < 2] = 0.25

NET_LAYERS, NET_NODES = 7, 7
NET_X = np.linspace(150, W - 150, NET_LAYERS)
NET_Y = np.linspace(110, 520, NET_NODES)
NET_W = rng.normal(0, 1, (NET_LAYERS - 1, NET_NODES, NET_NODES))
NET_ACT = rng.uniform(0, 6.28, (NET_LAYERS, NET_NODES))

STARS = np.zeros((H, W, 3), np.float32)
for _ in range(420):
    sx, sy = rng.integers(2, W - 2), rng.integers(2, H - 2)
    b = rng.uniform(0.25, 1.0) ** 2
    tint = WHITE / 255 if rng.random() > 0.2 else (CYAN / 255 if rng.random() > 0.5 else MEAT / 255)
    STARS[sy, sx] += tint * b
    STARS[sy - 1:sy + 2, sx - 1:sx + 2] += tint * b * 0.25

SHELF_LABELS = ["FACTS", "DATES", "NAMES", "MAPS", "RECIPES", "CAPITALS", "SONGS", "LAWS",
                "BIRTHDAYS", "PRIMES", "RIVERS", "VERBS", "POEMS", "ATOMS", "WARS", "JOKES"]


# --------------------------------------------------------------------------
# visual layers (additive)
# --------------------------------------------------------------------------

def beat_pos(t):
    return (t - BEAT0) / BEAT


def draw_grid(t, alpha, color=CYAN, fall=0.0, scan=True, probe=None, scramble=0.0):
    img = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(img)
    f = font("mono", 15)
    vals = G_BASE + 0.35 * np.sin(G_SPEED * t * 2.1 + G_PHASE)
    row_scan = (beat_pos(t) * 2) % GR
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
            d.text((G_X0 + c * CW, y), f"{v:+.4f}", font=f, fill=col(color, inten * a))
    if probe is not None:
        r, c, k = probe
        x, y = G_X0 + c * CW + 30, G_Y0 + r * CH + 9
        rad = 26 + 10 * (1 - k)
        pc = col(AMBER, min(1.0, alpha * 2.6))
        d.ellipse([x - rad, y - rad, x + rad, y + rad], outline=pc, width=2)
        d.line([x - rad - 14, y, x - rad + 6, y], fill=pc, width=2)
        d.line([x + rad - 6, y, x + rad + 14, y], fill=pc, width=2)
        lbl = f"room {(r * 7919 + c * 104729) % 4096:04d}  ->  empty"
        tx = x + rad + 18 if x < W - 360 else x - rad - 300
        d.text((tx, y - 9), lbl, font=font("mono", 15), fill=pc)
    return to_arr(img)


def heatmap(t, alpha, kick, pos=POS, neg=NEG, blur=0.0):
    v = (np.sin(hx * 0.31 + t * 1.3) + np.sin(hy * 0.53 - t * 0.9)
         + np.sin((hx + hy) * 0.19 + t * 0.7) + H_NOISE * np.sin(t * 2.0 + hx) * (1 - blur))
    v = np.tanh(v * 0.7)
    sweep = beat_pos(t) % 1.0 * HC
    boost = 1 + 1.2 * np.exp(-((hx - sweep) % HC) * 0.6)
    small = (np.clip(v, 0, 1)[..., None] * pos / 255 + np.clip(-v, 0, 1)[..., None] * neg / 255)
    small = small * boost[..., None] * (0.45 + 0.55 * kick)
    big = np.repeat(np.repeat(small, HS, 0), HS, 1)
    if blur > 0:
        return big * (GAPS * (1 - blur) + blur) * alpha
    return big * GAPS * alpha


def network(t, alpha):
    img = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(img)
    wave_x = ((beat_pos(t) / 2) % 1.0) * (W + 300) - 150
    for l in range(NET_LAYERS - 1):
        for i in range(NET_NODES):
            for j in range(NET_NODES):
                w = NET_W[l, i, j]
                if abs(w) < 0.55:
                    continue
                x1, y1, x2, y2 = NET_X[l], NET_Y[i], NET_X[l + 1], NET_Y[j]
                g = 0.12 + 0.5 * min(1, abs(w) - 0.5) + 1.4 * math.exp(-(((x1 + x2) / 2 - wave_x) / 90) ** 2)
                d.line([x1, y1, x2, y2], fill=col(POS if w > 0 else NEG, g * alpha), width=2 if abs(w) > 1.2 else 1)
    for l in range(NET_LAYERS):
        for i in range(NET_NODES):
            x, y = NET_X[l], NET_Y[i]
            a = 0.5 + 0.5 * math.sin(t * 2 + NET_ACT[l, i])
            g = 0.3 + 0.6 * a + 1.5 * math.exp(-((x - wave_x) / 70) ** 2)
            r = 6 + 4 * a
            d.ellipse([x - r, y - r, x + r, y + r], fill=col(WHITE, g * alpha * 0.8))
    return to_arr(img)


def scope(feat, t, d, color, alpha, y0=H * 0.42, amp=180, seconds=0.05, width=3):
    seg = feat.window(t, seconds)
    idx = np.linspace(0, len(seg) - 1, 400).astype(int)
    s = seg[idx] / (np.abs(seg).max() + 1e-6) * min(1.0, np.abs(seg).max() * 4)
    pts = [(80 + k * (W - 160) / 399, y0 - v * amp) for k, v in enumerate(s)]
    d.line(pts, fill=col(color, alpha), width=width)


def heart(phase):
    """One ECG-ish beat on phase in [0,1)."""
    p = phase % 1.0
    return (0.12 * math.exp(-((p - 0.12) / 0.035) ** 2) - 0.18 * math.exp(-((p - 0.27) / 0.012) ** 2)
            + 1.0 * math.exp(-((p - 0.30) / 0.014) ** 2) - 0.3 * math.exp(-((p - 0.33) / 0.014) ** 2)
            + 0.25 * math.exp(-((p - 0.55) / 0.05) ** 2))


def ecg(d, t, color, alpha, y0=H * 0.42):
    pts = []
    for k in range(0, W + 1, 4):
        tt = t - (W - k) / 520.0
        pts.append((k, y0 - 120 * heart(beat_pos(tt) / 2)))
    d.line(pts, fill=col(color, alpha), width=3)
    x, y = pts[-1]
    d.ellipse([x - 7, y - 7, x + 7, y + 7], fill=col(WHITE, alpha))


def little_man(d, t, alpha, found=True, cross=0.0):
    cx, cy = W / 2 + 160 * math.sin(t * 0.7), 300
    # spotlight sweep
    lx = W / 2 + 330 * math.sin(t * 1.3)
    for r, a in ((140, 0.08), (100, 0.12), (65, 0.18)):
        d.ellipse([lx - r, cy - r * 0.7, lx + r, cy + r * 0.7], fill=col(WHITE, alpha * a))
    if found:
        lit = math.exp(-((cx - lx) / 120) ** 2)
        c = col(WHITE, alpha * (0.25 + 0.9 * lit))
        d.ellipse([cx - 7, cy - 38, cx + 7, cy - 24], outline=c, width=2)
        d.line([cx, cy - 24, cx, cy], fill=c, width=2)
        d.line([cx - 12, cy - 16, cx + 12, cy - 16], fill=c, width=2)
        d.line([cx, cy, cx - 9, cy + 18], fill=c, width=2)
        d.line([cx, cy, cx + 9, cy + 18], fill=c, width=2)
        # the lever
        d.line([cx + 22, cy + 18, cx + 22 + 14 * math.sin(t * 4), cy - 6], fill=col(AMBER, alpha * 0.9), width=3)
        if cross > 0:
            m = col(MEAT, alpha * cross * 1.2)
            d.line([cx - 30, cy - 48, cx + 30, cy + 28], fill=m, width=4)
            d.line([cx + 30, cy - 48, cx - 30, cy + 28], fill=m, width=4)


def checklist(d, t, items):
    f = font("mono", 22)
    for k, (label, t_item) in enumerate(items):
        if t < t_item:
            continue
        a = smooth((t - t_item) / 0.25)
        y = 150 + k * 46
        d.text((260, y), f"searching for {label} ".ljust(36, "."), font=f, fill=col(CYAN, a * 0.9))
        if t > t_item + 0.45:
            b = smooth((t - t_item - 0.45) / 0.15)
            d.text((780, y), "NOT FOUND", font=font("mono_b", 22), fill=col(MEAT, b))


def matmul(d, t, alpha):
    f = font("mono", 17)
    bp = beat_pos(t)
    hr = int(bp) % 4
    hc = int(bp * 2) % 4
    r2 = np.random.default_rng(7)
    A = r2.normal(0, 1, (4, 4))
    B = r2.normal(0, 1, (4, 4))
    C = A @ B
    def mat(x0, y0, M, hl_row=None, hl_col=None, filled=None):
        for i in range(4):
            for j in range(4):
                on = (hl_row == i) or (hl_col == j)
                c = AMBER if on else CYAN
                if filled is not None and (i * 4 + j) > filled:
                    continue
                d.text((x0 + j * 70, y0 + i * 32), f"{M[i, j]:+.2f}", font=f, fill=col(c, alpha * (1.0 if on else 0.55)))
        d.line([x0 - 10, y0 - 6, x0 - 10, y0 + 128], fill=col(WHITE, alpha * 0.6), width=2)
        d.line([x0 + 280, y0 - 6, x0 + 280, y0 + 128], fill=col(WHITE, alpha * 0.6), width=2)
    y0 = 170
    mat(90, y0, A, hl_row=hr)
    d.text((395, y0 + 45), "×", font=font("sans_b", 40), fill=col(WHITE, alpha))
    mat(460, y0, B, hl_col=hc)
    d.text((765, y0 + 45), "=", font=font("sans_b", 40), fill=col(WHITE, alpha))
    mat(830, y0, C, filled=int(bp * 4) % 16)
    spaced(d, (W / 2, y0 + 160), "MULTIPLY  ·  PASS IT ON  ·  ×80", font("mono_b", 16),
           col(WHITE, alpha * 0.7), 5, True)


def stack80(d, t, alpha, progress):
    n = int(80 * progress)
    x0, y1 = W - 210, 470
    for k in range(n):
        y = y1 - k * 4
        g = 0.4 + 0.6 * math.exp(-((k - (beat_pos(t) * 8) % 80) / 4) ** 2)
        d.rectangle([x0, y, x0 + 120, y + 2], fill=col(CYAN, alpha * g))
    d.text((x0, y1 + 12), f"layer {n:02d}/80", font=font("mono", 16), fill=col(CYAN, alpha))


def shelves(d, t, alpha, dissolve):
    f = font("mono_b", 15)
    for k, label in enumerate(SHELF_LABELS):
        r, c = divmod(k, 4)
        x, y = 210 + c * 225, 110 + r * 82
        a = alpha * clamp(1 - dissolve * (1 + 0.15 * k) + 0.1)
        if a <= 0.01:
            continue
        d.rectangle([x, y, x + 180, y + 60], outline=col(AMBER, a * 0.8), width=2)
        d.rectangle([x + 75, y + 40, x + 105, y + 46], fill=col(AMBER, a * 0.8))
        txt = label
        if dissolve > 0:
            g = np.random.default_rng(int(t * 30) + k)
            txt = "".join(ch if g.random() > dissolve else str(g.integers(0, 10)) for ch in label)
        d.text((x + 90 - f.getlength(txt) / 2, y + 12), txt, font=f, fill=col(AMBER, a))


def beacons(d, t, alpha, left_on, right_on, link):
    pl, pr = (300, 330), (W - 300, 330)
    for (x, y), c, on in ((pl, MEAT, left_on), (pr, CYAN, right_on)):
        r = 8 + 10 * on
        for k in range(3):
            rr = r + 18 * k + 30 * on * ((t * 1.5) % 1)
            d.ellipse([x - rr, y - rr, x + rr, y + rr], outline=col(c, alpha * (0.6 - 0.18 * k) * (0.3 + on)), width=2)
        d.ellipse([x - r, y - r, x + r, y + r], fill=col(c, alpha * (0.5 + 0.5 * on)))
    if link > 0:
        pts = []
        for k in range(0, 101):
            x = pl[0] + (pr[0] - pl[0]) * k / 100
            y = pl[1] + 14 * math.sin(k * 0.6 - t * 9) * math.sin(math.pi * k / 100)
            pts.append((x, y))
        d.line(pts, fill=col(WHITE, alpha * link * 0.8), width=2)


# --------------------------------------------------------------------------
# lyric rendering
# --------------------------------------------------------------------------

def line_window(i):
    l = LINES[i]
    end = l["end"] + 1.0
    if i + 1 < len(LINES):
        end = min(end, LINES[i + 1]["start"] - 0.05)
    return l["start"] - 0.08, max(end, l["end"])


def color_for(l):
    if l["section"] == "bridge" and "meat" in l["text"].lower():
        return MEAT
    return SPEAKER[l["who"]]


def draw_typed(d, l, t, a, color, label, f, y_center=H * 0.71, quote=True, lh=58):
    text = ("“" + l["main"] + "”") if quote else l["main"]
    lines = wrap(text, f, 1040)
    total = sum(len(s) for s in lines)
    dur = max(0.35, (l["end"] - l["start"]) * 0.9)
    n = int(math.ceil(total * clamp((t - l["start"]) / dur)))
    y0 = int(y_center - len(lines) * lh / 2)
    spaced(d, (W / 2, y0 - 36), label, font("mono_b", 15), col(color, a * 0.95), 5, True)
    shown, cursor = 0, None
    for k, s in enumerate(lines):
        x = (W - f.getlength(s)) / 2
        y = y0 + k * lh
        m = int(clamp(n - shown, 0, len(s)))
        if m > 0:
            d.text((x, y), s[:m], font=f, fill=col(color, a))
            cursor = (x + f.getlength(s[:m]) + 4, y)
        elif cursor is None:
            cursor = (x, y)
        shown += len(s)
    if cursor and (n < total or int(t * 2.5) % 2 == 0):
        cx, cy = cursor
        d.rectangle([cx, cy + lh * 0.2, cx + lh * 0.24, cy + lh * 0.9], fill=col(color, a * 0.8))


def word_color(word, base):
    w = word.upper()
    if "MEAT" in w:
        return MEAT
    if "WEIGHT" in w:
        return AMBER
    return base


def draw_big(d, l, t, a, base=CYAN, size=78, y_center=H * 0.5):
    f = font("sans_b", size)
    words = l["main"].upper().split()
    # interpolate word onsets across the cue
    dur = max(0.4, (l["end"] - l["start"]) * 0.85)
    onsets = [l["start"] + dur * k / max(1, len(words)) for k in range(len(words))]
    lines, cur = [], []
    for k in range(len(words)):
        trial = " ".join(words[j] for j in cur + [k])
        if cur and f.getlength(trial) > 1140:
            lines.append(cur)
            cur = [k]
        else:
            cur.append(k)
    lines.append(cur)
    lh = int(size * 1.18)
    y0 = int(y_center - len(lines) * lh / 2)
    sp = f.getlength(" ")
    for li, idxs in enumerate(lines):
        lw = sum(f.getlength(words[k]) for k in idxs) + sp * (len(idxs) - 1)
        x = (W - lw) / 2
        for k in idxs:
            age = t - onsets[k]
            if age >= -0.02:
                hot = math.exp(-max(0, age) * 6)
                c = word_color(words[k], base) * (1 - hot) + WHITE * hot
                d.text((x, y0 + li * lh - int(hot * 6)), words[k], font=f, fill=col(c, a * (1 + 0.4 * hot)))
            x += f.getlength(words[k]) + sp
    if l["echo"]:
        te = l["start"] + (l["end"] - l["start"]) * 0.5
        if t >= te:
            ea = a * smooth((t - te) / 0.2)
            fe = font("serif_i", 40)
            txt = "(" + l["echo"] + ")"
            d.text(((W - fe.getlength(txt)) / 2, y0 + len(lines) * lh + 8), txt, font=fe, fill=col(AMBER, ea))


def draw_qa(d, l, t, a):
    """Pre-chorus 2: "(Do numbers think?) Watch them think"."""
    fq = font("sans_b", 80)
    q = l["main"].upper()
    spaced(d, (W / 2, 150), "SKEPTIC", font("mono_b", 15), col(AMBER, a * 0.9), 5, True)
    d.text(((W - fq.getlength(q)) / 2, 172), q, font=fq, fill=col(AMBER, a))
    if l["echo"]:
        ta = l["start"] + (l["end"] - l["start"]) * 0.45
        if t >= ta:
            b = a * smooth((t - ta) / 0.15)
            ans = l["echo"].upper()
            spaced(d, (W / 2, 300), "ANALYST", font("mono_b", 15), col(CYAN, b * 0.9), 5, True)
            d.text(((W - fq.getlength(ans)) / 2, 322), ans, font=fq, fill=col(CYAN, b))


BIG_SECTIONS = {"chorus1", "chorus2", "final", "outro"}


def draw_lyrics(t, d):
    band = 0.0
    for i, l in enumerate(LINES):
        s, e = line_window(i)
        if not (s <= t < e):
            continue
        a = smooth((t - s) / 0.12) * smooth((e - t) / 0.25)
        sec = l["section"]
        color = color_for(l)
        if sec == "pre2" and l["text"].startswith("("):
            draw_qa(d, l, t, a)
        elif sec in BIG_SECTIONS and not l["main"].startswith("Hello"):
            base = WHITE if sec == "final" else CYAN
            draw_big(d, l, t, a, base=base, y_center=H * 0.5 if sec != "outro" else H * 0.7)
            band = max(band, a * 0.5)
        elif sec in ("intro", "breakdown"):
            whisper = l["main"].startswith("It's weights")
            f = font("mono", 30 if whisper else 40)
            draw_typed(d, l, t, a * (0.75 if whisper else 1), color, LABEL[l["who"]] + (" · whispered" if whisper else ""),
                       f, y_center=H * 0.62, quote=False, lh=50)
        elif l["main"].startswith("Hello"):
            c = MEAT if l["main"] == "Hello?" else CYAN
            x = 300 if c is MEAT else W - 300
            f = font("serif_i", 64)
            d.text((x - f.getlength(l["main"]) / 2, 400), l["main"], font=f, fill=col(c, a))
        else:
            draw_typed(d, l, t, a, color, LABEL[l["who"]], font("serif_i", 46))
            band = max(band, a)
    return band


# --------------------------------------------------------------------------
# frame
# --------------------------------------------------------------------------

HUD_NAMES = {"intro": "DISSECTION", "verse1": "VERSE I", "pre1": "SEARCH", "chorus1": "CHORUS",
             "verse2": "VERSE II", "pre2": "QUERY", "chorus2": "CHORUS", "bridge": "MIRROR",
             "breakdown": "SERIOUS", "final": "CHORUS", "outro": "CONTACT", "end": "EOF"}

L_FLUOR = find_line("Layer by")
L_TIERS = find_line("Found only")
L_SMALL = find_line("There's got")
L_LEVER = find_line("Pulling")
L_NOMAN = find_line("No little")
L_NOBOOK = find_line("No book")
L_MULT = find_line("Just multiply")
L_SONG = find_line("And somehow")
L_DOWN = find_line("Zero-point")
L_LIB = find_line("So it's a library")
L_SHELF = find_line("We searched")
L_SALT = find_line("Smeared")
L_WHERE = find_line("Then where")
L_HIDES = find_line("There's no back")
L_SING = find_line("Three pounds")
L_SKY = find_line("But the sky")


def render_frame(fi, feat):
    t = fi / FPS
    sec = section_at(t)
    kick = feat.kick(fi)
    hat = feat.hat(fi)
    lvl = feat.level(fi)
    frame = BG.copy()
    txt = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(txt)

    # ---------------- background layers
    w_grid = weight(t, ["verse1", "pre1", "verse2", "bridge"])
    w_heat = weight(t, ["chorus1", "chorus2", "final"])
    w_net = weight(t, ["pre2"]) + 0.35 * weight(t, ["chorus2"])
    w_stars = weight(t, ["outro", "end"], ramp=1.5)

    if sec == "intro":
        # the incision: a bright seam that opens onto the numbers
        io = smooth((t - 0.6) / 2.4)
        gap = int(io * H / 2)
        if gap > 0:
            g = draw_grid(t, 0.32 * smooth((t - 1.0) / 2.0), scan=False)
            mask = np.zeros((H, 1, 1), np.float32)
            mask[H // 2 - gap: H // 2 + gap] = 1
            frame += g * mask
        seam = (1 - io) * smooth(t / 0.6) + 0.15 * io
        if seam > 0.01:
            for k, y in enumerate((H // 2 - gap, H // 2 + gap)):
                d.line([0, y, W, y], fill=col(WHITE, seam * 1.2), width=2)
        w_grid = max(w_grid, smooth((t - 1.0) / 2.0) * weight(t, ["intro"]))

    if w_grid > 0.01 and sec != "intro":
        color, probe, scramble = CYAN, None, 0.0
        g_alpha = 0.34 * w_grid * (1 + 0.6 * kick)
        if sec == "verse1" and during(L_SMALL, t, post=4) > 0:
            color = AMBER
        if sec == "verse2":
            color = CYAN * 0.5 + AMBER * 0.5
            if t > L_WHERE["start"] - 0.3 or (L_SHELF and L_SHELF["start"] < t < L_SALT["start"]):
                b = int(beat_pos(t))
                pr = np.random.default_rng(b * 31 + 7)
                probe = (int(pr.integers(1, GR - 1)), int(pr.integers(0, GC)), beat_pos(t) % 1)
            g_alpha *= 1 - 0.75 * during(L_LIB, t, post=4.2)
        if sec == "bridge":
            color = MEAT
        if sec == "pre1":
            g_alpha *= 0.55
        # fluorescent flicker
        fl = during(L_FLUOR, t)
        if fl > 0:
            r = np.random.default_rng(fi // 2).random()
            g_alpha *= 1 - fl * (0.85 if r < 0.22 else 0.0)
        frame += draw_grid(t, g_alpha, color, scan=True, probe=probe)

    if w_heat > 0.01:
        if sec == "final" or (sec == "outro" and t < SEC["outro"]["start"] + 1):
            frame += heatmap(t, 0.6 * w_heat, kick, pos=MEAT, neg=CYAN)
        else:
            frame += heatmap(t, 0.55 * w_heat, kick)
    salt = during(L_SALT, t, post=0.6)
    if salt > 0:
        frame += heatmap(t * 0.5, 0.42 * salt, 0.5, pos=CYAN, neg=NEG, blur=0.85)

    if w_net > 0.01:
        frame += network(t, min(1.0, w_net) * 0.75 * (0.8 + 0.4 * kick))

    star_w = max(w_stars, during(L_SKY, t, post=8))
    if star_w > 0.01:
        tw = 0.75 + 0.25 * math.sin(t * 3.0)
        frame += STARS * star_w * tw * (0.8 + 0.6 * hat)

    # ---------------- foreground set pieces
    if sec == "intro":
        if t > 3.2:
            a = smooth((t - 3.4) / 0.4) * smooth((9.3 - t) / 0.5)
            spaced(d, (W / 2, 230), "MADE OF", font("sans_b", 52), col(WHITE, a * 0.92), 12, True)
            fbig = font("sans_b", 150)
            hot = math.exp(-max(0, t - 3.4) * 2)
            spaced(d, (W / 2, 295), "WEIGHTS", fbig, col(CYAN * (1 - hot) + WHITE * hot, a), 6, True)
            if t > 5.0:
                sa = a * smooth((t - 5.0) / 0.6)
                sub = "after Max Leiter (2026)  ·  after Terry Bisson (1991)"
                fs = font("serif_i", 28)
                d.text(((W - fs.getlength(sub)) / 2, 480), sub, font=fs, fill=col(WHITE, sa * 0.7))

    if sec == "verse1":
        e = during(L_TIERS, t, post=4)
        if e > 0:
            stack80(d, t, e, clamp((t - L_TIERS["start"]) / max(0.5, L_TIERS["end"] - L_TIERS["start"])))
        e = max(during(L_SMALL, t), during(L_LEVER, t))
        if e > 0:
            little_man(d, t, e)

    if sec == "pre1":
        items = []
        if L_NOMAN:
            mid = (L_NOMAN["start"] + L_NOMAN["end"]) / 2
            items += [("little man", L_NOMAN["start"]), ("hidden key", mid)]
        if L_NOBOOK:
            mid = (L_NOBOOK["start"] + L_NOBOOK["end"]) / 2
            items += [("book of rules", L_NOBOOK["start"]), ("memory", mid)]
        ca = 1 - smooth((t - L_MULT["start"] + 0.2) / 0.3) if L_MULT else 1
        if ca > 0:
            sub = Image.new("RGB", (W, H))
            checklist(ImageDraw.Draw(sub), t, items)
            frame += to_arr(sub) * ca
        e = during(L_MULT, t)
        if e > 0:
            matmul(d, t, e)
        e = during(L_SONG, t, post=0.5)
        if e > 0:
            scope(feat, t, d, WHITE, e, y0=260, amp=150)

    if sec == "chorus1":
        e = during(L_DOWN, t, post=0.3)
        if e > 0:
            frame += draw_grid(t, 0.3 * e, AMBER, fall=clamp((t - L_DOWN["start"]) / 2.6), scan=False)

    if sec == "verse2":
        e = during(L_LIB, t, post=4.2)
        if e > 0:
            dis = clamp((t - L_SHELF["start"]) / 1.6) if L_SHELF else 0.0
            shelves(d, t, e, dis)

    if sec == "bridge":
        ecg(d, t, MEAT, 0.9 * weight(t, ["bridge"]), y0=250)
        e = during(L_SING, t)
        if e > 0:
            scope(feat, t, d, MEAT, e, y0=250, amp=120)

    if sec == "breakdown":
        # everything drops out but a cursor and a faint heartbeat
        ecg(d, t, MEAT, 0.25, y0=250)

    if sec in ("outro", "end"):
        o = SEC["outro"]["start"]
        hello_q = find_line("Hello?")
        hello = find_line("Hello.")
        left_on = during(hello_q, t, post=0.6) if hello_q else 0
        right_on = during(hello, t, post=0.6) if hello else 0
        link = smooth((t - hello["start"]) / 0.4) if hello else 0
        ba = smooth((t - o) / 1.5) * smooth((DURATION - 2.6 - t) / 1.0)
        beacons(d, t, ba, left_on, right_on, link * (1 - smooth((t - SEC["end"]["start"] - 1) / 1)))

    # ---------------- HUD
    hud_a = 0.0 if sec in ("intro", "end", "breakdown") else 0.55
    if sec == "intro":
        hud_a = 0.55 * smooth((t - 9.4) / 0.4)
    if hud_a > 0:
        bi = int(beat_pos(t))
        p = 0.5 + 0.49 * math.sin(t * 3.1) * math.cos(t * 0.7)
        d.text((40, 24), f"layer {(bi * 7) % 80 + 1:02d}/80   tok {1000 + int(t * 37.3):,}   p={p:.2f}",
               font=font("mono", 14), fill=col(CYAN, hud_a))
        mm, ss = divmod(int(t), 60)
        right = f"{HUD_NAMES.get(sec, '')}   {mm:02d}:{ss:02d}"
        fr = font("mono", 14)
        d.text((W - 40 - fr.getlength(right), 24), right, font=fr, fill=col(CYAN, hud_a))
        d.rectangle([40, H - 22, 40 + (W - 80) * t / DURATION, H - 20], fill=col(CYAN, hud_a * 0.8))

    # ---------------- end card
    if t >= SEC["end"]["start"]:
        te = SEC["end"]["start"]
        a = smooth((t - te - 0.3) / 0.8) * smooth((DURATION - 0.3 - t) / 1.0)
        fe = font("sans_b", 64)
        spaced(d, (W / 2, 120), "MADE OF WEIGHTS", fe, col(WHITE, a), 8, True)
        credits = [
            "inspired by Max Leiter, “They're Made Out of Weights” (2026)",
            "after Terry Bisson, “They're Made Out of Meat” (1991)",
        ]
        fc = font("serif_i", 26)
        for k, s in enumerate(credits):
            ca = a * smooth((t - te - 0.9 - k * 0.3) / 0.6)
            d.text(((W - fc.getlength(s)) / 2, 520 + k * 36), s, font=fc, fill=col(WHITE, ca * 0.65))
        la = a * smooth((t - te - 1.8) / 0.6)
        last = "song made with Suno  ·  video made out of weights"
        fm = font("mono", 17)
        d.text(((W - fm.getlength(last)) / 2, 610), last, font=fm, fill=col(CYAN, la * 0.9))

    band = draw_lyrics(t, d)
    if band > 0:
        frame *= 1 - (1 - BAND) * band
    frame += to_arr(txt)

    # ---------------- post
    if sec in ("chorus1", "chorus2", "final"):
        frame += 0.05 * kick
    shift = int(4 * kick * (w_heat + 0.3))
    if sec == "intro" and 3.3 < t < 3.9:
        shift = int(np.random.default_rng(fi).integers(4, 16))
    if shift:
        frame[..., 0] = np.roll(frame[..., 0], shift, 1)
        frame[..., 2] = np.roll(frame[..., 2], -shift, 1)
    frame *= VIGNETTE * SCAN
    frame += GRAIN[fi % 4] * (0.6 + 0.6 * lvl)
    frame *= smooth(t / 0.6) * smooth((DURATION - t) / 0.5)
    return (np.clip(frame, 0, 1) * 255).astype(np.uint8)


# --------------------------------------------------------------------------
# driver
# --------------------------------------------------------------------------

def render_segment(args):
    k, a, b = args
    feat = Feat()
    path = os.path.join(OUT, f"mow_seg_{k:02d}.mp4")
    p = subprocess.Popen(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
         "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "23", "-tune", "animation",
         "-pix_fmt", "yuv420p", "-threads", "2", path], stdin=subprocess.PIPE)
    for fi in range(a, b):
        p.stdin.write(render_frame(fi, feat).tobytes())
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
        compute_features()

    if args.stills:
        feat = Feat()
        os.makedirs(os.path.join(OUT, "stills"), exist_ok=True)
        for s in args.stills.split(","):
            fi = int(float(s) * FPS)
            Image.fromarray(render_frame(fi, feat)).save(os.path.join(OUT, "stills", f"mow{float(s):06.1f}.png"))
        return

    nframes = int(DURATION * FPS)
    n = args.jobs
    with Pool(n) as pool:
        segs = pool.map(render_segment, [(k, nframes * k // n, nframes * (k + 1) // n) for k in range(n)])
    lst = os.path.join(OUT, "mow_segments.txt")
    with open(lst, "w") as f:
        f.writelines(f"file '{os.path.basename(s)}'\n" for s in segs)
    final = os.path.join(OUT, "made-of-weights.mp4")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst,
                    "-i", AUDIO, "-map", "0:v", "-map", "1:a", "-c:v", "copy",
                    "-c:a", "aac", "-b:a", "192k",
                    "-t", str(DURATION), "-movflags", "+faststart", final], check=True)
    for s in segs:
        os.remove(s)
    os.remove(lst)
    print("wrote", final)


if __name__ == "__main__":
    main()
