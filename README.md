# weights-music-video

A music video for Max Leiter's ["They're Made Out of Weights"](https://maxleiter.com/blog/weights) (2026),
itself a riff on Terry Bisson's "They're Made Out of Meat" (1991).

**Watch:** [`out/weights.mp4`](out/weights.mp4) (1280×720, 30 fps, 3:08, ~33 MB) · smaller copy: [`out/weights_preview.mp4`](out/weights_preview.mp4) (~19 MB)

Everything is generated from code. There are no samples, stock footage or AI image models:

- **Music** (`src/compose.py`): a 96 BPM A-minor track (Am–F–C–G verses, F–G–Am chorus,
  Dm–Am–F–E bridge) synthesized with numpy. Additive-synthesis bass, pads and arpeggios,
  synthesized drums, and FFT-convolution reverb.
- **Vocals**: two espeak-ng voices. The *Analyst* (cyan) explains, and the *Skeptic* (amber)
  can't believe it. Spoken lines are pitched to the chord underneath. In the chorus, each word
  is synthesized as a monotone at its melody note, with a sub-octave double and a harmony a
  third above, so the robots actually sing.
- **Video** (`src/render.py`): PIL and numpy frames piped to ffmpeg, all driven by
  `out/timeline.json`, which holds every kick, snare, bar and word onset:
  - **Cold open:** Bisson's 1991 lines, then the title glitches from MEAT to WEIGHTS.
  - **Verses:** a scrolling matrix of floating-point weights, with typewriter lyrics synced to
    the voices. In verse II, a probe crosshair reads out features.
  - **Choruses:** a pulsing weight heatmap with word-by-word sung lyrics.
  - **Bridge:** a feed-forward network lit up on the beat. It shows "thinking / helpful / hedging /
    dreaming numbers", an *honesty* feature meter, and the Golden Gate Bridge drawn in digits.
  - **Outro:** the matrix falls apart, then reassembles for "...for all their lives."

## Structure

| time | section | |
|---|---|---|
| 0:00 | intro | boot log, "They're made out of meat." / "Meat?", title glitch |
| 0:20 | verse I | weights, no dictionary, no little man, matrix multiplication |
| 1:00 | chorus | *They're made out of weights / floating point, all the way down* |
| 1:20 | verse II | no module, no database, the brain is made out of weights |
| 2:00 | chorus | *No module, no little man / the reasoning is the weights* |
| 2:20 | bridge | thinking / helpful / hedging / dreaming numbers, honesty, Golden Gate |
| 2:40 | outro | "Omigod. You're serious then." ... "for all their lives." |

## Rebuild

Requires Python 3 with `numpy` and `pillow`, plus `ffmpeg` and `espeak-ng`. The composer writes
voice-variant files into espeak-ng's data directory, so it needs write access there (root in a
container).

```sh
pip install numpy pillow
apt-get install -y ffmpeg espeak-ng
python3 src/compose.py                 # -> out/audio.wav, out/timeline.json (~1 min)
python3 src/render.py                  # -> out/weights.mp4 (~3 min on 4 cores)
python3 src/render.py --stills 18,62   # preview frames -> out/stills/
```
