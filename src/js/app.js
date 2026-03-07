/**
 * App Initialization
 * Initializes all modules and coordinates the application startup
 */

import * as state from './state.js';
import { renderResume } from './renderer.js';
import { initEffectsModule, testEffects } from './effects-ui.js';
import { initSpeechModule } from './speech.js';
import { initParallaxModule } from './parallax.js';
import { initRemoteTtsModule, loadCachedRemoteVoices, updateServerStatusUI, updateVoiceUploadUI, speakWithRemoteTTS, warmVoiceCache, connectToRemoteTTS, uploadVoice, fetchRemoteVoices } from './remote-tts.js';
import { initRobotUI } from './robot-ui.js';

// ========== Expose state on window for cross-module access ========
window.chainOrder = state.chainOrder;
window.availableEffects = state.availableEffects;
window.effectUnits = state.effectUnits;
window.effectChains = state.effectChains;
window.ttsAudioNode = state.mutableState.ttsAudioNode;
window.remoteTTSAvailable = state.mutableState.remoteTTSAvailable;
window.remoteVoices = state.mutableState.remoteVoices;
window.remoteTTSBaseUrl = state.mutableState.remoteTTSBaseUrl;
window.isRemoteAudioPlaying = state.mutableState.isRemoteAudioPlaying;
window.stopRemoteAudio = state.mutableState.stopRemoteAudio;
window.playbackSessionId = state.mutableState.playbackSessionId;
window.voices = state.mutableState.voices;
window.createPlaybackSession = state.createPlaybackSession;
window.isPlaybackSessionActive = state.isPlaybackSessionActive;

// ========== Expose functions on window ========
window.speakWithRemoteTTS = speakWithRemoteTTS;
window.warmVoiceCache = warmVoiceCache;
window.connectToRemoteTTS = connectToRemoteTTS;
window.uploadVoice = uploadVoice;
window.updateServerStatusUI = updateServerStatusUI;
window.updateVoiceUploadUI = updateVoiceUploadUI;
window.fetchRemoteVoices = fetchRemoteVoices;
window.initRemoteTtsModule = initRemoteTtsModule;
window.testEffects = testEffects;

// ========== Initialization ========
const initializeApp = async () => {
  console.log('[DOMContentLoaded] Starting initialization...');

  // 1. Render Resume Content from data
  renderResume('resume-container');

  console.log('[DOMContentLoaded] localStorage ttsServerUrl:', localStorage.getItem('ttsServerUrl'));
  console.log('[DOMContentLoaded] localStorage ttsRemoteEnabled:', localStorage.getItem('ttsRemoteEnabled'));
  console.log('[DOMContentLoaded] localStorage ttsRemoteAvailable:', localStorage.getItem('ttsRemoteAvailable'));

  // Set initial state on window
  window.remoteTTSAvailable = state.mutableState.remoteTTSAvailable;

  // Static mode: load manifest and skip TTS server connection
  if (window.__STATIC_MODE__) {
    try {
      const res = await fetch('audio/manifest.json');
      const manifest = await res.json();
      state.mutableState.staticAudioManifest = manifest;
      state.mutableState.remoteTTSAvailable = true;
      window.remoteTTSAvailable = true;
      state.mutableState.remoteVoices.length = 0;
      state.mutableState.remoteVoices.push(...manifest.voices.map(v => ({ id: v.id, name: v.name })));
      window.remoteVoices = state.mutableState.remoteVoices;
      if (window.initHudVoiceSelect) window.initHudVoiceSelect();
      console.log('[Static Mode] Manifest loaded, voices:', manifest.voices.length);
    } catch (e) {
      console.error('[Static Mode] Failed to load manifest:', e);
    }
  }

  // Initialize parallax effects
  initParallaxModule();

  // Initialize effects HUD and chain
  initEffectsModule();

  // Initialize speech controls
  initSpeechModule();

  // Initialize robot UI
  initRobotUI();

  // Load cached remote voices
  if (!window.__STATIC_MODE__) {
    const cachedVoices = loadCachedRemoteVoices();
    if (cachedVoices.length > 0) {
      state.mutableState.remoteVoices.length = 0;
      state.mutableState.remoteVoices.push(...cachedVoices);
      window.remoteVoices = state.mutableState.remoteVoices;
      console.log('Restored', state.mutableState.remoteVoices.length, 'remote voices from cache');
      if (window.initHudVoiceSelect) window.initHudVoiceSelect();
    }
  }

  // Connect to remote TTS if we have a saved URL
  if (!window.__STATIC_MODE__) {
    const savedServerUrl = localStorage.getItem('ttsServerUrl');
    if (savedServerUrl) {
      console.log('[DOMContentLoaded] Auto-connecting to remote TTS...');
      try {
        await initRemoteTtsModule(async (voices) => {
          state.mutableState.remoteVoices.length = 0;
          state.mutableState.remoteVoices.push(...voices);
          window.remoteVoices = state.mutableState.remoteVoices;
          updateServerStatusUI();
          updateVoiceUploadUI();
        });
      } catch (e) {
        console.error('[DOMContentLoaded] Auto-connect failed:', e);
        updateServerStatusUI();
      }
    } else {
      updateServerStatusUI();
      updateVoiceUploadUI();
    }
  }

  // Initialize TTS effects chain
  if (window.initTtsEffectsChain) {
    try {
      await window.initTtsEffectsChain();
      window.ttsAudioNode = state.mutableState.ttsAudioNode;
    } catch (e) {
      console.error('[DOMContentLoaded] initTtsEffectsChain failed:', e);
    }
  }

  console.log('[DOMContentLoaded] Initialization complete');
};

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
