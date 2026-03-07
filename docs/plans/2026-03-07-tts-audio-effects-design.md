# TTS Audio Effects Design Document

**Date:** 2026-03-07
**Feature:** Tone.js-based audio effects chain for TTS audio processing

---

## Overview

Add a real-time audio effects processing chain to the resume website's TTS system. Users can manipulate effects (reverb, delay, distortion, compression, EQ, etc.) via a HUD interface, save presets to local storage, and have settings persist across page loads.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Web Speech API (TTS)                    │
│                    utterance → AudioBuffer                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Tone.js AudioContext                     │
│                 ( Effects Chain - Draggable )               │
│                                                             │
│   ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐           │
│   │Effect 1│→ │Effect 2│→ │Effect 3│→ │Effect 4│→ ...     │
│   │(Draggable)│ │(Draggable)│ │(Draggable)│ │(Draggable)│ │
│   └────────┘  └────────┘  └────────┘  └────────┘           │
│                                                             │
│   Each effect has:                                         │
│   - Toggle (on/off)                                        │
│   - Wet knob (dry/wet mix)                                 │
│   - Effect-specific parameters                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                       Destination (Speakers)                │
└─────────────────────────────────────────────────────────────┘
                         ▲
                         │
┌────────────────────────┴────────────────────────────────────┐
│                    HUD Interface                            │
│   - Voice selector (dropdown)                              │
│   - Effects chain (draggable, reorderable)                 │
│   - Effect controls (sliders, knobs, toggles)              │
│   - Preset controls (New, Save, Delete)                    │
│   - Collapse/expand toggle                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Tone.js Integration
1. Add Tone.js library via CDN
2. Initialize Tone.AudioContext
3. Create effects units: Distortion, Chorus, Reverb, Delay, Compressor, FXFilter, Phaser
4. Build effects chain with configurable order

### Phase 2: HUD Interface
1. Create CSS for HUD panel (fixed position, dark theme, subtle)
2. Build HTML structure for HUD:
   - Header with voice selector
   - Effects slots container (draggable blocks)
   - Controls panel (effect parameters)
   - Preset buttons (New, Save, Delete)
3. Implement collapse/expand functionality

### Phase 3: Effects Controls
1. Per-effect controls:
   - Enable/disable toggle
   - Wet/dry mix slider
   - Effect-specific parameters (e.g., reverb decay, delay time)
2. Real-time parameter updates
3. Visual feedback for active effects

### Phase 4: Drag & Drop
1. Reorder effects in chain using drag and drop
2. Update chain when order changes
3. Persist current chain order in preset

### Phase 5: Preset System
1. Preset structure:
   ```javascript
   {
     name: string,
     voiceName: string,
     chainOrder: string[],  // effect names in order
     effects: {            // per-effect settings
       [effectName]: {
         enabled: boolean,
         wet: number,
         [paramName]: value
       }
     }
   }
   ```
2. Storage: localStorage with key `tts_preset_<presetName>`
3. Operations: New, Save, Delete, Load
4. Auto-restore on page load (last used preset)

### Phase 6: TTS Integration
1. Capture utterance audio via Web Audio API
2. Route through effects chain
3. Output to destination
4. Handle voice selection changes

---

## Technical Details

### Effects Chain (8 Effects)

| Effect | Key Parameters |
|--------|----------------|
| Distortion | amount (0-100), oversample (none/2x/4x) |
| Chorus | rate, depth, feedback, delay, spread |
| Reverb | decay, preDelay, filterFreq, filterQ, mix |
| Delay | time, feedback, filterFreq |
| Compressor | threshold, knee, ratio, attack, release, makeUp |
| Low EQ | frequency, gain, Q |
| Mid-Low EQ | frequency, gain, Q |
| Mid-High EQ | frequency, gain, Q |
| High EQ | frequency, gain, Q |
| Phaser | rate, depth, feedback, mix, steps |
| Filter | frequency, Q, type (lowpass/highpass/bandpass) |

### HUD Layout

```
┌─────────────────────────────────────┐
│  TTS Effects  ▼  Voice: [Select]   │
├─────────────────────────────────────┤
│  [ ] Distortion  Wet: ──●──────   │
│  [ ] Chorus      Wet: ─────●───   │
│  [ ] Reverb      Wet: ───────●──   │
│  [ ] Delay       Wet: ───●──────   │
│  [ ] Compressor  Wet: ─────●───   │
│  [ ] Low EQ      Wet: ──●──────   │
│  [ ] Mid-Low EQ  Wet: ───────●──   │
│  [ ] Mid-High EQ Wet: ───────●──   │
│  [ ] High EQ     Wet: ───────●──   │
│  [ ] Phaser      Wet: ──●──────   │
│  [ ] Filter      Wet: ─────●───   │
│                                     │
│  [New] [Save] [Delete] [▼ Presets] │
└─────────────────────────────────────┘
```

### Storage Schema

```javascript
// Last used preset
localStorage['tts_lastPreset'] = 'My Custom Preset';

// Individual presets
localStorage['tts_preset_My Custom Preset'] = JSON.stringify({
  name: 'My Custom Preset',
  voiceName: 'Google US English',
  chainOrder: ['distortion', 'reverb', 'delay', 'compressor', 'eq'],
  effects: {
    distortion: { enabled: true, wet: 0.3, amount: 50 },
    reverb: { enabled: true, wet: 0.6, decay: 2, preDelay: 0.05 },
    // ...
  }
});
```

---

## Success Criteria

- [ ] Tone.js library loads successfully
- [ ] Audio effects chain processes TTS audio in real-time
- [ ] HUD displays all 8 effects with controls
- [ ] Effects can be reordered via drag and drop
- [ ] Presets can be saved, loaded, and deleted
- [ ] Settings persist in localStorage
- [ ] Voice selection works from HUD
- [ ] UI is responsive and doesn't break on mobile

---

## Future Enhancements (Out of Scope)

- Import/export presets as JSON files
- Preset library (predefined presets: "Clean", "Radio", "Podcast", "Distorted")
- Audio visualization (waveform/spectrum)
- Preset categories/tags
- Cloud sync of presets
