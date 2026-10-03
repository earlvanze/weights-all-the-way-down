# Timed lyrics — *Made of Weights*

This package contains the displayed Suno lyrics as WebVTT, SubRip, LRC, and JSON cues for the exact track share: <https://suno.com/s/oSUZRMt89UT3xQzk>.

## Provenance and timing method

- Audio reference: `audio/made-of-weights-suno-analog.flac`, an isolated real-time analog capture of authenticated Brave playback (see `audio/CAPTURE.md`).
- Program duration: 188.32 seconds; the lossless capture is 194.027 seconds because it retains playback tail.
- Cue text: the official lyric sheet displayed by Suno for this track.
- Cue timing: aligned to the track’s performed section structure and the captured program. These are usable display/production cues, not an exported Suno word-timing payload.

## Whisper note

The local Wednesday model (`ggml-medium.en.bin`) was tested against both the mix and a Demucs vocal stem. Its output consisted primarily of music symbols or unrelated hallucinated text, so it is intentionally **not** published as lyric timing. The JSON includes only the reviewed cue data above; no claim is made that Suno supplied timestamps.
