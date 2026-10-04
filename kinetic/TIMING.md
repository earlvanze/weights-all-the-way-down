# Timing — Weights All the Way Down (noir jazz remix)

## Active take: ghB3gqhB8o7swEvF (captured 2026-10-04)
Master: `../audio/ghB3gqhB8o7swEvF/ghB3gqhB8o7swEvF-timing-master.wav` (223.600 s, sha256 66759032…; provenance alongside).
Cache: `analysis/candidates/66759032e6f4-*/` (stems, whisper cues, per-take `lyrics.txt`, `timing-fixes.json`).
Re-run without stems/whisper: `analysis/retime.sh`. 72 lines, `check.py`: 0 suspect lines.

What this take sings differently from the sheet (checked with whisper medium on the mix, large-v3-turbo on the vocal stem,
and `tools/envelope.py`), recorded in the per-take `lyrics.txt`:
- "But it's made of weights" once per chorus (no second "made of weights").
- "It's weights" is whispered twice (161.0 s and 170.1 s).
- The outro has two "Made of weights / are you there?" pairs before Hello? (206.1 s) / Hello. (208.8 s).

Pins: chorus 1 lines 14–18 (choir vocal, forced-alignment confidence < 0.1) set from the two whisper passes, which agree
within ~0.3 s: Made of weights 59.0, made of weights 60.1, Zero 61.2, Made 63.0, made 64.1.

Instrumental shots on this take's downbeats: title 4.90, club 174.54, sign build 179.19, end card 211.73.

## Previous take: 5as1fTyRJyE1c2rA (232.84 s)
`../suno-5as1fTyRJyE1c2rA-timing-master.wav`, cache `analysis/candidates/8c85ebef015b-*` (pins for lines 13–31). It
sings a different structure; switch back with `./swap-audio.sh ../suno-5as1fTyRJyE1c2rA-timing-master.wav`, but the
edit in `script.ts` is now laid out for the new take (breakdown 4 lines, outro 6, no office instrumental).
