/**
 * Robot UI Module
 * Handles the robot SVG animations and LED states
 */

import * as state from './state.js';

let meter = null;
let meterInterval = null;
const connectedSources = new WeakSet();
const VOICE_IMAGE_MIN_OPACITY = 0.75;
const VOICE_IMAGE_MAX_OPACITY = 1;
const VOICE_IMAGE_MIN_SATURATION = 0.75;
const VOICE_IMAGE_MAX_SATURATION = 1;

const setVoiceImageLevel = (normalizedLevel) => {
    const container = document.getElementById('voice-image-container');
    const img = document.getElementById('voice-image');
    if (!container || !img || container.style.display === 'none') return;

    const clampedLevel = Math.max(0, Math.min(1, normalizedLevel));
    const opacity = VOICE_IMAGE_MIN_OPACITY + ((VOICE_IMAGE_MAX_OPACITY - VOICE_IMAGE_MIN_OPACITY) * clampedLevel);
    const saturation = VOICE_IMAGE_MIN_SATURATION + ((VOICE_IMAGE_MAX_SATURATION - VOICE_IMAGE_MIN_SATURATION) * clampedLevel);
    container.style.opacity = String(opacity);
    img.style.filter = `saturate(${saturation})`;
};

/**
 * Updates the robot's avatar based on the selected voice
 * @param {string} voiceIdOrName - The ID or human-readable name of the voice
 */
export const updateVoiceAvatar = (voiceIdOrName) => {
    const container = document.getElementById('voice-image-container');
    const img = document.getElementById('voice-image');
    if (!container || !img) return;

    if (!voiceIdOrName) {
        container.style.display = 'none';
        return;
    }

    // Resolve name from ID if possible
    let resolvedName = voiceIdOrName;
    if (state.mutableState.remoteVoices && state.mutableState.remoteVoices.length > 0) {
        const remoteVoice = state.mutableState.remoteVoices.find(v => v.id === voiceIdOrName);
        if (remoteVoice) resolvedName = remoteVoice.name;
    }

    const name = resolvedName.toLowerCase();
    let src = '';
    
    if (name.includes('rob')) src = 'src/img/Rob.jpeg';
    else if (name.includes('chris')) src = 'src/img/Chris.jpg';
    else if (name.includes('josh')) src = 'src/img/Josh.webp';
    else if (name.includes('john')) src = 'src/img/John.webp';
    else if (name.includes('jimi')) src = 'src/img/Jimi.jpg';

    if (src) {
        // Only update if src changed to avoid flickering
        if (!img.src.endsWith(src)) {
            img.src = src;
        }
        container.style.display = 'block';
        setVoiceImageLevel(0);
    } else {
        container.style.display = 'none';
    }
};

/**
 * Initializes the robot UI components
 */
export const initRobotUI = () => {
    console.log('[RobotUI] Initializing...');
    const robotContainer = document.getElementById('robot-container');
    if (!robotContainer) {
        console.warn('[RobotUI] Robot container not found in DOM');
        return;
    }
    
    // Initial state: idle
    setThinkLedState('idle');
    setMainLedLevel(0);
    setVoiceImageLevel(0);

    // Initial avatar update from saved selection
    const savedVoice = localStorage.getItem('hudVoiceSelection');
    if (savedVoice) {
        updateVoiceAvatar(savedVoice);
    }

    // Add click event listener to toggle playback
    robotContainer.addEventListener('click', async () => {
        if (window.togglePlayPause) {
            state.mutableState.hasInteracted = true;
            await window.togglePlayPause();
        }
    });
};

/**
 * Sets the state of the "think" LED (top)
 * @param {string} mode - 'thinking', 'speaking', or 'idle'
 */
export const setThinkLedState = (mode) => {
    const thinkLed = document.getElementById('path3');
    if (!thinkLed) return;
    
    switch (mode) {
        case 'thinking': // Yellow/Orange before speaking
            thinkLed.style.fill = '#ffaa00';
            thinkLed.style.fillOpacity = '0.5';
            thinkLed.style.stroke = '#ffcc00';
            break;
        case 'speaking': // Green while speaking
            thinkLed.style.fill = '#00ff00';
            thinkLed.style.fillOpacity = '0.5';
            thinkLed.style.stroke = '#55ff55';
            break;
        case 'idle':
        default: // Dark grey when done
            thinkLed.style.fill = '#4c4c4c';
            thinkLed.style.fillOpacity = '0.5';
            thinkLed.style.stroke = '#676767';
            break;
    }
};

/**
 * Sets the brightness/level of the "main" LED (bottom)
 * @param {number} normalizedLevel - 0.0 to 1.0
 */
export const setMainLedLevel = (normalizedLevel) => {
    const mainLed = document.getElementById('path4');
    if (!mainLed) return;
    
    // We use the accent color for the main LED
    const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() || '#7aa2f7';
    
    // Update the gradient stops to match the current accent color
    const glowGradient = document.getElementById('glowGradient');
    if (glowGradient) {
        const stops = glowGradient.getElementsByTagName('stop');
        if (stops.length >= 2) {
            stops[0].setAttribute('stop-color', "#fff");
            stops[1].setAttribute('stop-color', "#fff");
        }
    }

    // Balanced visual curve
    const visualLevel = Math.pow(normalizedLevel, 0.8);

    // Update LED visuals
    mainLed.style.fill = 'url(#glowGradient)';
    mainLed.style.fillOpacity = 0.1 + (visualLevel * 0.8);
    mainLed.style.stroke = accentColor;
    mainLed.style.strokeOpacity = 0.2 + (visualLevel * 0.7);
    
    // Use dynamic stroke width for a "glow" that won't clip like filters do
    mainLed.style.strokeWidth = `${0.5 + (visualLevel * 3)}px`;
    
    // Light blur is okay as long as it's small (prevents square clipping)
    if (visualLevel > 0.05) {
        const blurSize = visualLevel * 2;
        mainLed.style.filter = `blur(${blurSize}px)`;
    } else {
        mainLed.style.filter = 'none';
    }
};

/**
 * Starts the audio meter to drive the main LED
 * @param {AudioNode|Tone.AudioNode} sourceNode - The audio source to monitor
 */
export const startMainLedMeter = (sourceNode) => {
    if (!window.Tone || !sourceNode) return;
    
    // Create meter if it doesn't exist
    if (!meter) {
        meter = new Tone.Meter({ smoothing: 0.6 });
    }
    
    // Avoid redundant connections to the same meter
    if (connectedSources.has(sourceNode)) {
        console.debug('[RobotUI] Source already connected to meter');
    } else {
        // Connect source to meter
        try {
            // In Tone.js, to connect a native node to a Tone node, we connect to meter.input
            // We use direct connection for Tone-to-Tone nodes for maximum compatibility.
            try {
                if (sourceNode.connect) {
                    // sourceNode might be a Tone node or native node
                    // meter is a Tone node, so we connect to its input
                    const destination = meter.input || meter;
                    sourceNode.connect(destination);
                    connectedSources.add(sourceNode);
                } else if (sourceNode.output && sourceNode.output.connect) {
                    sourceNode.output.connect(meter.input || meter);
                    connectedSources.add(sourceNode);
                }
            } catch (connErr) {
                console.warn('[RobotUI] Direct connection failed, trying Tone.connect:', connErr);
                if (window.Tone && typeof window.Tone.connect === 'function') {
                    window.Tone.connect(sourceNode, meter);
                    connectedSources.add(sourceNode);
                }
            }
        } catch (e) {
            console.warn('[RobotUI] Failed to connect meter:', e);
        }
    }
    
    if (meterInterval) clearInterval(meterInterval);
    
    meterInterval = setInterval(() => {
        const dbLevel = meter.getValue();
        // Tone.Meter.getValue() can return a single number (dB) or an array
        const level = Array.isArray(dbLevel) ? dbLevel[0] : dbLevel;
        
        // Convert dB (-100 to 0) to normalized 0-1
        // Sensible range: -45dB to -5dB
        const normalized = Math.max(0, Math.min(1, (level + 45) / 40));
        setMainLedLevel(normalized);
        setVoiceImageLevel(normalized);
    }, 40);
};

/**
 * Stops the audio meter
 */
export const stopMainLedMeter = () => {
    if (meterInterval) {
        clearInterval(meterInterval);
        meterInterval = null;
    }
    setMainLedLevel(0);
    setVoiceImageLevel(0);
};

// Expose on window for easy access from other modules
window.setThinkLedState = setThinkLedState;
window.startMainLedMeter = startMainLedMeter;
window.stopMainLedMeter = stopMainLedMeter;
window.setMainLedLevel = setMainLedLevel;
window.updateVoiceAvatar = updateVoiceAvatar;
