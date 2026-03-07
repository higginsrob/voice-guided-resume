/**
 * Application State Module
 * Centralized state management for all modules
 */

// ========== Audio Effects State ========
export const availableEffects = [
  { id: 'distortion', name: 'Distortion', type: 'distortion', params: { gain: { min: 0, max: 1, default: 0.5 } } },
  { id: 'chorus', name: 'Chorus', type: 'chorus', params: { rate: { min: 0.1, max: 20, default: 2 }, depth: { min: 0, max: 1, default: 0.7 }, feedback: { min: 0, max: 0.9, default: 0.2 }, spread: { min: 0, max: 180, default: 0 } } },
  { id: 'reverb', name: 'Reverb', type: 'reverb', params: { mix: { min: 0, max: 1, default: 0.3 } } },
  { id: 'phaser', name: 'Phaser', type: 'phaser', params: { rate: { min: 0.1, max: 10, default: 2 }, depth: { min: 0, max: 1, default: 0.7 }, feedback: { min: 0, max: 0.9, default: 0.3 }, mix: { min: 0, max: 1, default: 0.5 } } }
];

export let chainOrder = ['distortion', 'chorus', 'phaser', 'reverb'];
export const effectUnits = {};
export const effectChains = {};

// ========== Audio State ========
export const mutableState = {
  toneInitialized: false,
  ttsEffectsInitialized: false,
  effectsChain: [],
  currentPreset: null,
  ttsAudioNode: null,
  effectsOutputGain: null,

  // Remote TTS State
  remoteTTSAvailable: localStorage.getItem('ttsRemoteAvailable') === 'true',
  remoteTTSBaseUrl: localStorage.getItem('ttsServerUrl') || 'http://localhost:8000/v1/',
  remoteVoices: [],
  // Remote Audio State
  currentRemoteAudioElement: null,
  currentRemoteAudioSourceNode: null,
  currentNativeAudioSourceNode: null,
  isRemoteAudioPlaying: false,
  stopRemoteAudio: null,
  playbackSessionId: 0,
  // Speech State
  isPaused: false,
  currentSpeakingEl: null,
  pausedEl: null,
  shouldContinueSpeaking: true,
  hasInteracted: false,
  // Browser Voices
  voices: [],
  staticAudioManifest: null,
};

// ========== Cached DB State ===========
export const ttsCacheDbName = 'tts-audio-cache-v1';
export const ttsCacheStoreName = 'audio';
export let ttsCacheDbPromise = null;
export const voiceWarmupPromises = new Map();

// ========== Session Management ===========
export const createPlaybackSession = () => {
  mutableState.playbackSessionId += 1;
  return mutableState.playbackSessionId;
};

export const isPlaybackSessionActive = (sessionId) => sessionId === mutableState.playbackSessionId;

// ========== Audio Cache Functions =========
export const openTtsCacheDb = () => {
  if (ttsCacheDbPromise) return ttsCacheDbPromise;
  ttsCacheDbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(ttsCacheDbName, 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ttsCacheStoreName)) {
        const store = db.createObjectStore(ttsCacheStoreName, { keyPath: 'cacheKey' });
        store.createIndex('voiceId', 'voiceId', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error(`Failed to open IndexedDB: ${request.error}`));
  });
  return ttsCacheDbPromise;
};

const normalizeVoiceCacheKey = (voiceId) => voiceId || 'default';
const buildCacheKey = (voiceId, text) => `${normalizeVoiceCacheKey(voiceId)}::${text}`;

export const getCachedAudioBlob = async (voiceId, text) => {
  const db = await openTtsCacheDb();
  const cacheKey = buildCacheKey(voiceId, text);

  if (!db.objectStoreNames.contains(ttsCacheStoreName)) {
    console.warn(`[State] IndexedDB store "${ttsCacheStoreName}" not found. Cache will be bypassed.`);
    return null;
  }

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(ttsCacheStoreName, 'readonly');
      const store = tx.objectStore(ttsCacheStoreName);
      const req = store.get(cacheKey);
      req.onsuccess = () => {
        const record = req.result;
        resolve(record ? record.blob : null);
      };
      req.onerror = () => reject(new Error(`IndexedDB get error: ${req.error}`));
    } catch (e) {
      console.error(`[State] IndexedDB transaction failed:`, e);
      resolve(null); // Fallback to network
    }
  });
};

export const putCachedAudioBlob = async (voiceId, text, blob) => {
  const db = await openTtsCacheDb();
  const cacheKey = buildCacheKey(voiceId, text);

  if (!db.objectStoreNames.contains(ttsCacheStoreName)) {
    console.warn(`[State] IndexedDB store "${ttsCacheStoreName}" not found. Cannot cache.`);
    return;
  }

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(ttsCacheStoreName, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error(`IndexedDB put error: ${tx.error}`));
      const store = tx.objectStore(ttsCacheStoreName);
      store.put({ cacheKey, voiceId: voiceId || 'default', blob, timestamp: Date.now() });
    } catch (e) {
      console.error(`[State] IndexedDB put transaction failed:`, e);
      resolve();
    }
  });
};

export const fetchRemoteTTSBlob = async (text, voiceId = null, speed = null) => {
  const requestBody = {
    input: text,
    response_format: 'mp3',
    stream: false
  };

  if (voiceId) requestBody.voice = voiceId;
  if (speed) requestBody.speed = speed;

  const response = await fetch(`${mutableState.remoteTTSBaseUrl}audio/speech`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`TTS server returned ${response.status}: ${errorText}`);
  }

  const audioBlob = await response.blob();
  if (audioBlob.size === 0) {
    throw new Error('Received empty audio response');
  }
  return audioBlob;
};

// ========== Remote Audio Playback ========
export const ensureRemoteAudioReady = async () => {
  if (typeof window.initTone === 'function') await window.initTone();
  if (typeof window.initTtsEffectsChain === 'function') await window.initTtsEffectsChain();
};

export const connectRemoteAudioToEffects = async (audioEl) => {
  await ensureRemoteAudioReady();

  try {
    console.log('[State] Context state:', Tone.context.state);
    
    // Clear previous connections
    if (mutableState.currentRemoteAudioSourceNode) {
      try {
        mutableState.currentRemoteAudioSourceNode.disconnect();
      } catch (e) {
        console.debug('[State] Previous remote audio source disconnect failed (expected):', e);
      }
      mutableState.currentRemoteAudioSourceNode = null;
    }
    
    if (mutableState.currentNativeAudioSourceNode) {
      try {
        mutableState.currentNativeAudioSourceNode.disconnect();
      } catch (e) {
        console.debug('[State] Previous native audio source disconnect failed (expected):', e);
      }
      mutableState.currentNativeAudioSourceNode = null;
    }

    console.log('[State] Connecting audio element to Effects Chain. Element src:', audioEl.src ? 'present' : 'missing');
    
    // Use the native context to create the source node
    const rawCtx = Tone.context.rawContext || Tone.context;
    if (!rawCtx || typeof rawCtx.createMediaElementSource !== 'function') {
      throw new Error('Native AudioContext is not available');
    }

    let nativeSource;
    try {
      nativeSource = rawCtx.createMediaElementSource(audioEl);
    } catch (err) {
      console.error('[State] createMediaElementSource failed:', err);
      // If this fails, we can't continue with effects, but we might still be able to play
      throw err;
    }

    const sourceNode = new Tone.Gain();
    
    // Connect native node to Tone.Gain node
    // We connect to the internal _gainNode or just the node itself if it's a wrapper
    if (sourceNode.input) {
      nativeSource.connect(sourceNode.input);
    } else {
      nativeSource.connect(sourceNode);
    }
    
    const ttsAudioNode = mutableState.ttsAudioNode;
    const inputNode = ttsAudioNode && (ttsAudioNode.input || ttsAudioNode);
    
    if (!inputNode) {
      console.warn('[State] TTS effects input node is not available. Connecting directly to Destination.');
      sourceNode.connect(Tone.Destination);
    } else {
      // Connect to the effects chain
      try {
        sourceNode.connect(inputNode);
      } catch (connErr) {
        console.error('[State] Failed to connect source to effects chain:', connErr);
        sourceNode.connect(Tone.Destination);
      }
    }
    
    mutableState.currentRemoteAudioSourceNode = sourceNode;
    mutableState.currentNativeAudioSourceNode = nativeSource;

    if (window.startMainLedMeter) {
      try {
        window.startMainLedMeter(sourceNode);
      } catch (e) {
        console.warn('[State] Failed to start LED meter:', e);
      }
    }
  } catch (e) {
    console.error('[State] Critical failure in connectRemoteAudioToEffects:', e);
    throw e;
  }
};

export const playRemoteAudio = async (audioUrl, sessionId) => {
  if (!isPlaybackSessionActive(sessionId)) {
    return { completed: false, canceled: true };
  }

  await ensureRemoteAudioReady();

  if (mutableState.stopRemoteAudio) {
    mutableState.stopRemoteAudio();
  }

  const audioEl = document.createElement('audio');
  audioEl.style.display = 'none';
  audioEl.setAttribute('playsinline', '');
  audioEl.setAttribute('webkit-playsinline', '');
  audioEl.volume = 1.0;
  audioEl.src = audioUrl;
  document.body.appendChild(audioEl);
  mutableState.currentRemoteAudioElement = audioEl;

  let isStopped = false;

  const cleanup = () => {
    if (window.setThinkLedState) window.setThinkLedState('idle');
    if (window.stopMainLedMeter) window.stopMainLedMeter();
    
    if (mutableState.currentRemoteAudioSourceNode) {
      try {
        mutableState.currentRemoteAudioSourceNode.disconnect();
      } catch (e) {
        console.debug('Remote audio source disconnect failed:', e);
      }
      mutableState.currentRemoteAudioSourceNode = null;
    }
    if (mutableState.currentNativeAudioSourceNode) {
      try {
        mutableState.currentNativeAudioSourceNode.disconnect();
      } catch (e) {
        console.debug('Native audio source disconnect failed:', e);
      }
      mutableState.currentNativeAudioSourceNode = null;
    }
    if (mutableState.currentRemoteAudioElement === audioEl) {
      mutableState.currentRemoteAudioElement = null;
    }
    if (mutableState.stopRemoteAudio === stopFn) {
      mutableState.stopRemoteAudio = null;
      mutableState.isRemoteAudioPlaying = false;
    }
    audioEl.onloadeddata = null;
    audioEl.onerror = null;
    audioEl.onended = null;
    audioEl.pause();
    audioEl.removeAttribute('src');
    audioEl.load();
    audioEl.remove();
  };

  const stopFn = () => {
    if (isStopped) return;
    isStopped = true;
    cleanup();
  };
  mutableState.stopRemoteAudio = stopFn;
  mutableState.isRemoteAudioPlaying = true;

  await new Promise((resolve, reject) => {
    audioEl.onloadeddata = () => {
      resolve();
    };
    audioEl.onerror = (e) => {
      console.error('Audio load error:', e);
      reject(e);
    };
  });

  if (isStopped || !isPlaybackSessionActive(sessionId)) {
    stopFn();
    return { completed: false, canceled: true };
  }

  await connectRemoteAudioToEffects(audioEl);
  
  if (window.setThinkLedState) {
    window.setThinkLedState('speaking');
  }
  
  await audioEl.play();

  return new Promise((resolve) => {
    const checkProgress = setInterval(() => {
      if (isStopped) {
        clearInterval(checkProgress);
        resolve({ completed: false, canceled: true });
        return;
      }
    }, 1000);

    audioEl.onended = () => {
      clearInterval(checkProgress);
      cleanup();
      resolve({ completed: true, canceled: false });
    };

    audioEl.onerror = (e) => {
      clearInterval(checkProgress);
      cleanup();
      resolve({ completed: false, canceled: isStopped || !isPlaybackSessionActive(sessionId) });
    };
  });
};

// ========== Voice Warmup ========
export const warmVoiceCache = async (voiceId) => {
  if (window.__STATIC_MODE__) return Promise.resolve();
  if (!voiceId || !mutableState.remoteTTSAvailable) return;
  if (voiceWarmupPromises.has(voiceId)) {
    return voiceWarmupPromises.get(voiceId);
  }

  const warmupPromise = (async () => {
    const elems = Array.from(document.querySelectorAll('h1, h2, h3, p, li'));
    for (const el of elems) {
      const dialogue = window.generateDialogue ? window.generateDialogue(el, voiceId) : { text: el.innerText.trim() };
      const text = dialogue.text;
      const existing = await getCachedAudioBlob(voiceId, text);
      if (existing) continue;
      const audioBlob = await fetchRemoteTTSBlob(text, voiceId);
      await putCachedAudioBlob(voiceId, text, audioBlob);
    }
  })();

  voiceWarmupPromises.set(voiceId, warmupPromise);
  try {
    await warmupPromise;
  } finally {
    voiceWarmupPromises.delete(voiceId);
  }
};
