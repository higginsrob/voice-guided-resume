# Voice-Guided Resume

An interactive personal resume that narrates itself. Click any line (or press spacebar) and the page reads through Rob Higgins’ experience using pre-generated cloned voices, with a Tone.js effects chain you can twist while it plays.

**Live demo:** [higginsrob.github.io/voice-guided-resume](https://higginsrob.github.io/voice-guided-resume/)

Ships as a fully static site from `dist/` (GitHub Pages).

## Features

- **Narrated resume** — first-person (Rob) and third-person (reference) voice clones, not verbatim line reading
- **Click or spacebar** — start continuous playback, jump from any line, play/pause
- **Parallax UI** — scrolling background shapes and brightness that tracks the viewport center
- **Audio effects HUD** — reverb, delay, distortion, chorus, phaser, compressor, filter, and 4-band EQ; drag to reorder the chain; save presets in `localStorage`
- **Static TTS** — MP3s pre-baked at build time so no TTS server is required at runtime

## Stack

- Vanilla HTML, CSS, and ES modules (no framework)
- [Tone.js](https://tonejs.github.io/) for the effects chain
- [Bun](https://bun.com) for build scripts and tests
- Optional [Chatterbox](https://github.com/resemble-ai/chatterbox) TTS server for regenerating audio

## Project layout

```
index.html              # App shell
src/
  css/styles.css
  js/
    app.js              # Boot + static-mode wiring
    resume-data.js      # Content + narrations (source of truth)
    renderer.js         # DOM from resume data
    speech.js           # Playback / dialogue selection
    remote-tts.js       # Live TTS or static MP3 playback
    effects-ui.js       # Effects HUD + presets
    parallax.js
    robot-ui.js
    state.js
  img/
bin/
  build.app.mjs         # Copy assets → dist/, inject __STATIC_MODE__
  build.tts.mjs         # Generate MP3s + audio/manifest.json
dist/                   # Static site output (served / deployed)
```

## Quick start

Requires [Bun](https://bun.com).

```bash
bun install
bun run build:app
bun run dev
```

`dev` serves `dist/` with `http-server`. Open the URL it prints (usually `http://localhost:8080`).

> Audio playback needs a user gesture (browser autoplay policy). Click the page or press space once.

Pre-generated voice audio under `dist/audio/` is expected for the full experience. If those files are missing, run the TTS build (below) or rely on browser speech as a fallback when not in static mode.

## Scripts

| Command | Description |
|---|---|
| `bun run build:app` | Build static app into `dist/` |
| `bun run build:tts` | Generate voice MP3s into `dist/audio/` (needs TTS server) |
| `bun run build:all` | App + TTS |
| `bun run build:ci` | App-only build used by GitHub Actions |
| `bun run dev` | Serve `dist/` locally |
| `bun run test` | App + TTS tests |
| `bun run test:ci` | App tests only (CI) |

## Regenerating TTS audio

With a Chatterbox-compatible server at `http://localhost:8000`:

```bash
bun run build:tts
```

- Incremental by default (skips existing files)
- Pass `--force` to regenerate everything: `bun run build:tts -- --force`
- Override the server URL with `TTS_SERVER` (default `http://localhost:8000/v1/`)

Voices: **Rob** (first person), **Chris / Jimi / John / Josh** (third person). Narration text lives in `src/js/resume-data.js`.

## Deploy

Pushes to `main` run [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml): `bun run build:ci`, then publish `dist/` to GitHub Pages.

Commit pre-generated `dist/audio/` (or regenerate in CI with a TTS server) so the live site has narration files.

## Controls

| Input | Action |
|---|---|
| Click a resume line | Start from the top (first click) or jump and continue from that line |
| Space | Play / pause |
| HUD (bottom-left) | Voice select, effects, presets |

## License

Private personal project.
