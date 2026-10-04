#!/usr/bin/env bash
# Re-run timing from the cached stems + whisper cues of the active take (after editing lyrics.txt, sections.txt or
# <cache>/timing-fixes.json), without re-running demucs or whisper.
set -euo pipefail
P=$(cd "$(dirname "$0")/.." && pwd); A=$P/analysis
D=$(ls -d "$A"/candidates/$(cut -c1-12 "$A/work/MASTER.sha256")-*/); M=$(cat "$D/MASTER")
cd "$A"
LYR=../lyrics.txt; [ -s "$D/lyrics.txt" ] && LYR="$D/lyrics.txt"
LYRICS="$LYR" WHISPER="$D/whisper-words.json" OUT="$D/transcript.json" uv run python autocue.py | tee "$D/autocue.txt"
MASTER="$M" TRANSCRIPT="$D/transcript.json" uv run python align.py 2>&1 | grep -v -i "warn\|forced_align" | tee "$D/align.txt"
uv run python tidy.py
TAKE="$D" uv run python refine.py 2>&1 | grep -v -i "warn\|forced_align" | tee "$D/refine.txt"
[ -s "$D/timing-fixes.json" ] && python3 fix_timing.py "$D/timing-fixes.json"
SECTIONS="$(cat "$P/sections.txt")" uv run python analyze.py 2>&1 | grep -v -i warn | tee "$D/analyze.txt"
uv run python check.py | tee "$D/check.txt" | head -30
cp ../data/lyrics.json ../data/audio.json "$D/"
