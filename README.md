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

## Made of Weights (Suno version)

**Watch:** [`out/made-of-weights.mp4`](out/made-of-weights.mp4) (1280×720, 30 fps, 3:10, ~36 MB) ·
smaller copy: [`out/made-of-weights_preview.mp4`](out/made-of-weights_preview.mp4)

This is a second video, cut to the Suno song made from [`suno/made-of-weights.md`](suno/made-of-weights.md),
using the same visual language. Run `python3 src/render_made_of_weights.py` to rebuild it, or add
`--stills 12,60` to preview frames.

- **Audio-driven:** kick and hi-hat pulses, overall level and the oscilloscope traces all come from
  `audio/made-of-weights-suno-analog.flac`. The beat grid (128.3 BPM) was measured from the track.
- **Lyric timing:** comes from `lyrics/made-of-weights.timing.json`. Edit a cue there and re-render
  to retime a line. Sections are found from anchor lines, and the speaker for each line comes from
  the song sheet.
- **Set pieces, by section:**
  - **Intro:** an incision opens onto the matrix.
  - **Verse I:** fluorescent flicker, the 80-layer stack, and a little man searched for with a
    spotlight.
  - **Pre-chorus:** a "NOT FOUND" checklist, a live matrix multiply, then the song's own waveform.
  - **Chorus:** numbers falling "all the way down".
  - **Verse II:** library shelves dissolving into digits, a salt-in-the-sea blur, and probes
    searching empty rooms.
  - **Pre-chorus II:** call-and-response questions over a network.
  - **Bridge:** a meat-pink ECG mirror.
  - **Final chorus:** a heatmap split between meat and weights, and stars for "the sky is too cold".
  - **Outro:** two beacons trade "Hello?" / "Hello.".

## Structure (original procedural version)

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
