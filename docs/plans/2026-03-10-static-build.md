# Static Build Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a `build.mjs` script that pre-generates all TTS audio files and outputs a fully static `dist/` folder serveable without any TTS server.

**Architecture:** `build.mjs` imports `resume-data.js`, extracts all narrations per voice, calls the chatterbox TTS server for each, saves MP3s to `dist/audio/{VoiceName}/`, generates a manifest, and copies all static assets. Runtime JS detects `window.__STATIC_MODE__` and uses manifest lookups instead of live TTS calls.

**Tech Stack:** Node.js ESM (`build.mjs`), chatterbox TTS API (`POST /v1/audio/speech`), `node:fs/promises`, `node:path`, `node:assert` for tests.

**Design doc:** `docs/plans/2026-03-10-static-build-design.md`

---

### Task 1: Create `build.mjs` skeleton with health check

**Files:**
- Create: `build.mjs`

**Step 1: Create the file with config and health check**

```js
// build.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import { createWriteStream } from 'node:fs';

const TTS_SERVER = process.env.TTS_SERVER || 'http://localhost:8000/v1/';
const DIST_DIR = 'dist';
const FORCE = process.argv.includes('--force');

const VOICES = [
  { name: 'Rob',   id: 'rob',   person: 'first'  },
  { name: 'Chris', id: 'chris', person: 'third'  },
  { name: 'Jimi',  id: 'jimi',  person: 'third'  },
  { name: 'John',  id: 'john',  person: 'third'  },
  { name: 'Josh',  id: 'josh',  person: 'third'  },
];

const checkServer = async () => {
  const url = TTS_SERVER.replace('/v1/', '').replace(/\/$/, '') + '/healthz';
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
};

const main = async () => {
  console.log('Checking TTS server...');
  const ok = await checkServer();
  if (!ok) {
    console.error(`ERROR: TTS server not reachable at ${TTS_SERVER}`);
    process.exit(1);
  }
  console.log('TTS server OK');
};

main().catch(e => { console.error(e); process.exit(1); });
```

**Step 2: Verify script runs and exits cleanly (server must be running)**

```bash
node build.mjs
```

Expected output: `TTS server OK`

If server is not running, expected: `ERROR: TTS server not reachable at http://localhost:8000/v1/` and exit code 1.

**Step 3: Commit**

```bash
git add build.mjs
git commit -m "feat: add build.mjs skeleton with TTS health check"
```

---

### Task 2: Narration extraction function + tests

**Files:**
- Modify: `build.mjs`
- Create: `build.test.mjs`

**Step 1: Add `extractNarrations` to `build.mjs` (before `main`)**

```js
/**
 * Extract all narration items from resumeData for each voice.
 * Returns array of { dataId, voiceId, voiceName, text, outputPath }
 */
export const extractNarrations = (resumeData, voices) => {
  const items = [];

  const addItem = (dataId, narration, voices) => {
    if (!narration) return;
    for (const voice of voices) {
      // Skip Rob-only items for non-Rob voices
      if (narration.voice && narration.voice.toLowerCase() !== voice.id) continue;
      const text = voice.person === 'first'
        ? (narration.first || narration.third)
        : (narration.third || narration.first);
      if (!text) continue;
      items.push({
        dataId,
        voiceId: voice.id,
        voiceName: voice.name,
        text,
        outputPath: path.join(DIST_DIR, 'audio', voice.name, `${dataId}.mp3`),
      });
    }
  };

  for (const item of resumeData) {
    if (item.type === 'h1' || item.type === 'h2') {
      addItem(item.id, item.narration, voices);
    } else if (item.type === 'experience') {
      addItem(`${item.id}-title`, item.titleNarration, voices);
      addItem(`${item.id}-date`, item.dateNarration, voices);
      item.bullets?.forEach((bullet, idx) => {
        addItem(`${item.id}-bullet-${idx}`, bullet.narration, voices);
      });
    } else if (item.type === 'ul') {
      item.items?.forEach(li => addItem(li.id, li.narration, voices));
    }
  }

  return items;
};
```

**Step 2: Create `build.test.mjs`**

```js
// build.test.mjs
import assert from 'node:assert/strict';
import { extractNarrations } from './build.mjs';

const TEST_VOICES = [
  { name: 'Rob',   id: 'rob',   person: 'first'  },
  { name: 'Chris', id: 'chris', person: 'third'  },
];

const TEST_DATA = [
  {
    id: 'header-name',
    type: 'h1',
    text: 'Rob Higgins',
    narration: { first: 'Hi I am Rob', third: 'This is Rob' }
  },
  {
    id: 'section-about',
    type: 'h2',
    text: 'About me',
    narration: { voice: 'Rob', first: 'About me narration' }
  },
  {
    id: 'exp-test',
    type: 'experience',
    company: 'Test Co',
    role: 'Engineer',
    date: '2024',
    titleNarration: { first: 'I was engineer', third: 'Rob was engineer' },
    dateNarration: { first: 'for one year', third: 'for one year' },
    bullets: [
      { text: 'Did stuff', narration: { first: 'I did stuff', third: 'Rob did stuff' } }
    ]
  },
  {
    id: 'skills-list',
    type: 'ul',
    items: [
      { id: 'skill-1', text: 'JS', narration: { first: 'I know JS', third: 'Rob knows JS' } }
    ]
  }
];

const result = extractNarrations(TEST_DATA, TEST_VOICES);

// Rob gets all items, first person
const rob = result.filter(r => r.voiceId === 'rob');
assert.ok(rob.find(r => r.dataId === 'header-name' && r.text === 'Hi I am Rob'), 'Rob header narration');
assert.ok(rob.find(r => r.dataId === 'section-about' && r.text === 'About me narration'), 'Rob about narration');
assert.ok(rob.find(r => r.dataId === 'exp-test-title' && r.text === 'I was engineer'), 'Rob exp title');
assert.ok(rob.find(r => r.dataId === 'exp-test-date' && r.text === 'for one year'), 'Rob exp date');
assert.ok(rob.find(r => r.dataId === 'exp-test-bullet-0' && r.text === 'I did stuff'), 'Rob bullet');
assert.ok(rob.find(r => r.dataId === 'skill-1' && r.text === 'I know JS'), 'Rob ul item');

// Chris skips Rob-only items, uses third person
const chris = result.filter(r => r.voiceId === 'chris');
assert.ok(chris.find(r => r.dataId === 'header-name' && r.text === 'This is Rob'), 'Chris header narration');
assert.ok(!chris.find(r => r.dataId === 'section-about'), 'Chris skips Rob-only');
assert.ok(chris.find(r => r.dataId === 'exp-test-title' && r.text === 'Rob was engineer'), 'Chris exp title');
assert.ok(chris.find(r => r.dataId === 'skill-1' && r.text === 'Rob knows JS'), 'Chris ul item');

// Output paths are correct
const robHeader = rob.find(r => r.dataId === 'header-name');
assert.ok(robHeader.outputPath.includes(path.join('audio', 'Rob', 'header-name.mp3')), 'Rob output path');

console.log('All extraction tests passed!');
```

**Step 3: Run the tests**

```bash
node build.test.mjs
```

Expected: `All extraction tests passed!`

**Step 4: Commit**

```bash
git add build.mjs build.test.mjs
git commit -m "feat: add narration extraction with tests"
```

---

### Task 3: Audio fetching and saving

**Files:**
- Modify: `build.mjs`

**Step 1: Add `fetchAndSaveAudio` function to `build.mjs` (before `main`)**

```js
const fetchAndSaveAudio = async (text, voiceId, outputPath) => {
  if (!FORCE) {
    try {
      await fs.access(outputPath);
      return { skipped: true };
    } catch {
      // File doesn't exist, proceed
    }
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  const response = await fetch(`${TTS_SERVER}audio/speech`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: text, voice: voiceId, response_format: 'mp3', stream: false }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => '');
    throw new Error(`TTS ${response.status} for voice=${voiceId} text="${text.slice(0, 40)}...": ${err}`);
  }

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength === 0) throw new Error('Received empty audio response');

  await fs.writeFile(outputPath, Buffer.from(buffer));
  return { skipped: false };
};
```

**Step 2: Test manually by temporarily calling the function in `main`**

At end of `main`, add temporarily:
```js
  const testPath = path.join(DIST_DIR, 'audio', 'Rob', 'test.mp3');
  await fetchAndSaveAudio('Hello world test', 'rob', testPath);
  console.log('Test audio saved to', testPath);
  process.exit(0); // remove after testing
```

Run:
```bash
node build.mjs
```

Expected: `Test audio saved to dist/audio/Rob/test.mp3` and a valid MP3 file exists at that path.

**Step 3: Remove the temporary test code from `main`, commit**

```bash
git add build.mjs
git commit -m "feat: add audio fetch and save with incremental skip"
```

---

### Task 4: Manifest generation

**Files:**
- Modify: `build.mjs`

**Step 1: Add `generateManifest` function to `build.mjs` (before `main`)**

```js
const generateManifest = async (voices, generated) => {
  const audio = {};
  for (const { dataId, voiceId, voiceName, outputPath } of generated) {
    if (!audio[voiceId]) audio[voiceId] = {};
    // Store as a relative URL path (forward slashes, no leading slash)
    audio[voiceId][dataId] = `audio/${voiceName}/${dataId}.mp3`;
  }

  const manifest = {
    voices: voices.map(v => ({ name: v.name, id: v.id })),
    audio,
  };

  const manifestPath = path.join(DIST_DIR, 'audio', 'manifest.json');
  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`Manifest written: ${manifestPath}`);
};
```

**Step 2: Add a test for manifest shape in `build.test.mjs`**

Add at the end of `build.test.mjs` (import `generateManifest` too):

```js
// Note: generateManifest is async and writes to disk; test the shape of its input logic only
const mockGenerated = [
  { dataId: 'header-name', voiceId: 'rob', voiceName: 'Rob', outputPath: 'dist/audio/Rob/header-name.mp3' },
  { dataId: 'header-name', voiceId: 'chris', voiceName: 'Chris', outputPath: 'dist/audio/Chris/header-name.mp3' },
  { dataId: 'section-about', voiceId: 'rob', voiceName: 'Rob', outputPath: 'dist/audio/Rob/section-about.mp3' },
];

// Simulate the grouping logic manually
const audio = {};
for (const { dataId, voiceId, voiceName } of mockGenerated) {
  if (!audio[voiceId]) audio[voiceId] = {};
  audio[voiceId][dataId] = `audio/${voiceName}/${dataId}.mp3`;
}
assert.equal(audio.rob['header-name'], 'audio/Rob/header-name.mp3', 'Rob manifest path');
assert.equal(audio.chris['header-name'], 'audio/Chris/header-name.mp3', 'Chris manifest path');
assert.ok(!audio.chris['section-about'], 'Chris does not have Rob-only entry');
console.log('Manifest shape tests passed!');
```

**Step 3: Run tests**

```bash
node build.test.mjs
```

Expected: `All extraction tests passed!` + `Manifest shape tests passed!`

**Step 4: Commit**

```bash
git add build.mjs build.test.mjs
git commit -m "feat: add manifest generation"
```

---

### Task 5: Static asset copying + `__STATIC_MODE__` injection

**Files:**
- Modify: `build.mjs`

**Step 1: Add `copyStaticAssets` function to `build.mjs`**

```js
const copyDir = async (src, dest) => {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
};

const copyStaticAssets = async () => {
  // Copy src/ directory
  await copyDir('src', path.join(DIST_DIR, 'src'));
  console.log('Copied src/');

  // Copy and modify index.html - inject __STATIC_MODE__ before app.js script tag
  let html = await fs.readFile('index.html', 'utf-8');
  const injection = '<script>window.__STATIC_MODE__ = true;</script>\n  ';
  html = html.replace(
    '<script type="module" src="src/js/app.js"></script>',
    `${injection}<script type="module" src="src/js/app.js"></script>`
  );
  await fs.writeFile(path.join(DIST_DIR, 'index.html'), html);
  console.log('Copied and patched index.html');
};
```

**Step 2: Wire everything together in `main`**

Replace the `main` function body with:

```js
const main = async () => {
  console.log('Checking TTS server...');
  const ok = await checkServer();
  if (!ok) {
    console.error(`ERROR: TTS server not reachable at ${TTS_SERVER}`);
    process.exit(1);
  }
  console.log('TTS server OK');

  // Load resume data
  const { resumeData } = await import('./src/js/resume-data.js');

  // Extract all narration items
  const narrations = extractNarrations(resumeData, VOICES);
  console.log(`Found ${narrations.length} narration items to generate`);

  // Generate audio files
  const failures = [];
  let generated = 0, skipped = 0;

  for (const item of narrations) {
    try {
      const result = await fetchAndSaveAudio(item.text, item.voiceId, item.outputPath);
      if (result.skipped) {
        skipped++;
        process.stdout.write('.');
      } else {
        generated++;
        process.stdout.write('+');
      }
    } catch (e) {
      failures.push({ item, error: e.message });
      process.stdout.write('!');
    }
  }
  process.stdout.write('\n');
  console.log(`Generated: ${generated}, Skipped: ${skipped}, Failed: ${failures.length}`);

  if (failures.length > 0) {
    console.error('\nFailed items:');
    for (const { item, error } of failures) {
      console.error(`  [${item.voiceId}] ${item.dataId}: ${error}`);
    }
  }

  // Generate manifest (only from successful/skipped items)
  const succeeded = narrations.filter(
    n => !failures.find(f => f.item.dataId === n.dataId && f.item.voiceId === n.voiceId)
  );
  await generateManifest(VOICES, succeeded);

  // Copy static assets
  await fs.mkdir(DIST_DIR, { recursive: true });
  await copyStaticAssets();

  console.log(`\nBuild complete! Output: ${DIST_DIR}/`);

  if (failures.length > 0) {
    process.exit(1);
  }
};
```

**Step 3: Run a full build**

```bash
node build.mjs
```

Expected output:
```
Checking TTS server...
TTS server OK
Found N narration items to generate
+++++...+++++
Generated: X, Skipped: Y, Failed: 0
Manifest written: dist/audio/manifest.json
Copied src/
Copied and patched index.html

Build complete! Output: dist/
```

Verify `dist/index.html` contains `window.__STATIC_MODE__ = true;`

Verify `dist/audio/manifest.json` exists and has the right shape.

Verify `dist/audio/Rob/header-name.mp3` exists and plays.

**Step 4: Commit**

```bash
git add build.mjs
git commit -m "feat: add static asset copy and full build wiring"
```

---

### Task 6: Add `staticAudioManifest` to state

**Files:**
- Modify: `src/js/state.js`

**Step 1: Add field to `mutableState`**

In `src/js/state.js`, find the `mutableState` object and add one line:

```js
// After existing fields, add:
staticAudioManifest: null,
```

The full `mutableState` object starts around line 19. Add `staticAudioManifest: null,` after the last existing field before the closing `}`.

**Step 2: Verify the file is valid by checking the browser console has no errors** (load `index.html` in browser, open devtools)

**Step 3: Commit**

```bash
git add src/js/state.js
git commit -m "feat: add staticAudioManifest to mutableState"
```

---

### Task 7: Static mode init in `app.js`

**Files:**
- Modify: `src/js/app.js`

**Step 1: Add static mode initialization block in `initializeApp`**

In `src/js/app.js`, find the section after `renderResume('resume-container');` and before `initParallaxModule();`. Insert:

```js
  // Static mode: load manifest and skip TTS server connection
  if (window.__STATIC_MODE__) {
    try {
      const res = await fetch('audio/manifest.json');
      const manifest = await res.json();
      state.mutableState.staticAudioManifest = manifest;
      state.mutableState.remoteTTSAvailable = true;
      state.mutableState.remoteVoices.length = 0;
      state.mutableState.remoteVoices.push(...manifest.voices.map(v => ({ id: v.id, name: v.name })));
      window.remoteVoices = state.mutableState.remoteVoices;
      console.log('[Static Mode] Manifest loaded, voices:', manifest.voices.length);
    } catch (e) {
      console.error('[Static Mode] Failed to load manifest:', e);
    }
  }
```

**Step 2: Wrap the existing TTS server connection block** so it only runs when NOT in static mode.

Find the block starting with `const savedServerUrl = localStorage.getItem('ttsServerUrl');` near the bottom of `initializeApp`. Wrap it:

```js
  if (!window.__STATIC_MODE__) {
    const savedServerUrl = localStorage.getItem('ttsServerUrl');
    if (savedServerUrl) {
      // ... existing connection code unchanged
    } else {
      updateServerStatusUI();
      updateVoiceUploadUI();
    }
  }
```

**Step 3: Also wrap the `initTtsEffectsChain` block** — it should still run in both modes (effects still work):

Leave the `if (window.initTtsEffectsChain)` block as-is (it runs in both modes).

**Step 4: Serve `dist/` and verify in browser**

```bash
npx serve dist
# or: python3 -m http.server 8080 --directory dist
```

Open browser devtools, check console for `[Static Mode] Manifest loaded, voices: 5`. Voice dropdown should show Rob, Chris, Jimi, John, Josh.

**Step 5: Commit**

```bash
git add src/js/app.js
git commit -m "feat: static mode init — load manifest and skip TTS server"
```

---

### Task 8: Static audio playback in `remote-tts.js`

**Files:**
- Modify: `src/js/remote-tts.js`

**Step 1: Add `dataId` parameter to `speakWithRemoteTTS`**

Find the function signature at line 48:
```js
export const speakWithRemoteTTS = async (text, voiceId = null, speed = null, sessionId) => {
```

Change to:
```js
export const speakWithRemoteTTS = async (text, voiceId = null, speed = null, sessionId, dataId = null) => {
```

**Step 2: Add static mode lookup block** at the very top of the function body (after the function signature, before the existing `if (!state.mutableState.remoteTTSAvailable)` check):

```js
  // Static mode: play pre-generated audio file from manifest
  if (state.mutableState.staticAudioManifest && dataId) {
    const resolvedVoiceId = voiceId || 'rob';
    const filePath = state.mutableState.staticAudioManifest.audio?.[resolvedVoiceId]?.[dataId];
    if (!filePath) {
      // This voice has no audio for this item (e.g. Rob-only item for Chris)
      return { success: false, canceled: false };
    }

    if (!sessionId || !isPlaybackSessionActive(sessionId)) {
      return { success: false, canceled: true };
    }

    try {
      const res = await fetch(filePath);
      if (!res.ok) throw new Error(`Failed to fetch ${filePath}: ${res.status}`);
      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const playbackResult = await state.playRemoteAudio(audioUrl, sessionId);
      URL.revokeObjectURL(audioUrl);
      if (playbackResult.canceled) return { success: false, canceled: true };
      return { success: playbackResult.completed, canceled: false };
    } catch (e) {
      console.error('[Static] Audio playback error:', e.message);
      return { success: false, canceled: false };
    }
  }
```

**Step 3: Verify browser console has no errors** loading `dist/` with devtools open.

**Step 4: Commit**

```bash
git add src/js/remote-tts.js
git commit -m "feat: static audio playback via manifest in speakWithRemoteTTS"
```

---

### Task 9: Pass `data-id` from speech.js call sites

**Files:**
- Modify: `src/js/speech.js`

There are 3 call sites where `window.speakWithRemoteTTS(text, activeVoiceName, null, sessionId)` is called. Each needs `el.getAttribute('data-id')` as the 5th argument.

**Step 1: Find and update all 3 call sites**

Search for `speakWithRemoteTTS` in `src/js/speech.js`. There are 3 occurrences (in `speakElement`, `speakFrom`, and `speakAll`).

Change each from:
```js
const result = await window.speakWithRemoteTTS(text, activeVoiceName, null, sessionId);
```

To:
```js
const result = await window.speakWithRemoteTTS(text, activeVoiceName, null, sessionId, el.getAttribute('data-id'));
```

**Step 2: Serve `dist/` and test end-to-end**

```bash
npx serve dist
```

Open browser, click on "Rob Higgins" heading. Audio should play from `dist/audio/Rob/header-name.mp3`.

Switch voice to "Chris" in the dropdown, click the heading again. Audio should play from `dist/audio/Chris/header-name.mp3`.

Click on "About me" section with Chris selected — it should silently skip (Rob-only section).

**Step 3: Commit**

```bash
git add src/js/speech.js
git commit -m "feat: pass data-id to speakWithRemoteTTS for static audio lookup"
```

---

### Task 10: Hide server UI in static mode (`effects-ui.js`)

**Files:**
- Modify: `src/js/effects-ui.js`

**Step 1: Find where the HUD is initialized**

Search `src/js/effects-ui.js` for `server-status`. Find the `initEffectsModule` function or wherever the HUD is set up.

**Step 2: Add static mode UI suppression**

In the HUD initialization (wherever effects-ui initializes the DOM), add after the DOM is ready:

```js
if (window.__STATIC_MODE__) {
  const serverStatus = document.getElementById('server-status');
  if (serverStatus) serverStatus.style.display = 'none';
  const serverConfigPanel = document.getElementById('server-config-panel');
  if (serverConfigPanel) serverConfigPanel.style.display = 'none';
  const serverConfigBtn = document.getElementById('server-config-btn');
  if (serverConfigBtn) serverConfigBtn.style.display = 'none';
}
```

Find the right place: look for `initEffectsModule` export or any function that runs on DOM init. It should go where the HUD elements are first manipulated.

**Step 3: Re-run build and verify in browser**

```bash
node build.mjs --force   # regenerate dist with updated JS
npx serve dist
```

Open browser. The server status indicator should not be visible. Voice dropdown should show Rob, Chris, Jimi, John, Josh. Clicking resume items should play audio. Effects HUD should still work.

**Step 4: Commit**

```bash
git add src/js/effects-ui.js
git commit -m "feat: hide server status UI in static mode"
```

---

### Task 11: Final build run, verification, and cleanup

**Step 1: Clean build from scratch**

```bash
rm -rf dist
node build.mjs
```

Expected: all audio files generated (not skipped), manifest written, assets copied.

**Step 2: Count generated files**

```bash
find dist/audio -name '*.mp3' | wc -l
```

Expected: roughly 5 voices × ~30 items, but accounting for Rob-only exclusions, approximately 130–150 MP3 files total.

**Step 3: Serve and do a full walkthrough**

```bash
npx serve dist
```

- Open browser, open devtools console (should have no errors)
- Check `[Static Mode] Manifest loaded, voices: 5` in console
- Press spacebar — full resume should auto-read aloud from Rob's voice
- Switch to Chris in dropdown, click a heading — should play Chris's audio
- Click the "About me" section with Chris selected — should silently skip
- Audio effects (reverb, distortion, etc.) should still process the audio

**Step 4: Verify incremental build skips existing files**

```bash
node build.mjs
```

Expected: all dots (`.`) indicating skipped, `Generated: 0, Skipped: N`.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: complete static build pipeline"
```
