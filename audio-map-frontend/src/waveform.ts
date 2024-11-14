// waveform.ts

// Imports (if needed)
import { canvas, canvasCtx } from './canvas'; // Ensure you have a module 'canvas.ts' exporting canvas and canvasCtx

// Visualization Variables
let angle = 0;
const ROTATION_SPEED = 0.02; // Adjust for desired rotation speed
const BLOB_INTENSITY = 0.075; // Adjust for desired blob distortion
const NUM_POINTS = 300;
let morphFactor = 0; // Start as a small circle
let currentOpacity = 0; // Start fully transparent
let lastRadius = 10; // Start with a small radius
const MORPH_SPEED = 0.05; // Adjust for smoothness of morph transition

const ACTIVE_OPACITY = 0.8;
const SILENT_OPACITY = 0.3;

let currentRed = 255, currentGreen = 255, currentBlue = 255;
const COLOR_SMOOTHING_FACTOR = 0.1;
const SMOOTHING_FACTOR = 0.1;

export let recordingAnimationId: number | null = null;
export let playbackAnimationId: number | null = null;
export let idleAnimationId: number | null = null;

// Add these new variables near the top of the file
let isInitialState = true;
const INITIAL_RADIUS = 35; // Adjust this value for the desired initial size
const INITIAL_OPACITY = 0.3; // Adjust this value for the desired initial opacity

// Function to Stop Idle Visualization
export function stopIdleVisualization() {
    if (idleAnimationId !== null) {
        cancelAnimationFrame(idleAnimationId);
        idleAnimationId = null;
    }
}

// Functions

function calculateRMS(dataArray: Uint8Array): number {
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
        const sample = (dataArray[i] - 128) / 128;
        sum += sample * sample;
    }
    return Math.sqrt(sum / dataArray.length);
}

export function startRecordingVisualization(
    analyserNode: AnalyserNode, 
    isRecording: () => boolean, 
    isSilent: () => boolean, 
    assistantSpeaking: () => boolean
) {
    if (!canvasCtx) return;

    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;

    // Create the data array here
    const dataArray = new Uint8Array(analyserNode.frequencyBinCount);

    const draw = () => {
        recordingAnimationId = requestAnimationFrame(draw);

        analyserNode.getByteTimeDomainData(dataArray);

        const rms = calculateRMS(dataArray);

        const minRadius = 50;
        const maxRadius = 170;
        const targetRadius = minRadius + (maxRadius - minRadius) * rms * 1.5;

        // Smooth the radius transition
        lastRadius += (targetRadius - lastRadius) * SMOOTHING_FACTOR;

        // Determine target color and opacity
        let targetRed, targetGreen, targetBlue, targetOpacity;
        const isIdle = !assistantSpeaking() && (!isRecording() || isSilent());

        if (assistantSpeaking()) {
            [targetRed, targetGreen, targetBlue] = [255, 255, 255]; // Assistant color
            targetOpacity = ACTIVE_OPACITY;
        } else if (isRecording() && !isSilent()) {
            [targetRed, targetGreen, targetBlue] = [255, 255, 255]; // User color
            targetOpacity = ACTIVE_OPACITY;
        } else {
            [targetRed, targetGreen, targetBlue] = [255, 255, 255]; // Idle color
            targetOpacity = SILENT_OPACITY;
        }

        // Smooth color and opacity transitions
        currentRed += (targetRed - currentRed) * COLOR_SMOOTHING_FACTOR;
        currentGreen += (targetGreen - currentGreen) * COLOR_SMOOTHING_FACTOR;
        currentBlue += (targetBlue - currentBlue) * COLOR_SMOOTHING_FACTOR;
        currentOpacity += (targetOpacity - currentOpacity) * SMOOTHING_FACTOR;

        // Clear the canvas
        canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

        // Set morphFactor based on idle state
        const targetMorphFactor = isIdle ? 1 : 0; // Full blob when idle, circle when active
        morphFactor += (targetMorphFactor - morphFactor) * MORPH_SPEED;

        // Draw the blob or circle
        canvasCtx.fillStyle = `rgb(${Math.round(currentRed)}, ${Math.round(currentGreen)}, ${Math.round(currentBlue)})`;
        canvasCtx.globalAlpha = currentOpacity;

        canvasCtx.beginPath();
        for (let i = 0; i <= NUM_POINTS; i++) {
            const t = (i / NUM_POINTS) * Math.PI * 2;
            let r = lastRadius;

            // Apply blob effect based on morphFactor
            const blobEffect = (
                Math.sin(t * 3 + angle) * BLOB_INTENSITY * lastRadius +
                Math.cos(t * 5 + angle * 0.5) * BLOB_INTENSITY * lastRadius * 0.8 +
                Math.sin(t * 7 + angle * 0.2) * BLOB_INTENSITY * 0.6 * lastRadius
            ) * morphFactor;

            r += blobEffect;

            const x = WIDTH / 2 + r * Math.cos(t);
            const y = HEIGHT / 2 + r * Math.sin(t);

            if (i === 0) {
                canvasCtx.moveTo(x, y);
            } else {
                canvasCtx.lineTo(x, y);
            }
        }
        canvasCtx.closePath();
        canvasCtx.fill();
        canvasCtx.globalAlpha = 1; // Reset global alpha

        // Update the angle for continuous rotation
        angle += ROTATION_SPEED;
    };

    draw();
}

export function stopRecordingVisualization() {
    if (recordingAnimationId) {
        cancelAnimationFrame(recordingAnimationId);
        recordingAnimationId = null;
    }
}

export function startPlaybackVisualization(analyserNode: AnalyserNode, dataArray: Uint8Array) {
    if (!canvasCtx) return;

    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;

    const draw = () => {
        playbackAnimationId = requestAnimationFrame(draw);

        analyserNode.getByteTimeDomainData(dataArray);

        const rms = calculateRMS(dataArray);

        const minRadius = 70;
        const maxRadius = 220;
        const targetRadius = minRadius + (maxRadius - minRadius) * (rms * 1.5);

        // Smooth the radius transition
        lastRadius += (targetRadius - lastRadius) * SMOOTHING_FACTOR;

        // Determine target color and opacity
        let targetRed = 255, targetGreen = 255, targetBlue = 255; // Assistant color
        let targetOpacity = ACTIVE_OPACITY;

        // Smooth color and opacity transitions
        currentRed += (targetRed - currentRed) * COLOR_SMOOTHING_FACTOR;
        currentGreen += (targetGreen - currentGreen) * COLOR_SMOOTHING_FACTOR;
        currentBlue += (targetBlue - currentBlue) * COLOR_SMOOTHING_FACTOR;
        currentOpacity += (targetOpacity - currentOpacity) * SMOOTHING_FACTOR;

        // Clear the canvas
        canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

        // Set morphFactor to 0 during playback (circle)
        const targetMorphFactor = 0; // Circle during playback
        morphFactor += (targetMorphFactor - morphFactor) * MORPH_SPEED;

        // Draw the blob or circle
        canvasCtx.fillStyle = `rgb(${Math.round(currentRed)}, ${Math.round(currentGreen)}, ${Math.round(currentBlue)})`;
        canvasCtx.globalAlpha = currentOpacity;

        canvasCtx.beginPath();
        for (let i = 0; i <= NUM_POINTS; i++) {
            const t = (i / NUM_POINTS) * Math.PI * 2;
            let r = lastRadius;

            // Apply blob effect based on morphFactor
            const blobEffect = (
                Math.sin(t * 3 + angle) * BLOB_INTENSITY * lastRadius +
                Math.cos(t * 5 + angle * 0.5) * BLOB_INTENSITY * lastRadius * 0.8 +
                Math.sin(t * 7 + angle * 0.2) * BLOB_INTENSITY * 0.6 * lastRadius
            ) * morphFactor;

            r += blobEffect;

            const x = WIDTH / 2 + r * Math.cos(t);
            const y = HEIGHT / 2 + r * Math.sin(t);

            if (i === 0) {
                canvasCtx.moveTo(x, y);
            } else {
                canvasCtx.lineTo(x, y);
            }
        }
        canvasCtx.closePath();
        canvasCtx.fill();
        canvasCtx.globalAlpha = 1; // Reset global alpha

        // Update the angle for continuous rotation
        angle += ROTATION_SPEED;
    };

    draw();
}

export function stopPlaybackVisualization() {
    if (playbackAnimationId) {
        cancelAnimationFrame(playbackAnimationId);
        playbackAnimationId = null;
    }
}

export function startIdleVisualization(isRecording: () => boolean, isSilent: () => boolean, assistantSpeaking: () => boolean) {
    if (!canvasCtx) return;

    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;

    const drawIdle = () => {
        idleAnimationId = requestAnimationFrame(drawIdle);

        // Determine if Idle
        const isIdle = !assistantSpeaking() && !isRecording();

        // Set Target Values for Morphing
        const targetMorphFactor = isIdle && !isInitialState ? 1 : 0;
        const targetOpacity = isInitialState ? INITIAL_OPACITY : (isIdle ? SILENT_OPACITY : ACTIVE_OPACITY);
        const targetRadius = isInitialState ? INITIAL_RADIUS : (isIdle ? 70 : lastRadius);

        // Smoothly Transition Values
        morphFactor += (targetMorphFactor - morphFactor) * MORPH_SPEED;
        currentOpacity += (targetOpacity - currentOpacity) * SMOOTHING_FACTOR;
        lastRadius += (targetRadius - lastRadius) * SMOOTHING_FACTOR;

        // Clear Canvas
        canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

        // Draw Circle or Blob
        canvasCtx.fillStyle = `rgb(255, 255, 255)`;
        canvasCtx.globalAlpha = currentOpacity;

        canvasCtx.beginPath();
        for (let i = 0; i <= NUM_POINTS; i++) {
            const t = (i / NUM_POINTS) * Math.PI * 2;
            let r = lastRadius;

            // Apply Blob Effect only if not in initial state
            if (!isInitialState) {
                const blobEffect = (
                    Math.sin(t * 3 + angle) * BLOB_INTENSITY * lastRadius +
                    Math.cos(t * 5 + angle * 0.5) * BLOB_INTENSITY * lastRadius * 0.8 +
                    Math.sin(t * 7 + angle * 0.2) * BLOB_INTENSITY * 0.6 * lastRadius
                ) * morphFactor;

                r += blobEffect;
            }

            const x = WIDTH / 2 + r * Math.cos(t);
            const y = HEIGHT / 2 + r * Math.sin(t);

            if (i === 0) {
                canvasCtx.moveTo(x, y);
            } else {
                canvasCtx.lineTo(x, y);
            }
        }
        canvasCtx.closePath();
        canvasCtx.fill();
        canvasCtx.globalAlpha = 1;

        // Update Angle for Rotation
        angle += ROTATION_SPEED;

        // Check if we should exit the initial state
        if (isInitialState && (isRecording() || assistantSpeaking())) {
            isInitialState = false;
        }
    };

    drawIdle();
}