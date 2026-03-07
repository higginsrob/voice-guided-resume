# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

This is a personal resume website consisting of a single HTML file with embedded CSS and JavaScript.

### File Structure
- `index.html` - Single-page resume with parallax effects, dialogue-based TTS, and interactive features
- `resume.md` - Plain text markdown version of the resume content
- `docs/plans/` - Implementation plans and design documents

### Key Technologies
- Vanilla HTML5, CSS3, and JavaScript (no frameworks or build tools)
- Web Speech API for dialogue-based text-to-speech functionality
- Tone.js library for real-time audio effects processing
- CSS transforms and `requestAnimationFrame` for parallax effects

### Dialogue System

The TTS system has been modified to speak "dialogue" instead of reading resume lines verbatim. The `dialogueMap` object maps resume content to natural-sounding narration:

- **`h1`, `h2`, `h3`**: Arrays of dialogue options for section headings
- **`.date`**: Arrays of date-formatted dialogue (e.g., "October twenty-twenty-four...")
- **`li`**: Object mapping exact list item text to dialogue arrays

When speech is triggered, `generateDialogue(element)` returns appropriate narration by:
1. Checking the element's tag name for headings
2. Checking for the `.date` class
3. Looking up exact text matches for `<li>` elements

### TTS Audio Effects System

The resume includes a real-time audio effects processing chain powered by Tone.js. Users can manipulate effects and save presets.

**Effects Chain (8 effects):**
- Distortion/Overdrive - adds harmonic saturation
- Chorus - modulation effect
- Reverb - spatial convolution reverb
- Delay - echo with feedback control
- Compressor - dynamic range control
- 4-Band EQ - Low, Mid-Low, Mid-High, High frequency controls
- Phaser - phase-shifting modulation
- Filter - lowpass/highpass with resonance

**HUD Interface:**
- Fixed bottom-left panel showing all effects
- Draggable effect slots for reordering the chain
- Per-effect controls (wet/dry mix, effect-specific parameters)
- Voice selector dropdown
- Preset management: New, Save, Delete buttons

**Preset System:**
- Presets saved to localStorage with key `tts_preset_<name>`
- Last-used preset auto-loads on page load
- Settings (chain order, effect params, enabled states) persisted

### Notable Features
1. **Parallax Background** - 8 shapes sweep horizontally based on scroll position using sine-wave math
2. **Dynamic Brightness** - Text elements near the viewport center brighten as you scroll
3. **Dialogue TTS System** - Instead of reading resume text verbatim, the system speaks natural dialogue that a narrator would use to present the material
4. **Interactive** - Click any line or use spacebar to control playback; continuous reading through the entire resume
5. **Responsive Design** - Mobile-friendly padding and font size adjustments at 600px breakpoint
6. **TTS Audio Effects** - Real-time audio effects chain with reverb, delay, distortion, compression, and 4-band EQ
7. **HUD Interface** - Collapsible bottom-left panel with draggable effects, real-time parameter controls
8. **Preset System** - Save/load audio effects configurations to localStorage with name-based preset management

### Known Issues
- CSS defines 3 shape classes but HTML references 8 shapes (shapes 4-8 lack styling)
- Tone.js initialization requires user interaction (browser autoplay policy)
- The effects chain connects to Tone.js AudioContext; full Web Speech API integration requires additional audio buffer processing for maximum fidelity
