import { chat, speak, transcribe } from './api';
import { WAVEncoder } from './wavEncoder';
import {
    startRecordingVisualization,
    stopRecordingVisualization,
    startPlaybackVisualization,
    stopPlaybackVisualization,
    startIdleVisualization,
} from './waveform';
import { Transformer } from 'markmap-lib';
import { Markmap, loadCSS, loadJS } from 'markmap-view';

// Types
type Message = {
    role: 'user' | 'assistant';
    content: string;
};

// UI Elements
const callBtn = document.getElementById("callBtn") as HTMLButtonElement;
const statusSpan = document.getElementById("status") as HTMLSpanElement;
const conversationHistoryDiv = document.getElementById("conversationHistory") as HTMLDivElement;
const latestTranscriptionDiv = document.getElementById("latestTranscription") as HTMLDivElement;

// State

// Add this variable to track when speech started
let speechStartTime: number | null = null;
let accumulatedBuffer: Float32Array = new Float32Array(0);
let isRecording = false;
let conversationHistory: Message[] = [];
let latestTranscription: string = "";
let isTranscribing = false;
let isProcessing = false; // New flag to prevent concurrent interactions
let audioContext: AudioContext | null = null;
let stream: MediaStream | null = null;
let microphone: MediaStreamAudioSourceNode | null = null;
let audioProcessor: AudioWorkletNode | null = null;
let isSilent = true;
let assistantSpeaking = false;

const INITIAL_TRANSCRIPTION_DELAY_MS = 1500;
const MIN_AUDIO_LENGTH_SECONDS = 0.5;
const TRANSCRIPTION_INTERVAL_MS = 1000;
const sampleRate = 44100;
const originalSampleRate = 44100;
const targetSampleRate = 16000;
const wavEncoder = new WAVEncoder({ originalSampleRate, targetSampleRate });

// Add these variables for markmap
let markmapInstance: Markmap | null = null;
const transformer = new Transformer();

// Visualization state functions
const isRecordingFunc = () => isRecording;
const isSilentFunc = () => isSilent;
const assistantSpeakingFunc = () => assistantSpeaking;

callBtn.addEventListener("click", async () => {
    if (!isRecording) {
        await startRecording();
        callBtn.textContent = "Hang up";
    } else {
        stopRecording();
        callBtn.textContent = "Call";
    }
});

async function startRecording() {
    console.log("Starting recording");
    isRecording = true;

    try {
        // Initialize the AudioContext (creates a new context or resumes an existing one)
        await initAudioContext();
        if (!audioContext) throw new Error("Failed to initialize AudioContext");
        
        // Load the custom audio processing script (processor.js) into the AudioWorklet
        await audioContext.audioWorklet.addModule(new URL('./processor.js', import.meta.url));

        // Request access to the user's microphone
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Create an audio source node from the microphone stream
        microphone = audioContext.createMediaStreamSource(stream);

        // Create an AnalyserNode for real-time frequency analysis (used for visualization)
        const microphoneAnalyser = audioContext.createAnalyser();
        microphoneAnalyser.fftSize = 256; // Set size of Fast Fourier Transform
        // Connect the microphone source to the analyser
        microphone.connect(microphoneAnalyser);

        // Create an AudioWorkletNode for custom audio processing
        audioProcessor = new AudioWorkletNode(audioContext, 'audio-processor');
        // Connect the microphone source to the audio processor
        microphone.connect(audioProcessor);
        // Set up a message handler for processed audio data
        audioProcessor.port.onmessage = processAudio;
        
        // Start the visualization of the audio input
        startRecordingVisualization(
            microphoneAnalyser,     // AnalyserNode for frequency data
            isRecordingFunc,        // Function to check if recording is active
            isSilentFunc,           // Function to check if audio is silent
            assistantSpeakingFunc   // Function to check if AI is speaking
        );
    } catch (error) {
        console.error("Error setting up audio processing:", error);
        isRecording = false;
    }
}

async function processAudio(event: MessageEvent) {
    const { audioChunk, eventType } = event.data;

    if (eventType) {
        console.log("Received event:", eventType);
        isSilent = eventType === 'silenceStart';
        if (eventType === 'silenceEnd' && assistantSpeaking) {
            // Reset when silence ends after assistant speech
            assistantSpeaking = false;
            accumulatedBuffer = new Float32Array(0);
        }
        if (eventType === 'silenceEnd' && !assistantSpeaking) {
            // Mark the start of user speech
            speechStartTime = Date.now();
        }
    }

    if (audioChunk) {
        // Calculate silence percentage for the current audio chunk
        const silencePercentage = calculateSilencePercentage(audioChunk);
        if (silencePercentage < 95) {
            // Add non-silent audio to the buffer
            accumulatedBuffer = concatFloat32Arrays([accumulatedBuffer, audioChunk]);
        }
    }

    try {
        if (!assistantSpeaking && shouldTranscribe()) {
            // Check if the accumulated buffer is mostly non-silent
            const bufferSilencePercentage = calculateSilencePercentage(accumulatedBuffer);
            if (bufferSilencePercentage < 90) {
                await performTranscription();
            }
        }

        if (!isProcessing && isSilent && latestTranscription && !assistantSpeaking) {
            // Process transcription when silence is detected and we're not already processing
            isProcessing = true;
            try {
                await interact();
            } finally {
                isProcessing = false;
                latestTranscription = ""; // Reset transcription after processing
            }
        }
    } catch (error) {
        console.error("Error in processAudio:", error);
        isProcessing = false;
    }
}

function calculateSilencePercentage(audioChunk: Float32Array): number {
    const silenceThreshold = 0.01; // Adjust this value as needed
    let silenceSamples = 0;

    for (let i = 0; i < audioChunk.length; i++) {
        if (Math.abs(audioChunk[i]) < silenceThreshold) {
            silenceSamples++;
        }
    }

    return (silenceSamples / audioChunk.length) * 100;
}

async function interact() {
    console.log("User said:", latestTranscription);
    if (latestTranscription.trim()) {
        // update final transcription one more time
        await performTranscription();
        conversationHistory.push({ role: 'user', content: latestTranscription });
        latestTranscription = ""; // Clear the latest transcription
        latestTranscriptionDiv.textContent = "..."; // Update UI
        updateConversationHistory();

        try {
            const { message, markmapSyntax } = await chat(conversationHistory);
            conversationHistory.push({ role: 'assistant', content: message });
            updateConversationHistory();

            // Create and render markmap
            await createMarkmap(markmapSyntax);

            await answer(message);
        } catch (error) {
            console.error("Chat API error:", error);
        }
    }

    accumulatedBuffer = new Float32Array(0); // Clear the accumulated buffer
}

function stopRecording() {
    console.log("Stopping recording");
    isRecording = false;

    // Stop the media stream
    if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        stream = null;
    }

    // Disconnect and nullify the microphone node
    if (microphone) {
        microphone.disconnect();
        microphone = null;
    }

    // Disconnect and nullify the audio processor
    if (audioProcessor) {
        audioProcessor.port.onmessage = null; // Remove event listeners
        audioProcessor.disconnect();
        audioProcessor = null;
    }

    // Close the AudioContext if you don't need it anymore
    if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
        audioContext = null;
    }

    // Stop visualizations
    stopRecordingVisualization();
    stopPlaybackVisualization();
    startIdleVisualization(isRecordingFunc, isSilentFunc, assistantSpeakingFunc);
}

async function answer(responseText: string) {
    assistantSpeaking = true;
    isSilent = true;

    if (!audioContext) throw new Error("Failed to initialize AudioContext");

    const audio = await speak(responseText);
    console.log("Audio:", audio);
    const audioSource = audioContext.createMediaElementSource(audio);

    const playbackAnalyser = audioContext.createAnalyser();
    playbackAnalyser.fftSize = 256;
    const playbackDataArray = new Uint8Array(playbackAnalyser.frequencyBinCount);

    audioSource.connect(playbackAnalyser);
    playbackAnalyser.connect(audioContext.destination);

    startPlaybackVisualization(playbackAnalyser, playbackDataArray);

    audio.playbackRate = 1.05;
    audio.play();
    audio.onended = () => {
        assistantSpeaking = false;
        stopPlaybackVisualization();
    };
}

function shouldTranscribe(): boolean {
    const audioLengthSeconds = accumulatedBuffer.length / sampleRate;
    const timeSinceLastTranscription = Date.now() - lastTranscriptionTime;
    const timeSinceSpeechStart = speechStartTime ? Date.now() - speechStartTime : 0;

    return !isTranscribing && !isSilent &&
           timeSinceLastTranscription >= TRANSCRIPTION_INTERVAL_MS &&
           audioLengthSeconds >= MIN_AUDIO_LENGTH_SECONDS &&
           timeSinceSpeechStart >= INITIAL_TRANSCRIPTION_DELAY_MS;
}

async function performTranscription() {
    isTranscribing = true;
    const wavBlob = encodeWAV(accumulatedBuffer);
    console.log("Transcribing audio...");

    try {
        const newTranscription = await transcribe(wavBlob);
        latestTranscription = newTranscription;
        latestTranscriptionDiv.textContent = latestTranscription.trim();
    } catch (error) {
        console.error("Transcription error:", error);
    } finally {
        lastTranscriptionTime = Date.now();
        isTranscribing = false;
    }
}

function updateConversationHistory() {
    conversationHistoryDiv.innerHTML = '';
    conversationHistory.forEach((message) => {
        const messageElement = document.createElement('div');
        messageElement.className = `mb-3 ${message.role === 'user' ? 'text-right' : 'text-left'}`;
        messageElement.innerHTML = `
            <span class="inline-block px-4 py-2 rounded-2xl ${
                message.role === 'user' 
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white' 
                : 'bg-gray-700/70 text-gray-100'
            } shadow-md">
                ${message.content}
            </span>
        `;
        conversationHistoryDiv.appendChild(messageElement);
    });
    conversationHistoryDiv.scrollTop = conversationHistoryDiv.scrollHeight;
}

function concatFloat32Arrays(arrays: Float32Array[]): Float32Array {
    let totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
    const result = new Float32Array(totalLength);
    let offset = 0;
    for (const arr of arrays) {
      result.set(arr, offset);
      offset += arr.length;
    }
    return result;
}

function encodeWAV(samples: Float32Array): Blob {
    return wavEncoder.encodeWAV(samples);
}

let lastTranscriptionTime = 0;

async function initAudioContext() {
    if (!audioContext || audioContext.state === 'closed') {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }
    }
}

async function createMarkmap(markmapSyntax: string) {
    const { root, features } = transformer.transform(markmapSyntax);
    const { styles, scripts } = transformer.getUsedAssets(features);

    // Load assets
    if (styles) await loadCSS(styles);
    if (scripts) await loadJS(scripts, { getMarkmap: () => (window as any).markmap });

    // Clear existing markmap
    const container = document.getElementById('markmapContainer');
    if (container) container.innerHTML = '<svg id="markmap" style="width: 100%; height: 100%;"></svg>';

    // Create new markmap
    const svg = document.getElementById('markmap') as SVGElement;
    markmapInstance = Markmap.create(svg, { autoFit: true }, root);
}

// Start Idle Visualization on Page Load
document.addEventListener("DOMContentLoaded", () => {
    startIdleVisualization(isRecordingFunc, isSilentFunc, assistantSpeakingFunc);
});