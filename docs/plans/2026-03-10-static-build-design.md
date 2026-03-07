# Static Build Design

**Date:** 2026-03-10

## Goal

Add a `build.js` script that pre-generates all TTS audio files and outputs a fully static `dist/` folder that can be served by any static web server — no TTS server required at runtime.

## Architecture

### Build Script (`build.js`)

A Node.js script at the repo root. Requires the chatterbox TTS server to be running at build time (`http://localhost:8000/v1/`). Fails immediately if the server is unreachable.

**Steps:**
1. Dynamically import `src/js/resume-data.js`
2. Extract all narrations with their `data-id` keys
3. For each voice × narration combo, fetch MP3 from chatterbox and save to `dist/audio/{VoiceName}/{data-id}.mp3`
4. Generate `dist/audio/manifest.json`
5. Copy all static assets to `dist/`
6. Inject `<script>window.__STATIC_MODE__ = true;</script>` into `dist/index.html`

**Incremental builds:** Skip files that already exist in `dist/audio/`. Pass `--force` to regenerate all.

**Concurrency:** Sequential requests per voice to avoid overwhelming the server.

**Failure behavior:** Exit immediately if server unreachable. Log individual request failures and continue; report all failures at end with non-zero exit code.

### Voice Config

```js
const VOICES = [
  { name: 'Rob',   id: 'rob',   person: 'first' },
  { name: 'Chris', id: 'chris', person: 'third' },
  { name: 'Jimi',  id: 'jimi',  person: 'third' },
  { name: 'John',  id: 'john',  person: 'third' },
  { name: 'Josh',  id: 'josh',  person: 'third' },
];
```

### Voice Logic

- **Rob**: generates `first` person narration for all items
- **Chris/Jimi/John/Josh**: generates `third` person narration only for items where `narration.voice` is not `"Rob"`

### Narration Extraction

| Item type | `data-id` pattern | Narration field |
|---|---|---|
| `h1`, `h2` | `{item.id}` | `item.narration` |
| `experience` title | `{item.id}-title` | `item.titleNarration` |
| `experience` date | `{item.id}-date` | `item.dateNarration` |
| `experience` bullet | `{item.id}-bullet-{idx}` | `item.bullets[idx].narration` |
| `ul` list item | `{li.id}` | `li.narration` |

## Manifest Format

`dist/audio/manifest.json`:

```json
{
  "voices": [
    { "name": "Rob",   "id": "rob"   },
    { "name": "Chris", "id": "chris" },
    { "name": "Jimi",  "id": "jimi"  },
    { "name": "John",  "id": "john"  },
    { "name": "Josh",  "id": "josh"  }
  ],
  "audio": {
    "rob":   { "header-name": "audio/Rob/header-name.mp3", ... },
    "chris": { "header-name": "audio/Chris/header-name.mp3", ... }
  }
}
```

Runtime lookup: `manifest.audio[voiceId][dataId]` → file path. Missing entries (Rob-only items for non-Rob voices) are silently skipped.

## Runtime Changes (minimal)

### `src/js/state.js`
- Add `staticAudioManifest: null` to `mutableState`

### `src/js/app.js`
- On init, if `window.__STATIC_MODE__`, fetch `audio/manifest.json`, store in state, set `remoteTTSAvailable = true`, populate `remoteVoices` from manifest, skip TTS server connection

### `src/js/remote-tts.js`
- `speakWithRemoteTTS` gains optional 5th param `dataId`
- In static mode with a `dataId`, resolve path from manifest and play via existing `playRemoteAudio` pipeline instead of fetching from server

### `src/js/speech.js`
- 3 call sites for `speakWithRemoteTTS` pass `el.getAttribute('data-id')` as the 5th argument

### `src/js/effects-ui.js`
- Hide `#server-status` and `#server-config-panel` when `window.__STATIC_MODE__` is true

## `dist/` Structure

```
dist/
  index.html                  (copy + __STATIC_MODE__ injected)
  src/
    css/styles.css
    js/*.js                   (all JS files copied)
    img/                      (all images copied)
  audio/
    manifest.json
    Rob/
      header-name.mp3
      section-experience.mp3
      exp-panorama-head-title.mp3
      ... (all items, first person)
    Chris/
      header-name.mp3
      ... (non-Rob items only, third person)
    Jimi/   (same as Chris)
    John/   (same as Chris)
    Josh/   (same as Chris)
```
