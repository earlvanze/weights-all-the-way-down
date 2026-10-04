# Weights All the Way Down — noir

Everything for the neo-noir videos of the noir jazz remix. Run from the repo root with the repo venv
(`python3 -m venv .venv && .venv/bin/pip install -r requirements.txt`, plus ffmpeg on PATH). Both renderers share
`src/audio_features.py` with the other videos.

| path | what |
|---|---|
| `noir.py` | the original noir renderer (PIL + numpy), cut to the first capture |
| `noir_remix.py` | the full-production remix, cut to the 2026-10-04 take with word-synced cards |
| `audio/` | the first capture's timing master + provenance (used by `noir.py`) |
| `out/noir_preview.mp4` | the original preview (960×540, first capture, cards placed per scene) |
| `out/weights-all-the-way-down-noir-remix.mp4` | the remix (1920×804, 2.39:1) |

## The remix (`noir_remix.py`)

```sh
.venv/bin/python noir/noir_remix.py --stills 15,60,170   # preview frames -> noir/out/stills/
.venv/bin/python noir/noir_remix.py                      # -> noir/out/weights-all-the-way-down-noir-remix.mp4
```

- **Audio:** `../audio/ghB3gqhB8o7swEvF/ghB3gqhB8o7swEvF-master-voice-edit.wav` (223.6 s), the same delivered master as
  the kinetic video (the male "I'm serious" and the robot "Hello." edits).
- **Timing:** each scene cuts 0.15 s before its section's first sung word, from the kinetic project's forced-aligned
  word timing (`../kinetic/data/lyrics.json`, see `../kinetic/TIMING.md`). Cards are synced word by word: each word
  appears on its onset, burns in the scene's light while sung, and the underline runs to the current word. A card clears
  before the next line's card arrives.
- **Scenes:** city + title (intro) · office (verse 1) · the suspect under the swinging bulb (pre-chorus) · rain street
  (chorus) · evidence board (verse 2) · jazz club (pre-chorus 2 + chorus 2) · the two reflections (bridge) · red-bulb
  interrogation, the CRT lighting on the first "It's weights" (breakdown) · the club again, spots pulsing with the kick
  (instrumental) · rooftop MADE OF WEIGHTS (final chorus) · the reflections for the Hellos, then THE END.
- **Delivery:** native 2.39:1, 1920×804, no bars: the 1280×720 scenes' 2.39 band is upscaled (Lanczos) and film grain is
  added at full resolution.

## The original noir (`noir.py`, first capture)

A neo-noir video for the noir jazz remix: the timing master `audio/suno-5as1fTyRJyE1c2rA-timing-master.wav` (the first capture, 232.84 s).
The world is black and white, and only light has colour: neon reds and magentas, teal spill through
venetian blinds, amber lamps, a cyan CRT and red evidence string. It's framed in a 2.39:1 letterbox
with film grain, gate weave and flicker.

```sh
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt   # numpy, Pillow (+ ffmpeg on PATH)
.venv/bin/python noir/noir.py --stills 9,45,130   # preview frames -> noir/out/stills/
.venv/bin/python noir/noir.py                     # -> noir/out/weights-all-the-way-down-noir.mp4
```

- **Audio-driven:** `src/audio_features.py` beat-tracks the track (about 102.65 BPM swing, with a
  dynamic-programming tracker and downbeats) and extracts kick, hi-hat and level envelopes. The
  swinging bulb, the lamp posts on the street, the red string and the club spotlights all move on
  those beats.
- **Scenes:** each one changes on a downbeat near a structural boundary measured from the audio:
  - **0:00** a rainy skyline with a red "WEIGHTS" sign, and the title
  - **0:17** the detective's office
  - **0:42** the suspect under a swinging bulb
  - **0:56** a rain-slick street
  - **1:29** the evidence board
  - **2:01** the jazz club
  - **2:34** interrogation under a red bulb
  - **2:53** the rooftop "MADE OF WEIGHTS" sign
  - **3:37** reflections in a rainy window, then THE END
- **Words:** lines from the song (same lyrics as `suno/made-of-weights.md`) staged as noir intertitle
  cards, a few per scene in song order. They're placed by scene and not synced to the vocal.
  Retime them in `cards_for()`.
- **Render time:** about 8 minutes on 4 cores. With the grain, the output is large (~180 MB at
  CRF 23). Raise `-crf` in `render_segment()` for a smaller file.
