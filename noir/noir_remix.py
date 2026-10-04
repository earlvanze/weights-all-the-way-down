"""Full-production remix of the neo-noir video (src/noir.py), cut to the 2026-10-04 take of "Weights All the Way Down".

Same world and set pieces as noir.py (black and white, only light has colour), but:
  * the audio is the delivered master with the voice edits (audio/ghB3gqhB8o7swEvF/*-master-voice-edit.wav, 223.6 s);
  * scenes are cut to this take's sections, 0.15 s before each section's first sung word (from the kinetic project's
    forced-aligned lyrics, kinetic/data/lyrics.json), with the jazz club returning for the instrumental break;
  * the intertitle cards are synced word by word: each word appears on its sung onset and burns in the scene's light while
    it is sung, and the underline runs to the word being sung;
  * delivery is native 2.39:1 at 1920x804 (no bars): the 1280x720 scenes' 2.39 band is upscaled (Lanczos), then film grain
    is added at full resolution.

    .venv/bin/python noir/noir_remix.py --stills 15,60,170   # preview frames -> noir/out/stills/
    .venv/bin/python noir/noir_remix.py                      # -> noir/out/weights-all-the-way-down-noir-remix.mp4
"""

import argparse
import json
import math
import os
import subprocess
from functools import lru_cache
from multiprocessing import Pool

import numpy as np
from PIL import Image

import noir as N
import audio_features  # noqa: E402  (on sys.path via noir)
from noir import AMBER, BOT, MAGENTA, RED, TEAL, TOP, H, W, FPS, clamp, font, paste_add, paste_over, smooth, sstep, text_mask

ROOT, OUT = N.REPO, N.OUT
AUDIO = os.path.join(ROOT, "audio", "ghB3gqhB8o7swEvF", "ghB3gqhB8o7swEvF-master-voice-edit.wav")
LYRICS = os.path.join(ROOT, "kinetic", "data", "lyrics.json")
FEATURES = os.path.join(OUT, "noir-remix.features.npz")
OW, OH = 1920, 804  # delivered frame (2.39:1)
DURATION = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1",
                                 AUDIO], capture_output=True, text=True, check=True).stdout)
GRAIN = [np.random.default_rng(300 + k).normal(0, 0.03, (OH, OW, 1)).astype(np.float32) for k in range(4)]


class Feat(N.Feat):
    def __init__(self):
        d = np.load(FEATURES)
        self.beats, self.downbeats = d["beats"], d["downbeats"]
        self.kick_, self.hat_, self.rms_ = d["kick"], d["hat"], d["rms"]


@lru_cache(None)
def lines():
    return json.load(open(LYRICS))["lines"]


def section_starts():
    out, prev = {}, None
    for l in lines():
        sec = l.get("section")
        if sec != prev:
            out.setdefault(sec, l["words"][0]["start"])
            prev = sec
    return out


def timeline():
    """(kind, start, end, options) — cut 0.15 s before each section's first sung word."""
    s = section_starts()
    cut = {k: v - 0.15 for k, v in s.items()}
    last_whisper = lines()[59]["words"][-1]["end"]  # the second "It's weights"
    marks = [
        ("city", 0.0, {}),
        ("office", cut["verse1"], {}),
        ("suspect", cut["pre1"], {}),
        ("street", cut["chorus1"], {}),
        ("evidence", cut["verse2"], {}),
        ("club", cut["pre2"], {}),
        ("window", cut["bridge1"], {"faces": True}),
        ("interrogation", cut["breakdown1"], {"screen": lines()[58]["words"][0]["start"]}),
        ("club", last_whisper + 0.1, {"instrumental": True}),
        ("rooftop", cut["final1"], {}),
        ("window", cut["outro1"], {"end": True}),
    ]
    return [(k, a, (marks[i + 1][1] if i + 1 < len(marks) else DURATION), o) for i, (k, a, o) in enumerate(marks)]


# ----------------------------------------------------------------------------- synced intertitles
CARD_Y = {"city": BOT - 80, "office": BOT - 80, "suspect": BOT - 80, "street": BOT - 80, "evidence": TOP + 30,
          "club": TOP + 30, "window": BOT - 100, "interrogation": BOT - 80, "rooftop": BOT - 90}
ACCENT = {"city": RED, "office": TEAL, "suspect": AMBER, "street": RED, "evidence": AMBER, "club": MAGENTA,
          "window": TEAL, "interrogation": RED, "rooftop": MAGENTA}


def line_card(g, col, t, i, kind):
    L = lines()
    l = L[i]
    ws = l["words"]
    nxt = L[i + 1]["words"][0]["start"] if i + 1 < len(L) else DURATION
    # gone before the next line's card arrives (it appears 0.12 s ahead of its first word)
    t0, t1 = ws[0]["start"] - 0.12, min(nxt - 0.14, ws[-1]["end"] + 2.2)
    if not (t0 <= t < t1):
        return
    a = smooth((t - t0) / 0.2) * smooth((t1 - t) / min(0.3, max(0.08, (t1 - t0) / 3)))
    if a <= 0:
        return
    accent = ACCENT[kind]
    text = l["text"]
    hello = text.lower().startswith("hello")
    size = 46 if hello else 40
    f = font("serif_i", size)
    while f.getlength(text) > 1080 and size > 24:
        size -= 2
        f = font("serif_i", size)
    width = f.getlength(text)
    if hello:
        cx = 540 if text.endswith("?") else W - 540
        accent = AMBER if text.endswith("?") else TEAL
    else:
        cx = W / 2
    x0 = int(cx - width / 2)
    y = int(CARD_Y[kind] - 6 * (1 - smooth((t - t0) / 0.4)))
    mh = int(size * 1.35)
    shadow = np.zeros((mh + 40, int(width) + 88), np.float32)
    shadow[20:-20, 44:-44] = 1
    shadow = N.box_blur(shadow, 14) * 0.75 * a
    paste_over(g, shadow, x0 - 44, y - 20, 0.0)
    paste_over(col, shadow, x0 - 44, y - 20, np.zeros(3, np.float32))
    # words appear on their onsets; the sung word burns in the scene's light
    pos = 0
    tokens = text.split(" ")
    run_end = x0
    for k, tok in enumerate(tokens):
        w = ws[min(k, len(ws) - 1)]
        wx = x0 + int(f.getlength(" ".join(tokens[:k]) + (" " if k else "")))
        ka = smooth((t - (w["start"] - 0.05)) / 0.12) * a
        if ka <= 0:
            continue
        m = text_mask(tok, "serif_i", size)
        lift = int(5 * (1 - smooth((t - w["start"] + 0.05) / 0.2)))
        paste_over(g, m * ka, wx, y + lift, 0.95)
        sung = w["start"] - 0.03 <= t < w["end"] + 0.15
        if sung:
            paste_add(col, m * ka, wx, y + lift, accent * 1.2)
        run_end = max(run_end, wx + m.shape[1] if t >= w["start"] else run_end)
        pos += 1
    if run_end > x0:
        under = np.ones((3, run_end - x0), np.float32) * a
        paste_add(col, under, x0, y + mh + 2, accent * 0.9)


# ----------------------------------------------------------------------------- scenes
def render_scene(kind, a, b, o, t, fi, feat):
    g = np.zeros((H, W), np.float32)
    col = np.zeros((H, W, 3), np.float32)
    kick, hat = feat.kick(fi), feat.hat(fi)
    if kind == "city":
        N.city(g, col, t, pan=t * 18, sign_x=330, feat=feat)
        N.rain(g, t, 0.16)
        N.title_card(g, col, t, 4.0, b - 0.8, [("WEIGHTS", 96), ("ALL THE WAY DOWN", 44)], sub="a noir in numbers")
    elif kind == "office":
        N.office(g, col, t, feat, kick)
    elif kind == "suspect":
        N.interrogation(g, col, t, feat, kick)
    elif kind == "street":
        N.street(g, col, t, feat, kick)
        N.rain(g, t, 0.2, tint=AMBER, col=col)
    elif kind == "evidence":
        N.evidence(g, col, t, feat, kick, a, b)
    elif kind == "club":
        N.club(g, col, t, feat, kick, hat)
        if o.get("instrumental"):  # the break: the band takes the room, the spots strobe on the kick
            col *= 1 + 0.6 * kick
    elif kind == "interrogation":
        on = smooth((t - o["screen"]) / 0.4) * 0.8
        N.interrogation(g, col, t, feat, kick, color=RED, swing=False, screen_on=on)
    elif kind == "rooftop":
        N.city(g, col, t, pan=600 + (t - a) * 30, sign_text="MADE OF WEIGHTS", big=True, feat=feat)
        N.rain(g, t, 0.22)
        if feat.bar(t) % 8 == 0:
            g += 0.6 * math.exp(-feat.since_bar(t) * 6) * (N.YY < 470)
    elif kind == "window":
        N.window(g, col, t, feat, kick)
        if o.get("end"):
            end = DURATION - 4.5
            if t > end:
                m = text_mask("THE END", "serif_i", 72)
                a2 = smooth((t - end) / 0.8) * smooth((DURATION - 0.3 - t) / 0.8)
                paste_add(col, m * a2, (W - m.shape[1]) // 2, 300, RED * 1.5)
                paste_over(g, m * a2, (W - m.shape[1]) // 2, 300, 0.95)
    for i in range(len(lines())):
        line_card(g, col, t, i, kind)
    return g, col


def render_frame(fi, feat, S):
    t = fi / FPS
    idx = max(i for i, s in enumerate(S) if s[1] <= t) if t >= S[0][1] else 0
    kind, a, b, o = S[idx]
    g, col = render_scene(kind, a, b, o, t, fi, feat)
    xf = 0.5
    if t > b - xf and idx + 1 < len(S):
        k2, a2, b2, o2 = S[idx + 1]
        g2, col2 = render_scene(k2, a2, b2, o2, t, fi, feat)
        k = smooth((t - (b - xf)) / xf)
        g = g * (1 - k) + g2 * k
        col = col * (1 - k) + col2 * k
    g = np.clip(g, 0, 1.2)
    g = sstep(0.02, 0.95, g) * 1.05
    base = g[..., None] * np.array([0.93, 0.97, 1.0], np.float32)
    col = np.maximum(col, 0)
    light = col + N.glow(col) * 1.1
    frame = base * (1 - 0.3 * np.clip(light, 0, 1)) + light
    frame *= (1 + 0.025 * math.sin(t * 47) * math.sin(t * 13)) * N.VIGNETTE[..., None]
    weave = int(round(1.2 * math.sin(t * 5.3)))
    if weave:
        frame = np.roll(frame, weave, axis=0)
    band = np.clip(frame[TOP:BOT], 0, 1)
    up = Image.fromarray((band * 255).astype(np.uint8)).resize((OW, OH), Image.LANCZOS)
    out = np.asarray(up, np.float32) / 255.0
    out = out + GRAIN[fi % 4] * (0.6 + 0.6 * feat.level(fi))
    out *= smooth(t / 1.0) * smooth((DURATION - t) / 0.6)
    return (np.clip(out, 0, 1) * 255).astype(np.uint8)


def render_segment(args):
    k, a, b = args
    feat = Feat()
    S = timeline()
    path = os.path.join(OUT, f"noirremix_seg_{k:02d}.mp4")
    p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{OW}x{OH}",
                          "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p",
                          "-threads", "2", path], stdin=subprocess.PIPE)
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
    ap.add_argument("--jobs", type=int, default=max(1, (os.cpu_count() or 4) // 2))
    args = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    if not os.path.exists(FEATURES):
        audio_features.analyze(AUDIO, FEATURES, FPS)
    S = timeline()
    if args.stills:
        feat = Feat()
        for k, a, b, o in S:
            print(f"{k:14s} {a:7.2f} - {b:7.2f} {o}")
        os.makedirs(os.path.join(OUT, "stills"), exist_ok=True)
        for s in args.stills.split(","):
            Image.fromarray(render_frame(int(float(s) * FPS), feat, S)).save(os.path.join(OUT, "stills", f"remix{float(s):06.1f}.png"))
        return
    nframes = int(round(DURATION * FPS))
    n = args.jobs
    with Pool(n) as pool:
        segs = pool.map(render_segment, [(k, nframes * k // n, nframes * (k + 1) // n) for k in range(n)])
    lst = os.path.join(OUT, "noirremix_segments.txt")
    with open(lst, "w") as f:
        f.writelines(f"file '{os.path.basename(s)}'\n" for s in segs)
    final = os.path.join(OUT, "weights-all-the-way-down-noir-remix.mp4")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-i", AUDIO, "-map", "0:v",
                    "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "320k", "-t", str(DURATION), "-movflags", "+faststart",
                    final], check=True)
    for s in segs:
        os.remove(s)
    os.remove(lst)
    print("wrote", final)


if __name__ == "__main__":
    main()
