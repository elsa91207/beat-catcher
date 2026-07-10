# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

"Beat Catcher" (`index.html`) is a single-file, dependency-free rhythm game. All HTML, CSS, and JavaScript live inline in [index.html](index.html) — there is no build step, package manager, bundler, or test suite. UI copy is in Traditional Chinese (`lang="zh-Hant"`).

## Running

Open [index.html](index.html) directly in a browser, or serve it (e.g. `python3 -m http.server`) and visit `localhost:8000`. Audio requires a user gesture (click/keypress) before it will play — this is why `ensureAudio()` runs inside `startGame()`, not on load.

## Architecture

The game is a canvas-based falling-note catcher across 3 lanes. Everything hangs off a small set of module-level `let` globals (`state`, `score`, `energy`, `notes`, `particles`, `songStep`, etc.) and a `requestAnimationFrame` loop.

- **Game loop**: `loop()` → `update(dt)` (physics, collision, energy drain) → `draw()` (canvas render). Runs only while `state === "playing"`; `state` cycles through `ready` / `playing` / `paused` / `gameover`.
- **Synthesized soundtrack**: When no user file is loaded, music is generated live via Web Audio. `updateSong()` advances `songStep` on a BPM-derived clock and calls `playSongStep()`, which triggers `playKick`/`playHat`/`playClap`, `playTone` (melody/bass via `noteToFrequency`), and `playVocal` (formant-filtered fake vocals keyed off `syllables`). Note that **audio steps and visual note spawns are coupled** — `updateSong()` both plays the step and calls `spawnNoteWave()` for it.
- **Tracks**: The `tracks` array defines each song as data — `melody` (note names like `"D5"`, `null` = rest), `bass`, `syllables`, `lanes` (spawn-lane pattern), `bpm`, `duration`, and `palette`. To add a song, append an object with the same shape; `populateTrackSelect()` picks it up automatically.
- **Difficulty**: The `difficulties` map (`easy`/`normal`/`hard`) scales speed, spawn rate, noise-note frequency, energy drain, and penalties. `bpmScale` multiplies the effective tempo, so difficulty changes both the beat clock and note flow. Changing difficulty or track mid-game calls `resetGame()`.
- **User audio upload**: `loadUploadedAudio()` swaps synthesized playback for a real `<audio>` element (`uploadedAudio`) and disables vocals. When present, `playSongStep()` skips synthesis (visual notes still spawn), and song end is driven by the audio's `ended` event / duration rather than `energy`.
- **Note kinds**: `"note"` (catch for score) vs `"noise"` (catch penalizes). `spawnNote()` probabilistically emits noise notes scaling with score; `chooseOpenLane()` load-balances lanes to avoid stacking.

## Key state coupling to watch

- `resetGame()` is the single source of truth for zeroing run state — new fields must be reset there.
- `songElapsed` vs `energy`: a run ends either when the song's duration elapses (`finishSong()`) or energy hits zero (`gameOver()`). Both persist `best` to `localStorage` under `beat-catcher-best`.
- Object URLs from uploads are revoked in `clearUploadedAudio()`; call it (not just reassignment) when replacing uploaded audio to avoid leaks.
- Canvas uses devicePixelRatio scaling in `resize()`; draw in CSS-pixel coordinates (`width`/`height`), not raw canvas pixels.
