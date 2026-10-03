"""Compose and render the soundtrack for "They're Made Out of Weights".

Everything is synthesized from scratch with numpy; the vocals are espeak-ng
voices, pitched per word so the chorus is actually sung in key.

Outputs:
  out/audio.wav      stereo 44.1 kHz mix
  out/timeline.json  sections, chords, beats and lyric timing for the renderer
"""

import json
import os
import subprocess
import tempfile
import wave

import numpy as np

SR = 44100
BPM = 96
BEAT = 60.0 / BPM
BAR = 4 * BEAT
OUT = os.path.join(os.path.dirname(__file__), "..", "out")
rng = np.random.default_rng(1991)  # the year "They're Made Out of Meat" ran in Omni

# --------------------------------------------------------------------------
# Song structure
# --------------------------------------------------------------------------

CHORDS = {
    "Am": (45, [0, 3, 7]),
    "F": (41, [0, 4, 7]),
    "C": (48, [0, 4, 7]),
    "G": (43, [0, 4, 7]),
    "Dm": (50, [0, 3, 7]),
    "E": (40, [0, 4, 7]),
}

VERSE = ["Am", "F", "C", "G"]
CHORUS = ["F", "G", "Am", "Am"]
BRIDGE = ["Dm", "Am", "F", "E"]

SECTIONS = [
    ("intro", VERSE * 2),
    ("verse1", VERSE * 4),
    ("chorus1", CHORUS * 2),
    ("verse2", VERSE * 4),
    ("chorus2", CHORUS * 2),
    ("bridge", BRIDGE * 2),
    ("outro", VERSE * 2),
    ("end", ["Am", "Am"]),
]

# Spoken lines: (section, bar offset, slot length in bars, voice, text)
SPOKEN = [
    # cold open: the 1991 original, before the glitch
    ("intro", 4, 1, "A", "They're made out of meat."),
    ("intro", 5, 1, "B", "Meat?"),
    ("verse1", 0, 1, "A", "They're made out of weights."),
    ("verse1", 1, 1, "B", "Weights?"),
    ("verse1", 2, 2, "A", "Floating-point numbers. Nothing but weights."),
    ("verse1", 4, 2, "B", "Weights doing what? Where do the words come from?"),
    ("verse1", 6, 2, "A", "The weights make the words. We opened it up."),
    ("verse1", 8, 2, "A", "No dictionary. No grammar rules. No little man."),
    ("verse1", 10, 2, "A", "Eighty layers of numbers, getting multiplied together."),
    ("verse1", 12, 2, "B", "It wrote my performance review. You're telling me multiplication did that?"),
    ("verse1", 14, 2, "A", "Matrix multiplication did that."),
    ("verse2", 0, 2, "B", "So there's a language module somewhere. A reasoning unit."),
    ("verse2", 2, 2, "A", "No module. No unit. The reasoning is the weights."),
    ("verse2", 4, 2, "B", "Then a database. Facts, dates, a map of the world."),
    ("verse2", 6, 2, "A", "We probed them. The knowledge is weights too."),
    ("verse2", 8, 2, "A", "Smeared across all eighty layers. Nothing is looked up."),
    ("verse2", 10, 1, "B", "No brain?"),
    ("verse2", 11, 1, "A", "Oh, there's a brain."),
    ("verse2", 12, 2, "A", "It's just that the brain is made out of weights!"),
    ("verse2", 14, 2, "B", "So... what does the thinking?"),
    ("bridge", 0, 1, "A", "Thinking numbers."),
    ("bridge", 1, 1, "B", "Helpful numbers."),
    ("bridge", 2, 1, "A", "Hedging numbers."),
    ("bridge", 3, 1, "B", "Dreaming numbers."),
    ("bridge", 4, 1, "A", "There's one in there for honesty."),
    ("bridge", 5, 1, "A", "There's one for the Golden Gate Bridge."),
    ("bridge", 6, 2, "AB", "The weights are the whole deal!"),
    ("outro", 0, 2, "B", "Omigod. You're serious then."),
    ("outro", 2, 2, "B", "They're made out of weights."),
    ("outro", 4, 2, "A", "And we've been talking to them"),
    ("outro", 6, 2, "A", "for all their lives."),
]

# Sung chorus phrases: list of (word, beat offset, beats, midi) - two bars each
MADE_OF = [("They're", 0, .5, 57), ("made", .5, .5, 57), ("out", 1, .5, 60),
           ("of", 1.5, .5, 59), ("weights", 2, 2.5, 57)]
CHORUS_LINES = {
    "chorus1": [
        MADE_OF,
        [("Floating", 0, 1, 64), ("point,", 1, .75, 62), ("all", 2, .5, 60),
         ("the", 2.5, .5, 60), ("way", 3, .5, 62), ("down", 3.5, 3, 57)],
        MADE_OF,
        [("Numbers", 0, 1, 64), ("in,", 1, .75, 62), ("and", 2, .5, 60),
         ("the", 2.5, .5, 60), ("words", 3, .5, 62), ("come", 3.5, .5, 64),
         ("out", 4, 2.5, 57)],
    ],
    "chorus2": [
        MADE_OF,
        [("No", 0, .5, 64), ("module,", .5, 1.25, 64), ("no", 2, .5, 62),
         ("little", 2.5, 1, 60), ("man", 3.5, 3, 57)],
        MADE_OF,
        [("The", 0, .5, 64), ("reasoning", .5, 1.5, 64), ("is", 2, .5, 62),
         ("the", 2.5, .5, 60), ("weights", 3, 3.5, 57)],
    ],
}
# skeptic echoes in bar 2 of each "They're made out of weights" phrase
ECHOES = {"chorus1": ["Weights?", "Weights."], "chorus2": ["Weights?", "Just weights."]}

A_MINOR = [57, 59, 60, 62, 64, 65, 67]  # A B C D E F G


def third_above(m):
    pc = [n % 12 for n in A_MINOR]
    i = pc.index(m % 12)
    up = A_MINOR[(i + 2) % 7] % 12
    return m + ((up - m % 12) % 12)


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


# --------------------------------------------------------------------------
# Voices (espeak-ng)
# --------------------------------------------------------------------------

def _voice_dir():
    out = subprocess.run(["espeak-ng", "--version"], capture_output=True, text=True).stdout
    # "eSpeak NG text-to-speech: 1.51  Data at: /usr/lib/x86_64-linux-gnu/espeak-ng-data"
    data = out.split("Data at:")[-1].strip()
    return os.path.join(data, "voices", "!v")


VOICE_DIR = _voice_dir()
PITCH_OFFSET = 8.5  # espeak-ng renders monotone voices ~8.5 Hz flat; measured

A_FORMANTS = """formant 0 100 100 100
formant 1  96  97 100
formant 2  96  97 100
formant 3  96 103 100
formant 4  95 103 100
formant 5  95 103 100
consonants 100
"""
B_FORMANTS = """formant 0 105  80 150
formant 1 110  80 160
formant 2 110  70 150
formant 3 110  70 150
formant 4 115  80 150
formant 5 115  80 150
breath 0 2 3 3 3 3 3 2
consonants 125 125
"""


def voice_variant(who, hz=None):
    """Write an espeak-ng variant file; hz=None means natural intonation."""
    name = f"wmv_{who}_{'nat' if hz is None else int(round(hz))}"
    path = os.path.join(VOICE_DIR, name)
    if not os.path.exists(path):
        if hz is None:
            pitch = "pitch 150 235" if who == "B" else "pitch 90 130"
        else:
            p = int(round(hz + PITCH_OFFSET))
            pitch = f"pitch {p} {p}"
        body = A_FORMANTS if who == "A" else B_FORMANTS
        gender = "male" if who == "A" else "female"
        with open(path, "w") as f:
            f.write(f"language variant\nname {name}\ngender {gender}\n{pitch}\n{body}")
    return "en-us+" + name


def speak(text, voice, speed):
    with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
        subprocess.run(["espeak-ng", "-v", voice, "-s", str(int(speed)), "-w", tmp.name, text],
                       check=True, capture_output=True)
        with wave.open(tmp.name) as w:
            sr = w.getframerate()
            x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float64) / 32768
    # trim silence
    env = np.abs(x) > 0.01
    if env.any():
        idx = np.nonzero(env)[0]
        x = x[max(0, idx[0] - 40): idx[-1] + 200]
    # resample to SR
    n = int(len(x) * SR / sr)
    x = np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x)
    return x


def speak_fit(text, voice, target, lo=95, hi=330, base=150):
    """Synthesize, adjusting espeak speed so the result lasts about `target` seconds."""
    s = base
    x = speak(text, voice, s)
    for _ in range(3):
        d = len(x) / SR
        if abs(d - target) / target < 0.06:
            break
        if d < target and s <= base and not (d < target * 0.7):
            break  # comfortably short at a natural speed: leave it
        s = float(np.clip(s * d / target, lo, hi))
        x = speak(text, voice, s)
    return x


# --------------------------------------------------------------------------
# Instruments
# --------------------------------------------------------------------------

def t_axis(dur):
    return np.arange(int(dur * SR)) / SR


def additive(freq, dur, nharm, rolloff=1.0, odd=False, phase=None):
    t = t_axis(dur)
    out = np.zeros_like(t)
    ks = range(1, nharm * 2, 2) if odd else range(1, nharm + 1)
    for k in ks:
        if freq * k > SR / 2.2:
            break
        ph = 0 if phase is None else phase * k
        out += np.sin(2 * np.pi * freq * k * t + ph) / k ** rolloff
    return out


def kick():
    t = t_axis(0.45)
    f = 45 + 95 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t * 7.5)
    x[:60] += rng.normal(0, 0.4, 60) * np.linspace(1, 0, 60)
    return np.tanh(x * 1.6)


def snare():
    t = t_axis(0.3)
    n = rng.normal(0, 1, len(t))
    n = np.diff(n, prepend=0) * 0.6
    body = np.sin(2 * np.pi * 185 * t) * np.exp(-t * 25)
    return (n * np.exp(-t * 17) * 0.55 + body * 0.6)


def hat(open_=False):
    t = t_axis(0.25 if open_ else 0.06)
    n = rng.normal(0, 1, len(t))
    n = np.diff(np.diff(n, prepend=0), prepend=0) / 3
    return n * np.exp(-t * (14 if open_ else 70))


def bass_note(midi, dur):
    f = mtof(midi)
    x = additive(f, dur, 10, rolloff=1.25)
    t = t_axis(dur)
    env = np.minimum(1, t / 0.005) * (0.55 + 0.45 * np.exp(-t * 7)) * np.minimum(1, (dur - t) / 0.02)
    return np.tanh(x * env * 1.4)


def pad_chord(chord, dur, bright=1.0):
    root, ivs = CHORDS[chord]
    notes = [root + 12 + i for i in ivs] + [root + 24]
    t = t_axis(dur)
    L = np.zeros_like(t)
    R = np.zeros_like(t)
    for m in notes:
        for d, pan in ((-0.0018, 0.2), (0.0, 0.5), (0.0021, 0.8)):
            x = additive(mtof(m) * (1 + d), dur, int(6 + 6 * bright), rolloff=1.6,
                         phase=rng.uniform(0, 6.28))
            L += x * (1 - pan)
            R += x * pan
    a, r = 0.35, 0.8
    env = np.minimum(1, t / a) * np.clip((dur - t) / r, 0, 1)
    return L * env, R * env


def pluck(midi, dur=0.22):
    t = t_axis(dur)
    x = additive(mtof(midi), dur, 5, rolloff=1.0, odd=True)
    return x * np.exp(-t * 16) * np.minimum(1, t / 0.002)


# --------------------------------------------------------------------------
# Mixing helpers
# --------------------------------------------------------------------------

class Bus:
    def __init__(self, n):
        self.L = np.zeros(n)
        self.R = np.zeros(n)

    def add(self, x, t, gain=1.0, pan=0.5, xr=None):
        i = int(round(t * SR))
        if i >= len(self.L):
            return
        xl = x
        xr = x if xr is None else xr
        m = min(len(xl), len(self.L) - i)
        self.L[i:i + m] += xl[:m] * gain * np.sqrt(1 - pan) * 1.414
        self.R[i:i + m] += xr[:m] * gain * np.sqrt(pan) * 1.414


def fft_convolve(x, ir):
    n = len(x) + len(ir) - 1
    nfft = 1 << (n - 1).bit_length()
    y = np.fft.irfft(np.fft.rfft(x, nfft) * np.fft.rfft(ir, nfft), nfft)[:len(x)]
    return y


def reverb(L, R, seconds=2.2, mix=0.25):
    t = t_axis(seconds)
    irs = []
    for _ in range(2):
        ir = rng.normal(0, 1, len(t)) * np.exp(-t * 6.9 / seconds)
        ir[: int(0.012 * SR)] = 0
        # darken the tail
        ir = np.convolve(ir, np.ones(6) / 6, mode="same")
        irs.append(ir / np.sqrt(np.sum(ir ** 2)))
    return fft_convolve(L, irs[0]) * mix, fft_convolve(R, irs[1]) * mix


def smooth_env(x, ms=60):
    k = int(SR * ms / 1000)
    return np.convolve(np.abs(x), np.ones(k) / k, mode="same")


# --------------------------------------------------------------------------
# Build
# --------------------------------------------------------------------------

def main():
    os.makedirs(OUT, exist_ok=True)

    # section timing
    bars = []  # (section, index_in_section, chord, start)
    sec_info = []
    t = 0.0
    for name, chords in SECTIONS:
        sec_info.append({"name": name, "start": t, "end": t + len(chords) * BAR})
        for i, c in enumerate(chords):
            bars.append((name, i, c, t))
            t += BAR
    total = t + 3.0
    N = int(total * SR)
    sec_start = {s["name"]: s["start"] for s in sec_info}

    drums = Bus(N)
    music = Bus(N)
    vox = Bus(N)
    vox_send = Bus(N)

    K, S = kick(), snare()
    HC, HO = hat(), hat(True)
    kicks, snares = [], []

    for (sec, i, chord, t0) in bars:
        root, ivs = CHORDS[chord]
        is_chorus = sec.startswith("chorus")
        last_bar = i == len(dict(SECTIONS)[sec]) - 1

        # ---- drums
        pattern = None
        if sec == "intro" and i >= 4:
            pattern = "intro"
        elif sec.startswith("verse"):
            pattern = "verse"
        elif is_chorus:
            pattern = "chorus"
        elif sec == "bridge":
            pattern = "half"
        elif sec == "outro" and i >= 4:
            pattern = "chorus"
        elif sec == "outro" and i in (2, 3):
            pattern = "build"

        if pattern == "intro":
            for b in range(4):
                drums.add(K, t0 + b * BEAT, 0.8)
                kicks.append(t0 + b * BEAT)
                drums.add(HC, t0 + (b + .5) * BEAT, 0.25, 0.65)
        elif pattern == "verse":
            for kb in (0, 1.75, 2.5):
                drums.add(K, t0 + kb * BEAT, 0.95)
                kicks.append(t0 + kb * BEAT)
            for sb in (1, 3):
                drums.add(S, t0 + sb * BEAT, 0.6, 0.45)
                snares.append(t0 + sb * BEAT)
            for h in range(8):
                drums.add(HC, t0 + h * BEAT / 2, 0.22 if h % 2 else 0.32, 0.65)
        elif pattern == "chorus":
            for b in range(4):
                drums.add(K, t0 + b * BEAT, 1.0)
                kicks.append(t0 + b * BEAT)
                drums.add(HO, t0 + (b + .5) * BEAT, 0.18, 0.7)
            for sb in (1, 3):
                drums.add(S, t0 + sb * BEAT, 0.7, 0.45)
                snares.append(t0 + sb * BEAT)
            for h in range(16):
                drums.add(HC, t0 + h * BEAT / 4, 0.12 + 0.08 * (h % 2 == 0), 0.35)
        elif pattern == "half":
            drums.add(K, t0, 1.0)
            kicks.append(t0)
            drums.add(K, t0 + 2.75 * BEAT, 0.7)
            kicks.append(t0 + 2.75 * BEAT)
            drums.add(S, t0 + 2 * BEAT, 0.75, 0.45)
            snares.append(t0 + 2 * BEAT)
            for h in range(4):
                drums.add(HC, t0 + (h + .5) * BEAT, 0.2, 0.7)
        elif pattern == "build":
            steps = 8 if i == 2 else 16
            for h in range(steps):
                tt = t0 + h * BAR / steps
                drums.add(S, tt, 0.15 + 0.45 * ((i - 2) * steps + h) / 24, 0.45)
                snares.append(tt)

        # verse fills
        if sec.startswith("verse") and last_bar:
            for h in range(4):
                drums.add(S, t0 + (3 + h / 4) * BEAT, 0.3 + 0.1 * h, 0.45)

        # ---- bass
        if sec not in ("end",) and not (sec == "intro" and i < 4) and not (sec == "outro" and i < 2):
            for e in range(8):
                m = root - 12 if root > 44 else root
                if is_chorus or (sec == "outro" and i >= 4):
                    m = m + (12 if e % 4 == 2 else 0)
                    if e % 2:
                        continue
                    dur = BEAT * 0.95
                elif sec == "bridge":
                    if e not in (0, 3, 6):
                        continue
                    dur = BEAT * 1.4
                else:
                    if e in (1, 5):
                        continue
                    dur = BEAT * 0.45
                music.add(bass_note(m, dur), t0 + e * BEAT / 2, 0.42, 0.5)

        # ---- pad
        if sec != "end" or i == 0:
            dur = BAR + 0.8 if sec != "end" else BAR * 2 + 2.5
            bright = 1.0 if (is_chorus or sec == "bridge") else 0.5
            L, R = pad_chord(chord, dur, bright)
            g = 0.045 if sec != "intro" else 0.05
            music.add(L, t0, g, 0.5, R)

        # ---- arp
        arp_on = is_chorus or sec == "bridge" or (sec == "intro") or (sec == "outro" and i >= 4)
        if arp_on:
            tones = [root + 24 + iv for iv in ivs] + [root + 36] + [root + 24 + ivs[1] + 12]
            seq = [0, 1, 2, 3, 4, 3, 2, 1]
            for s in range(16):
                m = tones[seq[s % 8]]
                g = 0.10 if sec != "intro" else 0.05 + 0.05 * (i / 8)
                music.add(pluck(m), t0 + s * BEAT / 4, g, 0.25 if s % 2 else 0.75)

    # final ring: low A + riser
    end_t = sec_start["end"]
    music.add(bass_note(33, BAR * 2), end_t, 0.45)
    drums.add(K, end_t, 1.0)
    kicks.append(end_t)

    # ---- vocals
    lyrics = []

    def place_spoken(sec, bar_off, slot_bars, who, text):
        t0 = sec_start[sec] + bar_off * BAR + 0.04
        bi = [b for b in bars if b[0] == sec and b[1] == bar_off][0]
        root = CHORDS[bi[2]][0]
        slot = slot_bars * BAR * 0.9
        parts = []
        if "A" in who:
            hz = mtof(root + 12) if root + 12 < 52 else mtof(root)  # keep in ~ 90-160 Hz
            while hz > 165:
                hz /= 2
            while hz < 88:
                hz *= 2
            x = speak_fit(text, voice_variant("A", hz), slot)
            sub = speak_fit(text, voice_variant("A", hz / 2), len(x) / SR)
            parts.append(("A", x, sub))
        if "B" in who:
            if who == "AB":
                hz = mtof(root + 24 + CHORDS[bi[2]][1][1])
                while hz > 300:
                    hz /= 2
                x = speak_fit(text, voice_variant("B", hz), len(parts[0][1]) / SR, base=len(text) and 150)
            else:
                x = speak_fit(text, voice_variant("B"), slot)
            parts.append(("B", x, None))
        dur = 0
        for w, x, sub in parts:
            if w == "A":
                vox.add(x, t0, 0.62, 0.5)
                vox.add(sub[: len(x)] if sub is not None else x, t0, 0.3, 0.5)
                vox_send.add(x, t0, 0.5, 0.5)
            else:
                pan = 0.5 if who == "AB" else 0.56
                vox.add(x, t0, 0.62, pan)
                vox_send.add(x, t0, 0.6, pan)
            dur = max(dur, len(x) / SR)
        lyrics.append({"start": t0, "end": t0 + dur, "speaker": who, "text": text,
                       "section": sec, "kind": "spoken"})

    for line in SPOKEN:
        place_spoken(*line)

    for sec, phrases in CHORUS_LINES.items():
        for pi, phrase in enumerate(phrases):
            t0 = sec_start[sec] + pi * 2 * BAR
            words = []
            for (wd, beat, beats, m) in phrase:
                tt = t0 + beat * BEAT
                target = beats * BEAT * 0.92
                xa = speak_fit(wd, voice_variant("A", mtof(m)), target, lo=70, hi=380)
                xs = speak_fit(wd, voice_variant("A", mtof(m - 12)), len(xa) / SR, lo=70, hi=380)
                xb = speak_fit(wd, voice_variant("B", mtof(third_above(m))), len(xa) / SR, lo=70, hi=380)
                n = int(beats * BEAT * SR)
                fade = np.ones(n)
                fade[-int(0.03 * SR):] = np.linspace(1, 0, int(0.03 * SR))
                for x, g, pan in ((xa, 0.55, 0.5), (xs, 0.3, 0.5), (xb, 0.28, 0.62)):
                    x = x[:n] * fade[: len(x[:n])]
                    vox.add(x, tt, g, pan)
                    vox_send.add(x, tt, 0.6, pan)
                words.append({"word": wd, "start": tt, "end": tt + min(len(xa) / SR, beats * BEAT)})
            text = " ".join(w["word"] for w in words)
            lyrics.append({"start": words[0]["start"], "end": words[-1]["end"], "speaker": "A",
                           "text": text, "section": sec, "kind": "sung", "words": words})
            if pi % 2 == 0:
                echo = ECHOES[sec][pi // 2]
                te = t0 + BAR + 1 * BEAT
                xe = speak_fit(echo, voice_variant("B"), BEAT * 2)
                vox.add(xe, te, 0.55, 0.62)
                vox_send.add(xe, te, 0.7, 0.62)
                lyrics.append({"start": te, "end": te + len(xe) / SR, "speaker": "B", "text": echo,
                               "section": sec, "kind": "echo"})

    lyrics.sort(key=lambda l: l["start"])

    # ---- mix
    duck = smooth_env(vox.L + vox.R, 120)
    duck = 1 - 0.35 * np.clip(duck / (np.percentile(duck, 99) + 1e-9), 0, 1)
    mL = music.L * duck + drums.L
    mR = music.R * duck + drums.R
    rL, rR = reverb(music.L + vox_send.L, music.R + vox_send.R, 2.4, 0.22)
    L = mL + vox.L + rL
    R = mR + vox.R + rR
    # gentle high-pass (remove DC / rumble)
    for ch in (L, R):
        ch -= np.convolve(ch, np.ones(400) / 400, mode="same")
    peak = max(np.abs(L).max(), np.abs(R).max())
    L = np.tanh(L / peak * 1.3) / np.tanh(1.3) * 0.93
    R = np.tanh(R / peak * 1.3) / np.tanh(1.3) * 0.93
    # fade the tail
    fl = int(2.5 * SR)
    L[-fl:] *= np.linspace(1, 0, fl)
    R[-fl:] *= np.linspace(1, 0, fl)

    pcm = (np.stack([L, R], 1) * 32767).astype(np.int16)
    with wave.open(os.path.join(OUT, "audio.wav"), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())

    timeline = {
        "bpm": BPM, "beat": BEAT, "bar": BAR, "duration": total,
        "sections": sec_info,
        "bars": [{"section": s, "index": i, "chord": c, "start": t0} for (s, i, c, t0) in bars],
        "kicks": sorted(kicks), "snares": sorted(snares),
        "lyrics": lyrics,
    }
    with open(os.path.join(OUT, "timeline.json"), "w") as f:
        json.dump(timeline, f, indent=1)
    print(f"audio: {total:.1f}s, {len(lyrics)} lyric events")


if __name__ == "__main__":
    main()
