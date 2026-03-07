/**
 * Speech Module
 * Handles text-to-speech, dialogue generation, and speech controls
 */

import * as state from './state.js';
import { resumeData } from './resume-data.js';

const synth = window.speechSynthesis;

// ========== Dialogue System ==========

const stableVariantIndex = (seed, count) => {
  if (!count || count <= 1) return 0;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % count;
};

const pickDialogueVariant = (options, seed, voiceName = "") => {
  if (!options) return null;
  
  // If it's a simple string, return it
  if (typeof options === 'string') return options;

  // Check if we should use first person (voice name contains "Rob")
  // Resolve voice ID to name if it's a remote voice
  let resolvedName = voiceName;
  if (state.mutableState.remoteTTSAvailable && state.mutableState.remoteVoices.length > 0) {
    const remoteVoice = state.mutableState.remoteVoices.find(v => v.id === voiceName);
    if (remoteVoice) {
      resolvedName = remoteVoice.name;
    }
  }
  const isRob = resolvedName && resolvedName.toLowerCase().includes('rob');
  
  if (options.third || options.first) {
    const variant = isRob ? (options.first || options.third) : (options.third || options.first);
    if (Array.isArray(variant)) {
      return variant[stableVariantIndex(seed, variant.length)];
    }
    return variant;
  }

  // Fallback for old array format
  if (Array.isArray(options)) {
    return options[stableVariantIndex(seed, options.length)];
  }

  return null;
};

/**
 * Returns an object with the text to speak and any forced voice override
 */
export const generateDialogue = (el, selectedVoiceName = "") => {
  const dataId = el.getAttribute('data-id');
  if (!dataId) return { text: el.innerText.trim(), voiceOverride: null };

  // Helper to find narration by ID
  let entry = null;
  for (const item of resumeData) {
    if (item.id === dataId) {
      entry = item.narration;
      break;
    }
    if (item.type === 'experience') {
       if (`${item.id}-title` === dataId) {
         entry = item.titleNarration;
         break;
       }
       if (`${item.id}-date` === dataId) {
         entry = item.dateNarration;
         break;
       }
       const bulletIdx = item.bullets.findIndex((b, idx) => `${item.id}-bullet-${idx}` === dataId);
       if (bulletIdx !== -1) {
         entry = item.bullets[bulletIdx].narration;
         break;
       }
    }
    if (item.type === 'ul') {
       const listItem = item.items.find(li => li.id === dataId);
       if (listItem) {
         entry = listItem.narration;
         break;
       }
    }
  }
  
  if (entry) {
    const finalVoice = entry.voice || selectedVoiceName;
    const text = pickDialogueVariant(entry, dataId, finalVoice);
    return { text, voiceOverride: entry.voice || null };
  }

  return { text: el.innerText.trim(), voiceOverride: null };
};

// ========== Highlight Management ==========
export const cleanupSpeaking = () => {
  if (state.mutableState.currentSpeakingEl) {
    state.mutableState.currentSpeakingEl.classList.remove('speaking');
    state.mutableState.currentSpeakingEl = null;
  }
};

export const clearHighlight = () => {
  if (state.mutableState.currentSpeakingEl) {
    state.mutableState.currentSpeakingEl.classList.remove('speaking');
    state.mutableState.currentSpeakingEl = null;
  }
};

// ========== Scroll Animation =============
const scrollManager = {
  animationFrame: null,
  startTime: 0,
  startY: window.scrollY,
  targetY: window.scrollY,
  duration: 0
};

const clampScrollTarget = (value) => {
  const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  return Math.min(Math.max(value, 0), maxScroll);
};

const easeInOutQuint = (t) => {
  if (t < 0.5) return 16 * t * t * t * t * t;
  return 1 - Math.pow(-2 * t + 2, 5) / 2;
};

const stopScrollAnimation = () => {
  if (scrollManager.animationFrame !== null) {
    cancelAnimationFrame(scrollManager.animationFrame);
    scrollManager.animationFrame = null;
  }
};

const animateScrollTo = (targetY) => {
  const nextTargetY = clampScrollTarget(targetY);
  const currentY = window.scrollY;
  const distance = Math.abs(nextTargetY - currentY);

  if (distance < 10) {
    stopScrollAnimation();
    return;
  }

  stopScrollAnimation();
  scrollManager.startTime = performance.now();
  scrollManager.startY = currentY;
  scrollManager.targetY = nextTargetY;
  scrollManager.duration = Math.min(2800, Math.max(1100, distance * 2.1));

  const tick = (now) => {
    const elapsed = now - scrollManager.startTime;
    const progress = Math.min(elapsed / scrollManager.duration, 1);
    const eased = easeInOutQuint(progress);
    const nextY = scrollManager.startY + ((scrollManager.targetY - scrollManager.startY) * eased);

    window.scrollTo(0, nextY);

    if (progress < 1) {
      scrollManager.animationFrame = requestAnimationFrame(tick);
      return;
    }

    window.scrollTo(0, scrollManager.targetY);
    scrollManager.animationFrame = null;
  };

  scrollManager.animationFrame = requestAnimationFrame(tick);
};

const scrollToSpeakingElement = (el) => {
  const rect = el.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const targetPosition = rect.top + window.scrollY - (viewportHeight * 0.40);
  animateScrollTo(targetPosition);
};

// ========== Speech Control =============
export const stopCurrentSpeech = ({ invalidateSession = true } = {}) => {
  state.mutableState.shouldContinueSpeaking = false;
  
  if (window.setThinkLedState) window.setThinkLedState('idle');
  if (window.stopMainLedMeter) window.stopMainLedMeter();

  if (invalidateSession) {
    if (state.createPlaybackSession) state.createPlaybackSession();
  }

  if (state.mutableState.stopRemoteAudio) {
    state.mutableState.stopRemoteAudio();
    state.mutableState.stopRemoteAudio = null;
  }
  state.mutableState.isRemoteAudioPlaying = false;

  synth.cancel();
  stopScrollAnimation();
  clearHighlight();
};

const getSelectedVoiceName = () => {
  const hudVoiceSelect = document.getElementById('hud-voice-select');
  return hudVoiceSelect ? hudVoiceSelect.value : "";
};

const getBrowserVoiceByName = (name) => {
  return state.mutableState.voices.find(v => v.name === name) || null;
};

export const speakElement = async (el) => {
  stopCurrentSpeech();
  clearHighlight();
  const sessionId = state.createPlaybackSession ? state.createPlaybackSession() : 0;
  state.mutableState.shouldContinueSpeaking = true;

  const hudVoiceName = getSelectedVoiceName();
  const { text, voiceOverride } = generateDialogue(el, hudVoiceName);
  
  const activeVoiceName = voiceOverride || hudVoiceName;

  if (!window.isPlaybackSessionActive || !window.isPlaybackSessionActive(sessionId)) return;

  if (state.mutableState.remoteTTSAvailable) {
    el.classList.add('speaking');
    state.mutableState.currentSpeakingEl = el;
    scrollToSpeakingElement(el);
    if (window.warmVoiceCache) {
      window.warmVoiceCache(activeVoiceName).catch((e) => {
        console.warn('Voice warmup failed:', e.message);
      });
    }

    if (window.setThinkLedState) window.setThinkLedState('thinking');

    const result = await window.speakWithRemoteTTS(text, activeVoiceName, null, sessionId, el.getAttribute('data-id'));

    if (!window.isPlaybackSessionActive || !window.isPlaybackSessionActive(sessionId)) return;

    el.classList.remove('speaking');
    state.mutableState.currentSpeakingEl = null;

    if (!result.success && !result.canceled) {
      const utter = new SpeechSynthesisUtterance(text);
      utter.voice = getBrowserVoiceByName(activeVoiceName);
      utter.onstart = () => {
        if (!window.isPlaybackSessionActive || !window.isPlaybackSessionActive(sessionId)) {
          synth.cancel();
          return;
        }
        if (window.setThinkLedState) window.setThinkLedState('speaking');
        el.classList.add('speaking');
        state.mutableState.currentSpeakingEl = el;
        scrollToSpeakingElement(el);
      };
      utter.onend = () => {
        if (!window.isPlaybackSessionActive || !window.isPlaybackSessionActive(sessionId)) return;
        if (window.setThinkLedState) window.setThinkLedState('idle');
        el.classList.remove('speaking');
        state.mutableState.currentSpeakingEl = null;
      };
      synth.speak(utter);
    }
  } else {
    const utter = new SpeechSynthesisUtterance(text);
    utter.voice = getBrowserVoiceByName(activeVoiceName);
    utter.onstart = () => {
      if (!window.isPlaybackSessionActive || !window.isPlaybackSessionActive(sessionId)) {
        synth.cancel();
        return;
      }
      if (window.setThinkLedState) window.setThinkLedState('speaking');
      el.classList.add('speaking');
      state.mutableState.currentSpeakingEl = el;
      scrollToSpeakingElement(el);
    };
    utter.onend = () => {
      if (!window.isPlaybackSessionActive || !window.isPlaybackSessionActive(sessionId)) return;
      if (window.setThinkLedState) window.setThinkLedState('idle');
      el.classList.remove('speaking');
      state.mutableState.currentSpeakingEl = null;
    };

    synth.speak(utter);
  }
  state.mutableState.isPaused = false;
};

export const speakFrom = async (startEl, isResume = false) => {
  if (!isResume) {
    stopCurrentSpeech();
    clearHighlight();
  }
  const sessionId = state.createPlaybackSession ? state.createPlaybackSession() : 0;
  state.mutableState.shouldContinueSpeaking = true;
  state.mutableState.isPaused = false;
  if (!isResume) {
    state.mutableState.pausedEl = null;
  }

  const all = Array.from(document.querySelectorAll('h1, h2, h3, p, li'));
  const startIdx = all.indexOf(startEl);
  if (startIdx === -1) return;
  const slice = all.slice(startIdx);

  const hudVoiceName = getSelectedVoiceName();

  if (state.mutableState.remoteTTSAvailable) {
    for (let i = 0; i < slice.length; i++) {
      if (!state.mutableState.shouldContinueSpeaking || !window.isPlaybackSessionActive || !window.isPlaybackSessionActive(sessionId)) {
        state.mutableState.pausedEl = state.mutableState.currentSpeakingEl;
        break;
      }

      const el = slice[i];
      const { text, voiceOverride } = generateDialogue(el, hudVoiceName);
      const activeVoiceName = voiceOverride || hudVoiceName;

      el.classList.add('speaking');
      state.mutableState.currentSpeakingEl = el;
      scrollToSpeakingElement(el);

      if (window.setThinkLedState) window.setThinkLedState('thinking');

      const result = await window.speakWithRemoteTTS(text, activeVoiceName, null, sessionId, el.getAttribute('data-id'));

      if (!state.mutableState.shouldContinueSpeaking || !window.isPlaybackSessionActive || !window.isPlaybackSessionActive(sessionId) || result.canceled) {
        state.mutableState.pausedEl = state.mutableState.currentSpeakingEl;
        break;
      }

      el.classList.remove('speaking');
      if (i === slice.length - 1) state.mutableState.currentSpeakingEl = null;
    }
  } else {
    slice.forEach((el, idx) => {
      const { text, voiceOverride } = generateDialogue(el, hudVoiceName);
      const activeVoiceName = voiceOverride || hudVoiceName;

      const utter = new SpeechSynthesisUtterance(text);
      utter.voice = getBrowserVoiceByName(activeVoiceName);
      utter.onstart = () => {
        if (!window.isPlaybackSessionActive || !window.isPlaybackSessionActive(sessionId)) {
          synth.cancel();
          return;
        }
        if (window.setThinkLedState) window.setThinkLedState('speaking');
        el.classList.add('speaking');
        state.mutableState.currentSpeakingEl = el;
        scrollToSpeakingElement(el);
      };
      utter.onend = () => {
        if (!window.isPlaybackSessionActive || !window.isPlaybackSessionActive(sessionId)) return;
        if (window.setThinkLedState) window.setThinkLedState('idle');
        el.classList.remove('speaking');
        if (idx === slice.length - 1) state.mutableState.currentSpeakingEl = null;
      };
      synth.speak(utter);
    });
  }
  state.mutableState.isPaused = false;
};

export const speakAll = async () => {
  stopCurrentSpeech();
  clearHighlight();
  const sessionId = state.createPlaybackSession ? state.createPlaybackSession() : 0;
  state.mutableState.shouldContinueSpeaking = true;
  state.mutableState.isPaused = false;
  state.mutableState.pausedEl = null;

  const elems = Array.from(document.querySelectorAll('h1, h2, h3, p, li'));
  const hudVoiceName = getSelectedVoiceName();

  if (state.mutableState.remoteTTSAvailable) {
    for (let i = 0; i < elems.length; i++) {
      if (!state.mutableState.shouldContinueSpeaking || !window.isPlaybackSessionActive || !window.isPlaybackSessionActive(sessionId)) {
        break;
      }

      const el = elems[i];
      const { text, voiceOverride } = generateDialogue(el, hudVoiceName);
      const activeVoiceName = voiceOverride || hudVoiceName;

      el.classList.add('speaking');
      state.mutableState.currentSpeakingEl = el;
      scrollToSpeakingElement(el);

      if (window.setThinkLedState) window.setThinkLedState('thinking');

      const result = await window.speakWithRemoteTTS(text, activeVoiceName, null, sessionId, el.getAttribute('data-id'));

      if (!state.mutableState.shouldContinueSpeaking || !window.isPlaybackSessionActive || !window.isPlaybackSessionActive(sessionId) || result.canceled) {
        state.mutableState.pausedEl = state.mutableState.currentSpeakingEl;
        break;
      }

      el.classList.remove('speaking');
      if (i === elems.length - 1) state.mutableState.currentSpeakingEl = null;
    }
  } else {
    elems.forEach((el, idx) => {
      const { text, voiceOverride } = generateDialogue(el, hudVoiceName);
      const activeVoiceName = voiceOverride || hudVoiceName;

      const utter = new SpeechSynthesisUtterance(text);
      utter.voice = getBrowserVoiceByName(activeVoiceName);
      utter.onstart = () => {
        if (!window.isPlaybackSessionActive || !window.isPlaybackSessionActive(sessionId)) {
          synth.cancel();
          return;
        }
        if (window.setThinkLedState) window.setThinkLedState('speaking');
        el.classList.add('speaking');
        state.mutableState.currentSpeakingEl = el;
        scrollToSpeakingElement(el);
      };
      utter.onend = () => {
        if (!window.isPlaybackSessionActive || !window.isPlaybackSessionActive(sessionId)) return;
        if (window.setThinkLedState) window.setThinkLedState('idle');
        el.classList.remove('speaking');
        if (idx === elems.length - 1) state.mutableState.currentSpeakingEl = null;
      };
      synth.speak(utter);
    });
  }
  state.mutableState.isPaused = false;
};

// ========== Toggle Play/Pause =========
export const togglePlayPause = async () => {
  if (state.mutableState.isRemoteAudioPlaying) {
    if (state.mutableState.isPaused) {
      state.mutableState.isPaused = false;
      state.mutableState.shouldContinueSpeaking = true;
      if (state.mutableState.pausedEl) {
        await speakFrom(state.mutableState.pausedEl, true);
      } else {
        await speakAll();
      }
    } else {
      state.mutableState.pausedEl = state.mutableState.currentSpeakingEl;
      if (state.mutableState.stopRemoteAudio) {
        state.mutableState.stopRemoteAudio();
      }
      state.mutableState.shouldContinueSpeaking = false;
      state.mutableState.isPaused = true;
    }
    return;
  }

  if (synth.speaking) {
    if (state.mutableState.isPaused) {
      synth.resume();
      state.mutableState.isPaused = false;
      if (state.mutableState.pausedEl) {
        state.mutableState.pausedEl.classList.add('speaking');
        state.mutableState.currentSpeakingEl = state.mutableState.pausedEl;
        state.mutableState.pausedEl = null;
      }
    } else {
      state.mutableState.pausedEl = state.mutableState.currentSpeakingEl;
      synth.pause();
      state.mutableState.isPaused = true;
      clearHighlight();
    }
  } else {
    await speakAll();
  }
};

// ========== Voice Loading =============
export const loadVoices = () => {
  const voices = synth.getVoices();
  state.mutableState.voices.length = 0;
  state.mutableState.voices.push(...voices);

  if (window.initHudVoiceSelect) {
    window.initHudVoiceSelect();
  }
};

// ========== Event Handlers =============
export const initSpeechControls = () => {
  const ttsToggle = document.getElementById('tts-toggle');
  if (ttsToggle) {
    ttsToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      state.mutableState.hasInteracted = true;
      togglePlayPause();
    });
  }

  // We add click handlers to the entire resume container, but delegation is handled in renderer or here
  // Actually, since elements are dynamic, we should re-attach or use delegation
  document.getElementById('resume-container').addEventListener('click', async (e) => {
    const el = e.target.closest('h1, h2, h3, p, li');
    if (el && el.getAttribute('data-id')) {
      e.stopPropagation();
      if (!state.mutableState.hasInteracted) {
        state.mutableState.hasInteracted = true;
        await speakAll();
      } else {
        await speakFrom(el);
      }
    }
  });

  document.addEventListener('keydown', async (e) => {
    if (e.code === 'Space' && !e.target.isContentEditable && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      state.mutableState.hasInteracted = true;
      await togglePlayPause();
    }
  });

  // Load voices when available
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = loadVoices;
  } else {
    loadVoices();
  }

  window.addEventListener('load', () => {
    loadVoices();
  });
};

// Module initialization
export const initSpeechModule = () => {
  initSpeechControls();
  loadVoices();
};

// Expose on window for external access
window.speakAll = speakAll;
window.speakFrom = speakFrom;
window.stopCurrentSpeech = stopCurrentSpeech;
window.speakElement = speakElement;
window.togglePlayPause = togglePlayPause;
window.generateDialogue = generateDialogue;
window.loadVoices = loadVoices;
