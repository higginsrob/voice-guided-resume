import * as state from './state.js';
/**
 * Remote TTS Module
 * Handles connection to remote TTS server, voice management, and audio playback
 */


// ========== Server Health Check =========
export const checkRemoteTTSHealth = async (baseUrl) => {
  try {
    const url = baseUrl.replace('/v1/', '').replace(/\/$/, '') + '/healthz';
    console.log('Checking TTS health at:', url);
    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    });
    console.log('Health check response:', response.status);
    return response.ok;
  } catch (e) {
    console.error('Health check failed:', e.message);
    return false;
  }
};

// ========== Voice Management =============
export const fetchRemoteVoices = async (baseUrl) => {
  try {
    const url = baseUrl + 'voices';
    console.log('Fetching voices from:', url);
    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    console.log('Voices response:', response.status);
    if (response.ok) {
      const data = await response.json();
      console.log('Got voices:', data.length);
      return data;
    }
    return [];
  } catch (e) {
    console.warn('Could not fetch remote voices:', e.message);
    return [];
  }
};

// ========== Text-to-Speech =========
const isPlaybackSessionActive = (sessionId) => {
  return sessionId === (state.mutableState.playbackSessionId || 0);
};

export const speakWithRemoteTTS = async (text, voiceId = null, speed = null, sessionId, dataId = null) => {

  // Static mode: play pre-generated audio file from manifest
  if (state.mutableState.staticAudioManifest && dataId) {
    if (!sessionId || !isPlaybackSessionActive(sessionId)) {
      return { success: false, canceled: true };
    }

    const resolvedVoiceId = voiceId || 'rob';
    const filePath = state.mutableState.staticAudioManifest.audio?.[resolvedVoiceId]?.[dataId];
    if (!filePath) {
      // This voice has no audio for this item (e.g. Rob-only item for Chris)
      return { success: false, canceled: false };
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

  if (!state.mutableState.remoteTTSAvailable) {
    console.warn('Remote TTS not available, falling back to local');
    return { success: false, canceled: false };
  }

  if (!sessionId || !isPlaybackSessionActive(sessionId)) {
    return { success: false, canceled: true };
  }

  try {
    let audioBlob = await state.getCachedAudioBlob(voiceId || 'default', text);
    if (!audioBlob) {
      console.log('No cached audio available, fetching on demand for voice:', voiceId);
      audioBlob = await state.fetchRemoteTTSBlob(text, voiceId, speed);
      await state.putCachedAudioBlob(voiceId || 'default', text, audioBlob);
    }

    const audioUrl = URL.createObjectURL(audioBlob);
    console.log('Created audio URL');

    const playbackResult = await state.playRemoteAudio(audioUrl, sessionId);

    URL.revokeObjectURL(audioUrl);

    if (playbackResult.canceled) {
      return { success: false, canceled: true };
    }

    return { success: playbackResult.completed, canceled: false };
  } catch (e) {
    console.error('Remote TTS error:', e.message);
    if (e.message.includes('404') || e.message.includes('403')) {
      state.mutableState.remoteTTSAvailable = false;
      if (window.updateServerStatusUI) window.updateServerStatusUI();
    }
    return {
      success: false,
      canceled: !isPlaybackSessionActive(sessionId)
    };
  }
};

export const warmVoiceCache = state.warmVoiceCache;

// ========== Voice Upload =============
export const uploadVoice = async (baseUrl) => {
  const nameInput = document.getElementById('voice-name-input');
  const fileInput = document.getElementById('voice-file-input');

  const voiceName = nameInput.value.trim();
  const voiceFile = fileInput.files[0];

  if (!voiceName) {
    alert('Please enter a voice name');
    return;
  }
  if (!voiceFile) {
    alert('Please select an audio file');
    return;
  }

  const formData = new FormData();
  formData.append('name', voiceName);
  formData.append('file', voiceFile);

  try {
    const response = await fetch(baseUrl + 'voices', {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      const result = await response.json();
      alert(`Voice "${voiceName}" uploaded successfully!`);
      nameInput.value = '';
      fileInput.value = '';

      const voices = await fetchRemoteVoices(baseUrl);
      state.mutableState.remoteVoices.length = 0;
      state.mutableState.remoteVoices.push(...voices);

      updateServerStatusUI();
      updateVoiceUploadUI();
      if (window.initHudVoiceSelect) window.initHudVoiceSelect();
    } else {
      const errorText = await response.text();
      alert(`Failed to upload voice: ${response.status} - ${errorText}`);
    }
  } catch (e) {
    alert(`Error uploading voice: ${e.message}`);
  }
};

// ========== Connection Management =============
export const connectToRemoteTTS = async (baseUrl, onVoicesFetched = null) => {
  console.log('[connectToRemoteTTS] Called with url:', baseUrl);

  if (!baseUrl) {
    console.log('[connectToRemoteTTS] No URL provided');
    return;
  }

  if (!baseUrl.endsWith('/v1/')) {
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl + 'v1/';
    } else {
      baseUrl = baseUrl + '/v1/';
    }
  }

  console.log('[connectToRemoteTTS] Final URL:', baseUrl);
  localStorage.setItem('ttsServerUrl', baseUrl);

  const statusText = document.getElementById('server-status-text');
  if (statusText) {
    statusText.textContent = '🔍 Connecting...';
  }

  const healthOk = await checkRemoteTTSHealth(baseUrl);

  if (healthOk) {
    const voices = await fetchRemoteVoices(baseUrl);
    state.mutableState.remoteVoices.length = 0;
    state.mutableState.remoteVoices.push(...voices);
    
    state.mutableState.remoteTTSAvailable = true;
    localStorage.setItem('ttsRemoteEnabled', 'true');
    localStorage.setItem('ttsRemoteAvailable', 'true');
    localStorage.setItem('ttsRemoteVoices', JSON.stringify(voices));

    if (onVoicesFetched && typeof onVoicesFetched === 'function') {
      onVoicesFetched(voices);
    }

    // Refresh avatar with resolved name if applicable
    const savedVoice = localStorage.getItem('hudVoiceSelection');
    if (savedVoice && window.updateVoiceAvatar) {
      window.updateVoiceAvatar(savedVoice);
    }

    console.log(`Connected to remote TTS server: ${baseUrl}`);
    console.log(`Available voices: ${voices.length}`);
  } else {
    state.mutableState.remoteTTSAvailable = false;
    localStorage.setItem('ttsRemoteAvailable', 'false');
    localStorage.removeItem('ttsRemoteVoices');
    console.warn('Remote TTS server not available');
  }

  updateServerStatusUI();
  updateVoiceUploadUI();
  if (window.initHudVoiceSelect) window.initHudVoiceSelect();
};

// ========== UI Updates =============
export const updateServerStatusUI = () => {
  const statusText = document.getElementById('server-status-text');
  const statusContainer = document.getElementById('server-status');

  if (!statusText) return;

  if (state.mutableState.remoteTTSAvailable && state.mutableState.remoteVoices && state.mutableState.remoteVoices.length > 0) {
    statusText.textContent = `✅ Remote TTS connected (${state.mutableState.remoteVoices.length} voices)`;
    if (statusContainer) {
      statusContainer.style.background = 'rgba(76, 175, 80, 0.15)';
      statusContainer.style.borderLeftColor = '#4caf50';
    }
  } else if (state.mutableState.remoteTTSAvailable && state.mutableState.remoteVoices && state.mutableState.remoteVoices.length === 0) {
    statusText.textContent = '⚠️ Server connected but no voices uploaded';
    if (statusContainer) {
      statusContainer.style.background = 'rgba(255, 152, 0, 0.15)';
      statusContainer.style.borderLeftColor = '#ff9800';
    }
  } else if (localStorage.getItem('ttsServerUrl')) {
    statusText.textContent = '❌ Remote TTS unavailable (using browser TTS)';
    if (statusContainer) {
      statusContainer.style.background = 'rgba(244, 67, 54, 0.15)';
      statusContainer.style.borderLeftColor = '#f44336';
    }
  } else {
    statusText.textContent = '🔌 Using browser TTS (no effects)';
    if (statusContainer) {
      statusContainer.style.background = 'rgba(255, 152, 0, 0.15)';
      statusContainer.style.borderLeftColor = '#ff9800';
    }
  }
};

export const updateVoiceUploadUI = () => {
  const uploadSection = document.getElementById('voice-upload-section');
  if (uploadSection) {
    if (state.mutableState.remoteTTSAvailable && state.mutableState.remoteVoices && state.mutableState.remoteVoices.length === 0) {
      uploadSection.style.display = 'block';
    } else {
      uploadSection.style.display = 'none';
    }
  }
};

// Cache for remote voices
export const loadCachedRemoteVoices = () => {
  const cached = localStorage.getItem('ttsRemoteVoices');
  if (cached) {
    try {
      const voices = JSON.parse(cached);
      console.log('Restored', voices.length, 'remote voices from cache');
      return voices;
    } catch (e) {
      console.error('Failed to parse cached voices:', e);
    }
  }
  return [];
};

// Module initialization
export const initRemoteTtsModule = async (onConnect = null) => {
  const savedServerUrl = localStorage.getItem('ttsServerUrl');
  
  updateServerStatusUI();
  updateVoiceUploadUI();

  if (savedServerUrl && onConnect) {
    await connectToRemoteTTS(savedServerUrl, onConnect);
  }
};
