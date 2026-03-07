#!/usr/bin/env bun
// build.tts.test.mjs
import assert from 'node:assert/strict';
import { extractNarrations } from './build.tts.mjs';
import path from 'node:path';

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

// Manifest grouping shape test
const mockGenerated = [
  { dataId: 'header-name', voiceId: 'rob', voiceName: 'Rob' },
  { dataId: 'header-name', voiceId: 'chris', voiceName: 'Chris' },
  { dataId: 'section-about', voiceId: 'rob', voiceName: 'Rob' },
];

const audio = {};
for (const { dataId, voiceId, voiceName } of mockGenerated) {
  if (!audio[voiceId]) audio[voiceId] = {};
  audio[voiceId][dataId] = `audio/${voiceName}/${dataId}.mp3`;
}
assert.equal(audio.rob['header-name'], 'audio/Rob/header-name.mp3', 'Rob manifest path');
assert.equal(audio.chris['header-name'], 'audio/Chris/header-name.mp3', 'Chris manifest path');
assert.ok(!audio.chris?.['section-about'], 'Chris does not have Rob-only entry');
console.log('Manifest shape tests passed!');
