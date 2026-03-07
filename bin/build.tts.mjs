#!/usr/bin/env bun
// build.tts.mjs
import fs from 'node:fs/promises';
import path from 'node:path';

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

const generateManifest = async (voices, generated) => {
  const audio = {};
  for (const { dataId, voiceId, voiceName } of generated) {
    if (!audio[voiceId]) audio[voiceId] = {};
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


const main = async () => {
  console.log('Checking TTS server...');
  const ok = await checkServer();
  if (!ok) {
    console.error(`ERROR: TTS server not reachable at ${TTS_SERVER}`);
    process.exit(1);
  }
  console.log('TTS server OK');

  // Load resume data
  const { resumeData } = await import('../src/js/resume-data.js');

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

  console.log(`\nTTS build complete! Audio output: ${DIST_DIR}/audio/`);

  if (failures.length > 0) {
    process.exit(1);
  }
};

main().catch(e => { console.error(e); process.exit(1); });
