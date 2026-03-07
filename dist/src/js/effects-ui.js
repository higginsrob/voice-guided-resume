/**
 * Effects UI Module - Guitar Pedal Board Edition
 * Handles the TTS effects HUD, pedal board UI, presets, and parameter controls
 */

import * as state from './state.js';

// Pedal definitions - only the 4 main pedals we want to show
const PEDAL_DEFINITIONS = [
  { id: 'reverb', name: 'Reverb', colorClass: 'reverb' },
  { id: 'distortion', name: 'Distortion', colorClass: 'distortion' },
  { id: 'chorus', name: 'Chorus', colorClass: 'chorus' },
  { id: 'phaser', name: 'Phaser', colorClass: 'phaser' }
];

// HUD elements
let hud, hudHeader, hudVoiceSelect;
let pedalRow;
let hudVoiceSelectInitialized = false;

// Effect state listeners for UI updates
const effectsChainEffectIdListeners = {};

// Initialize HUD voice select with all voices
export const initHudVoiceSelect = () => {
  if (!hudVoiceSelect) return;

  hudVoiceSelect.innerHTML = '<option disabled>Choose Narrator</option';

  if (state.mutableState.remoteTTSAvailable && state.mutableState.remoteVoices.length > 0) {
    const myOptgroup = document.createElement('optgroup');
    myOptgroup.label = 'Hear From Me';
    const refrencesOptgroup = document.createElement('optgroup');
    refrencesOptgroup.label = 'My References';
    state.mutableState.remoteVoices.forEach((voice) => {
      const option = document.createElement('option');
      option.value = voice.id;
      option.textContent = voice.name;
      if (voice.name === "Rob") {
        myOptgroup.appendChild(option);
      } else  {
        refrencesOptgroup.appendChild(option);
      }
    });
    hudVoiceSelect.appendChild(myOptgroup);
    hudVoiceSelect.appendChild(refrencesOptgroup);
  } else if (state.mutableState.voices && state.mutableState.voices.length > 0) {
    const optgroup = document.createElement('optgroup');
    optgroup.label = 'Browser Voices';
    state.mutableState.voices.forEach((voice) => {
      const option = document.createElement('option');
      option.value = voice.name;
      option.textContent = voice.name;
      optgroup.appendChild(option);
    });
    hudVoiceSelect.appendChild(optgroup);
  }

  hudVoiceSelectInitialized = true;

  const savedVoice = localStorage.getItem('hudVoiceSelection');
  if (savedVoice) {
    hudVoiceSelect.value = savedVoice;
    if (window.updateVoiceAvatar) {
      window.updateVoiceAvatar(savedVoice);
    }
  }
};

// Create a rotating knob component
const createKnob = (effectId, paramName, paramConfig, initialValue) => {
  const isLarge = (effectId === 'distortion' && paramName === 'gain') || 
                  (effectId === 'reverb' && paramName === 'mix');
  
  const container = document.createElement('div');
  container.className = `knob-container${isLarge ? ' large' : ''}`;
  
  const label = document.createElement('div');
  label.className = 'knob-label';
  label.textContent = paramName;
  
  const knob = document.createElement('div');
  knob.className = `knob-dial${isLarge ? ' large' : ''}`;
  knob.title = `${paramName}: ${initialValue.toFixed(2)} (Drag up/down to adjust)`;
  
  const pointer = document.createElement('div');
  pointer.className = 'knob-pointer';
  knob.appendChild(pointer);
  
  let value = initialValue;
  const { min, max } = paramConfig;
  
  const updateUI = (val) => {
    const percent = (val - min) / (max - min);
    // Rotate from -135deg to 135deg (270 degree sweep)
    const degrees = percent * 270 - 135;
    pointer.style.transform = `rotate(${degrees}deg)`;
    knob.title = `${paramName}: ${val.toFixed(2)} (Drag up/down to adjust)`;
  };
  
  updateUI(value);
  
  let isDragging = false;
  let startY = 0;
  let startValue = 0;
  
  const handleMove = (clientY) => {
    const dy = startY - clientY;
    const range = max - min;
    const pixelsPerUnit = isLarge ? 200 : 150; // Adjust sensitivity
    let newValue = startValue + (dy / pixelsPerUnit) * range;
    newValue = Math.max(min, Math.min(max, newValue));
    
    if (Math.abs(newValue - value) > 0.001) {
      value = newValue;
      updateUI(value);
      updateEffectParam(effectId, paramName, value);
    }
  };
  
  const onMouseMove = (e) => {
    if (isDragging) handleMove(e.clientY);
  };
  
  const onMouseUp = () => {
    isDragging = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'default';
  };
  
  knob.addEventListener('mousedown', (e) => {
    isDragging = true;
    startY = e.clientY;
    startValue = value;
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'ns-resize';
    e.preventDefault();
  });
  
  // Touch support
  const onTouchMove = (e) => {
    if (isDragging) handleMove(e.touches[0].clientY);
  };
  
  const onTouchEnd = () => {
    isDragging = false;
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend', onTouchEnd);
  };
  
  knob.addEventListener('touchstart', (e) => {
    isDragging = true;
    startY = e.touches[0].clientY;
    startValue = value;
    document.addEventListener('touchmove', onTouchMove);
    document.addEventListener('touchend', onTouchEnd);
    e.preventDefault();
  }, { passive: false });

  container.appendChild(knob);
  container.appendChild(label);
  return container;
};

// Render the pedal board
export const rebuildPedalBoardUI = () => {
  if (!pedalRow) return;

  const savedState = getStoredEffectsState();
  pedalRow.innerHTML = '';

  state.chainOrder.forEach(effectId => {
    const effectDef = state.availableEffects.find(e => e.id === effectId);
    if (!effectDef) return;

    const pedalDef = PEDAL_DEFINITIONS.find(p => p.id === effectId);
    if (!pedalDef) return;

    // Create pedal container
    const pedal = document.createElement('div');
    pedal.className = `pedal ${pedalDef.colorClass}`;
    pedal.dataset.effectId = effectId;

    // Knob container area
    const knobArea = document.createElement('div');
    knobArea.className = 'pedal-knob-area';

    // Create knobs for each parameter
    for (const [paramName, paramConfig] of Object.entries(effectDef.params)) {
      const savedValue = savedState.effects && savedState.effects[effectId] && savedState.effects[effectId].params
        ? savedState.effects[effectId].params[paramName]
        : undefined;
      const currentValue = savedValue !== undefined ? savedValue : paramConfig.default;

      const knobContainer = createKnob(effectId, paramName, paramConfig, currentValue);
      knobArea.appendChild(knobContainer);
    }

    // Footswitch area
    const footswitchArea = document.createElement('div');
    footswitchArea.className = 'pedal-footswitch-area';

    // Footswitch (push button bypass)
    const footswitch = document.createElement('div');
    footswitch.className = 'pedal-footswitch';
    footswitch.title = `${pedalDef.name} - Click to bypass`;
    footswitch.addEventListener('click', () => togglePedalEnabled(effectId));

    // LED indicator
    const led = document.createElement('div');
    led.className = `pedal-led ${pedalDef.colorClass}`;
    led.dataset.effectId = effectId;

    footswitchArea.appendChild(led);
    footswitchArea.appendChild(footswitch);

    // Label at bottom
    const label = document.createElement('div');
    label.className = 'pedal-label';
    label.textContent = pedalDef.name;

    pedal.appendChild(label);
    pedal.appendChild(knobArea);
    pedal.appendChild(footswitchArea);

    effectsChainEffectIdListeners[effectId] = { led, footswitch, pedal };

    pedalRow.appendChild(pedal);
  });

  restorePedalStates();
};

// Toggle pedal enabled state
export const togglePedalEnabled = (effectId) => {
  const savedState = getStoredEffectsState();
  const currentEnabled = !!(savedState.effects && savedState.effects[effectId] && savedState.effects[effectId].enabled === true);
  updateEffectEnabled(effectId, !currentEnabled);
};

// Update effect parameter
export const updateEffectParam = (effectId, paramName, value) => {
  if (state.effectUnits[effectId]) {
    const effect = state.effectUnits[effectId];
    try {
      switch (effectId) {
        case 'reverb':
          if (paramName === 'mix') effect.wet.value = value;
          break;
        case 'distortion':
          if (paramName === 'gain') effect.distortion = value;
          break;
        case 'chorus':
          if (paramName === 'rate') effect.frequency.value = value;
          else if (paramName === 'depth') effect.depth = value;
          else if (paramName === 'feedback') effect.feedback.value = value;
          else if (paramName === 'spread') effect.spread = value;
          break;
        case 'phaser':
          if (paramName === 'rate') effect.frequency.value = value;
          else if (paramName === 'depth') effect.octaves = 1 + (value * 5);
          else if (paramName === 'feedback') effect.Q.value = Math.max(0.1, value * 10);
          else if (paramName === 'mix') effect.wet.value = value;
          break;
      }
    } catch (e) {
      console.debug(`Could not set ${paramName} on ${effectId}:`, e);
    }
  }

  const localStorageState = JSON.parse(localStorage.getItem('ttsEffectsState') || '{}');
  if (!localStorageState.effects) localStorageState.effects = {};
  localStorageState.effects[effectId] = localStorageState.effects[effectId] || { enabled: false, params: {} };
  localStorageState.effects[effectId].params = localStorageState.effects[effectId].params || {};
  localStorageState.effects[effectId].params[paramName] = value;
  localStorage.setItem('ttsEffectsState', JSON.stringify(localStorageState));
};

export const updateEffectEnabled = (effectId, enabled) => {
  const localStorageState = JSON.parse(localStorage.getItem('ttsEffectsState') || '{}');
  if (!localStorageState.effects) localStorageState.effects = {};
  localStorageState.effects[effectId] = localStorageState.effects[effectId] || { enabled: false, params: {} };
  localStorageState.effects[effectId].enabled = enabled;
  localStorage.setItem('ttsEffectsState', JSON.stringify(localStorageState));

  rebuildEffectsChain();
  restorePedalStates();
};


// ========== Stored State Utilities =========
export const getStoredEffectsState = () => {
  const rawState = JSON.parse(localStorage.getItem('ttsEffectsState') || '{}');
  if (!rawState.effects) rawState.effects = {};
  return rawState;
};

export const restorePedalStates = () => {
  const savedState = getStoredEffectsState();
  PEDAL_DEFINITIONS.forEach(pedal => {
    const effectId = pedal.id;
    const listeners = effectsChainEffectIdListeners[effectId];
    if (!listeners) return;

    const isEnabled = !!(savedState.effects && savedState.effects[effectId] && savedState.effects[effectId].enabled === true);

    if (listeners.led) {
      listeners.led.classList.toggle('active', isEnabled);
    }

    if (listeners.footswitch) {
      listeners.footswitch.classList.toggle('active', isEnabled);
    }
  });
};

export const restoreSettings = () => {
  const savedState = getStoredEffectsState();

  if (savedState.effects) {
    for (const effectId in savedState.effects) {
      const effectState = savedState.effects[effectId];
      if (effectState.enabled !== undefined) {
        updateEffectEnabled(effectId, effectState.enabled === true);
      }
      if (effectState.params) {
        for (const paramName in effectState.params) {
          updateEffectParam(effectId, paramName, effectState.params[paramName]);
        }
      }
    }
  }

  restorePedalStates();
};

export const resetAllSettings = () => {
  if (confirm('Reset all effects to defaults?')) {
    localStorage.removeItem('ttsEffectsState');
    state.availableEffects.forEach(effect => {
      updateEffectEnabled(effect.id, false);
      for (const [paramName, paramConfig] of Object.entries(effect.params)) {
        updateEffectParam(effect.id, paramName, paramConfig.default);
      }
    });
    rebuildPedalBoardUI();
  }
};

// ========== HUD Initialization =========
export const initEffectsHUD = () => {
  // Get DOM elements
  hud = document.getElementById('tts-hud');
  hudHeader = document.getElementById('hud-header');
  hudVoiceSelect = document.getElementById('hud-voice-select');
  pedalRow = document.getElementById('pedal-row');

  // HUD collapse toggle
  if (hudHeader) {
    hudHeader.addEventListener('click', () => {
      hud.classList.toggle('collapsed');
      const indicator = document.getElementById('hud-toggle-indicator');
      if (indicator) {
        indicator.textContent = hud.classList.contains('collapsed') ? '▶' : '▼';
      }
    });
  }

  // Voice select click - prevent collapse toggle
  if (hudVoiceSelect) {
    hudVoiceSelect.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  // Voice select change
  if (hudVoiceSelect) {
    hudVoiceSelect.addEventListener('change', async (e) => {
      const selectedValue = e.target.value;
      localStorage.setItem('hudVoiceSelection', selectedValue);
      
      // Update avatar image
      if (window.updateVoiceAvatar) {
        window.updateVoiceAvatar(selectedValue);
      }

      // Warm up cache for the new voice
      if (window.warmVoiceCache) {
        window.warmVoiceCache(selectedValue).catch(err => console.warn('Warmup error:', err));
      }

      // If playing, restart with new voice
      const currentEl = state.mutableState.currentSpeakingEl;
      const isActuallyPlaying = state.mutableState.isRemoteAudioPlaying || (window.speechSynthesis && window.speechSynthesis.speaking);
      
      if (currentEl && isActuallyPlaying) {
          if (window.speakFrom) {
              await window.speakFrom(currentEl);
          }
      }
    });
  }

  // Reset button
  const resetBtn = document.getElementById('reset-effects-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      resetAllSettings();
    });
  }

  // Test effects button
  const testEffectsBtn = document.getElementById('test-effects-btn');
  if (testEffectsBtn) {
    testEffectsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.testEffects) window.testEffects();
    });
  }

  // Server config button
  const serverConfigBtn = document.getElementById('server-config-btn');
  const serverConfigPanel = document.getElementById('server-config-panel');
  if (serverConfigBtn && serverConfigPanel) {
    serverConfigBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      serverConfigPanel.style.display = serverConfigPanel.style.display === 'none' ? 'block' : 'none';
    });
  }

  // Server connect button
  const serverConnectBtn = document.getElementById('server-connect-btn');
  if (serverConnectBtn) {
    serverConnectBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const urlInput = document.getElementById('server-url-input');
      const url = urlInput ? urlInput.value.trim() : null;
      if (window.connectToRemoteTTS) window.connectToRemoteTTS(url);
    });
  }

  // Voice upload button
  const voiceUploadBtn = document.getElementById('voice-upload-btn');
  if (voiceUploadBtn) {
    voiceUploadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const urlInput = document.getElementById('server-url-input');
      const url = urlInput ? urlInput.value.trim() : null;
      if (window.uploadVoice) window.uploadVoice(url);
    });
  }
};

// Module initialization
export const initEffectsModule = () => {
  if (window.__STATIC_MODE__) {
    const serverStatus = document.getElementById('server-status');
    if (serverStatus) serverStatus.style.display = 'none';
    const serverConfigPanel = document.getElementById('server-config-panel');
    if (serverConfigPanel) serverConfigPanel.style.display = 'none';
    const serverConfigBtn = document.getElementById('server-config-btn');
    if (serverConfigBtn) serverConfigBtn.style.display = 'none';
  }
  initEffectsHUD();
  rebuildPedalBoardUI();
  restoreSettings();
};

// ========== Audio Effects Functions for UI ========
export const initTone = async () => {
  if (state.mutableState.toneInitialized) return;

  if (typeof Tone === 'undefined') {
    console.warn('Tone.js not loaded');
    return;
  }

  await Tone.start();
  state.mutableState.toneInitialized = true;

  // Create each effect type
  for (const effect of state.availableEffects) {
    try {
      switch (effect.type) {
        case 'reverb':
          state.effectUnits[effect.id] = new Tone.Reverb({
            decay: 2,
            preDelay: 0.05,
            wet: effect.params.mix.default
          });
          state.effectChains[effect.id] = { input: state.effectUnits[effect.id], output: state.effectUnits[effect.id] };
          break;
        case 'distortion':
          state.effectUnits[effect.id] = new Tone.Distortion({
            distortion: effect.params.gain.default,
            oversample: '2x'
          });
          state.effectChains[effect.id] = { input: state.effectUnits[effect.id], output: state.effectUnits[effect.id] };
          break;
        case 'chorus':
          state.effectUnits[effect.id] = new Tone.Chorus({
            frequency: effect.params.rate.default,
            depth: effect.params.depth.default,
            feedback: effect.params.feedback.default,
            spread: effect.params.spread.default
          });
          state.effectUnits[effect.id].start();
          state.effectChains[effect.id] = { input: state.effectUnits[effect.id], output: state.effectUnits[effect.id] };
          break;
        case 'phaser':
          state.effectUnits[effect.id] = new Tone.Phaser({
            frequency: effect.params.rate.default,
            octaves: 1 + (effect.params.depth.default * 5),
            Q: Math.max(0.1, effect.params.feedback.default * 10),
            wet: effect.params.mix.default,
            stages: 4,
            baseFrequency: 400
          });
          state.effectChains[effect.id] = { input: state.effectUnits[effect.id], output: state.effectUnits[effect.id] };
          break;
      }
    } catch (e) {
      console.error(`Failed to create effect ${effect.id}:`, e);
    }
  }

  // Create the entry point for TTS audio
  if (!state.mutableState.ttsAudioNode) {
    state.mutableState.ttsAudioNode = new Tone.Gain();
  }

  state.mutableState.ttsAudioNode.connect(Tone.Destination);
  window.ttsAudioNode = state.mutableState.ttsAudioNode;
};

export const initTtsEffectsChain = async () => {
  if (state.mutableState.ttsEffectsInitialized) return;
  await initTone();
  window.ttsAudioNode = state.mutableState.ttsAudioNode;
  rebuildEffectsChain();
  state.mutableState.ttsEffectsInitialized = true;
};

const rebuildEffectsChain = () => {
  const stateEffects = getStoredEffectsState();
  const enabledEffects = state.chainOrder.filter((id) => stateEffects.effects && stateEffects.effects[id] && stateEffects.effects[id].enabled === true);

  if (!state.mutableState.ttsAudioNode) return;

  try {
    state.mutableState.ttsAudioNode.disconnect();
  } catch (e) {
    console.debug('ttsAudioNode already disconnected:', e);
  }

  for (const effectId in state.effectUnits) {
    try {
      state.effectUnits[effectId].disconnect();
    } catch (e) {
      console.debug(`Effect ${effectId} already disconnected:`, e);
    }
  }

  // If no effects enabled, connect ttsAudioNode directly to destination
  if (enabledEffects.length === 0) {
    state.mutableState.ttsAudioNode.connect(Tone.Destination);
    return;
  }

  const firstChain = state.effectChains[enabledEffects[0]];
  if (!firstChain) {
    state.mutableState.ttsAudioNode.connect(Tone.Destination);
    return;
  }

  state.mutableState.ttsAudioNode.connect(firstChain.input);

  for (let i = 0; i < enabledEffects.length - 1; i++) {
    const currentChain = state.effectChains[enabledEffects[i]];
    const nextChain = state.effectChains[enabledEffects[i + 1]];
    if (currentChain && nextChain) {
      currentChain.output.connect(nextChain.input);
    }
  }

  const lastChain = state.effectChains[enabledEffects[enabledEffects.length - 1]];
  if (lastChain) {
    lastChain.output.connect(Tone.Destination);
  }
};

// Test the effects chain by playing a simple tone through it
export const testEffects = async () => {
  await initTone();
  await initTtsEffectsChain();

  if (!state.mutableState.ttsAudioNode) {
    console.warn('ttsAudioNode not initialized');
    return;
  }

  // Check if any effects are enabled
  const stateEffects = getStoredEffectsState();
  const enabledEffects = state.chainOrder.filter(id => {
    return stateEffects.effects && stateEffects.effects[id] && stateEffects.effects[id].enabled === true;
  });

  if (enabledEffects.length === 0) {
    alert('Enable some effects first, then try again!');
    return;
  }

  // Create a simple oscillator to test the effects
  const testNote = new Tone.Oscillator({
    frequency: 440,
    type: 'sine',
    duration: '8n'
  });

  testNote.disconnect();
  testNote.connect(state.mutableState.ttsAudioNode);
  testNote.start();
  testNote.stop('+0.5');
};

// Expose on window for external access
window.initTone = initTone;
window.initTtsEffectsChain = initTtsEffectsChain;
window.testEffects = testEffects;
window.rebuildEffectsChain = rebuildEffectsChain;
window.initHudVoiceSelect = initHudVoiceSelect;
window.togglePedalEnabled = togglePedalEnabled;
window.rebuildPedalBoardUI = rebuildPedalBoardUI;


// ========== Helper Functions ========
const ensureEffectState = (state, effectId) => {
  if (!state.effects) state.effects = {};
  if (!state.effects[effectId]) {
    state.effects[effectId] = { enabled: false, params: {} };
  }
  if (!state.effects[effectId].params) {
    state.effects[effectId].params = {};
  }
  return state.effects[effectId];
};
