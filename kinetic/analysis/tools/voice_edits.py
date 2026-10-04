"""Voice edits on the delivered mix, done on the demucs vocal stem so only the edited words change.

For each window the mix becomes  mix - ramp * vocals + ramp * edited(vocals)  (ramp: 40 ms fades), so outside the windows
the master is bit-identical and inside it only the voice is replaced.

  * "I'm serious" (2nd, the male reply that Suno sang in the female voice): down 18 semitones (251 Hz -> ~90 Hz, the
    Analyst's low spoken register, measured over his verse and bridge lines), with the formants lowered 4 semitones
    (rubberband: -4 st without formant preservation, then -14 st with it), so it reads as a man, not a slowed woman.
  * the final "Hello.": half robot — a channel vocoder (STFT envelope of the voice on a 98 Hz sawtooth + a little noise)
    blended 70/30 with the sung voice, +4 dB.

usage (from analysis/):  uv run python tools/voice_edits.py <master.wav> <vocals.wav> <out.wav>
"""
import json, os, subprocess, sys, tempfile
import numpy as np, soundfile as sf, librosa

MASTER, VOCALS, OUT = sys.argv[1:4]
EDITS = [  # (name, start s, end s, kind)
    ("I'm serious (2nd)", 157.80, 159.40, 'male'),
    ('Hello. (final)', 208.75, 210.05, 'robot'),
]
FADE = 0.04
GAIN_DB = {'robot': 4.0}  # the last Hello sits a little forward

mix, sr = sf.read(MASTER, always_2d=True)
voc, vsr = sf.read(VOCALS, always_2d=True)
out = mix.copy()


def rubber(x: np.ndarray, semis: float, formant: bool) -> np.ndarray:
    with tempfile.TemporaryDirectory() as d:
        a, b = os.path.join(d, 'a.wav'), os.path.join(d, 'b.wav')
        sf.write(a, x, sr, subtype='FLOAT')
        subprocess.run(['rubberband', '-3', '-q', '-p', str(semis), *(['-F'] if formant else []), a, b], check=True)
        y, _ = sf.read(b, always_2d=True)
    n = len(x)
    return y[:n] if len(y) >= n else np.pad(y, ((0, n - len(y)), (0, 0)))


def male(x):
    return rubber(rubber(x, -4, False), -14, True)


def robot(x):
    nfft, hop = 2048, 256
    t = np.arange(len(x)) / sr
    saw = 2 * ((t * 98.0) % 1) - 1 + 0.5 * (2 * ((t * 196.3) % 1) - 1)
    rng = np.random.default_rng(7)
    car = saw + 0.04 * rng.standard_normal(len(t))
    C = librosa.stft(car, n_fft=nfft, hop_length=hop)
    cenv = np.maximum(1e-6, np.apply_along_axis(lambda v: np.convolve(v, np.ones(24) / 24, 'same'), 0, np.abs(C)))
    outc = []
    for ch in range(x.shape[1]):
        M = librosa.stft(x[:, ch], n_fft=nfft, hop_length=hop)
        menv = np.apply_along_axis(lambda v: np.convolve(v, np.ones(12) / 12, 'same'), 0, np.abs(M))
        y = librosa.istft(C / cenv * menv, hop_length=hop, length=len(x))
        outc.append(y)
    y = np.stack(outc, 1)
    # a hint of the original consonants so the word stays intelligible
    return 0.7 * y + 0.3 * x  # 70% machine, 30% voice


log = []
for name, a, b, kind in EDITS:
    pad = FADE * 2
    i0, i1 = int((a - pad) * sr), int((b + pad) * sr)
    seg = librosa.resample(voc[int((a - pad) * vsr):int((b + pad) * vsr)].T, orig_sr=vsr, target_sr=sr).T
    seg = seg[: i1 - i0] if len(seg) >= i1 - i0 else np.pad(seg, ((0, i1 - i0 - len(seg)), (0, 0)))
    ed = male(seg) if kind == 'male' else robot(seg)
    rms = lambda z: np.sqrt(np.mean(z ** 2) + 1e-12)
    ed *= rms(seg) / rms(ed) * (10 ** (GAIN_DB.get(kind, 0) / 20))
    tt = np.arange(i1 - i0) / sr
    ramp = np.clip(np.minimum((tt - FADE) / FADE, (tt[-1] - FADE - tt) / FADE), 0, 1)[:, None]
    out[i0:i1] = np.clip(mix[i0:i1] - ramp * seg + ramp * ed, -1, 1 - 2 ** -23)
    log.append({'name': name, 'start': a, 'end': b, 'kind': kind})

sf.write(OUT, out, sr, subtype='PCM_24')
json.dump({'source_master': os.path.basename(MASTER), 'vocal_stem': 'htdemucs vocals (analysis cache)', 'edits': log,
           'method': __doc__.strip().splitlines()[0]},
          open(os.path.splitext(OUT)[0] + '.edits.json', 'w'), indent=1)
print('wrote', OUT, f'({len(out) / sr:.3f} s)')
