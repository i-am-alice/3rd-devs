let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let dataArray: Uint8Array;
let source: AudioBufferSourceNode | null = null;
let microphone: MediaStreamAudioSourceNode | null = null;
let microphoneStream: MediaStream | null = null;
let microphoneGain: GainNode | null = null;
let outputGain: GainNode | null = null;

const SILENCE_THRESHOLD = 5;
const SILENCE_DURATION = 2000;
const SPEECH_THRESHOLD = 10;
const CALIBRATION_DURATION = 2000;

let baselineNoise = 0;

export async function setupAudioCapture() {
  microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  analyser = audioContext.createAnalyser();
  microphone = audioContext.createMediaStreamSource(microphoneStream);
  
  microphoneGain = audioContext.createGain();
  outputGain = audioContext.createGain();
  
  microphone.connect(microphoneGain);
  microphoneGain.connect(analyser);
  
  // Don't connect microphone to output by default
  outputGain.connect(audioContext.destination);

  analyser.fftSize = 2048;
  dataArray = new Uint8Array(analyser.frequencyBinCount);

  await calibrateNoise();
}

async function calibrateNoise() {
  return new Promise<void>((resolve) => {
    let samples = 0;
    let sum = 0;
    const calibrate = () => {
      if (samples < CALIBRATION_DURATION / 50) {
        if (analyser) {
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          sum += average;
          samples++;
          requestAnimationFrame(calibrate);
        }
      } else {
        baselineNoise = sum / samples;
        console.log('Baseline noise:', baselineNoise);
        resolve();
      }
    };
    calibrate();
  });
}

export function visualize(canvas: HTMLCanvasElement, isUserSpeaking: boolean) {
  if (!analyser || !audioContext) return;

  const canvasCtx = canvas.getContext('2d')!;
  let animationId: number;

  function draw() {
    if (!analyser) {
      cancelAnimationFrame(animationId);
      return;
    }

    animationId = requestAnimationFrame(draw);

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    canvasCtx.fillStyle = 'rgb(0, 0, 0)';
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    canvasCtx.lineWidth = 2;
    const mainColor = isUserSpeaking ? '#7c3aed' : '#b91c1c';
    const glowColor = isUserSpeaking ? 'rgba(124, 58, 237, 0.5)' : 'rgba(185, 28, 28, 0.5)';

    canvasCtx.strokeStyle = mainColor;
    canvasCtx.beginPath();

    analyser.getByteTimeDomainData(dataArray);
    const sliceWidth = canvas.width * 1.0 / analyser.frequencyBinCount;
    let x = 0;

    for (let i = 0; i < analyser.frequencyBinCount; i++) {
      const v = dataArray[i] / 128.0;
      const y = v * canvas.height / 2;

      if (i === 0) {
        canvasCtx.moveTo(x, y);
      } else {
        canvasCtx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    canvasCtx.lineTo(canvas.width, canvas.height / 2);
    canvasCtx.stroke();

    canvasCtx.shadowBlur = 15;
    canvasCtx.shadowColor = glowColor;
    canvasCtx.strokeStyle = glowColor;
    canvasCtx.stroke();

    canvasCtx.shadowBlur = 0;
  }

  draw();
  return () => cancelAnimationFrame(animationId);
}

export function detectSpeech(callback: (isSpeaking: boolean) => void) {
  if (!analyser) return;

  analyser.getByteFrequencyData(dataArray);

  const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

  console.log('Average:', average, 'Baseline:', baselineNoise, 'Threshold:', SPEECH_THRESHOLD);
  if (average > baselineNoise + SPEECH_THRESHOLD) {
    callback(true);
  } else if (average < baselineNoise + SILENCE_THRESHOLD) {
    callback(false);
  }
}

export function stopAudioCapture() {
  if (microphoneStream) {
    microphoneStream.getTracks().forEach(track => track.stop());
    microphoneStream = null;
  }
  if (microphone) {
    microphone.disconnect();
    microphone = null;
  }
  if (analyser) {
    analyser.disconnect();
    analyser = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  if (microphoneGain) {
    microphoneGain.disconnect();
    microphoneGain = null;
  }
  if (outputGain) {
    outputGain.disconnect();
    outputGain = null;
  }
}

export async function playAudio(audioBuffer: ArrayBuffer) {
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  const decodedAudio = await audioContext.decodeAudioData(audioBuffer);
  source = audioContext.createBufferSource();
  source.buffer = decodedAudio;
  
  if (!analyser) {
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
  }
  
  // Mute the microphone before playing audio
  setMicrophoneMute(true);
  
  source.connect(analyser);
  source.connect(outputGain);

  return new Promise<void>((resolve) => {
    if (source) {
      source.start(0);
      source.onended = () => {
        source?.disconnect();
        setMicrophoneMute(false);
        resolve();
      };
    } else {
      resolve();
    }
  });
}

export function stopAliceSpeaking() {
  if (source) {
    source.stop();
    source.disconnect();
    source = null;
  }
}

// Modify this function to control microphone gain
export function reconnectMicrophone() {
  if (microphone && microphoneGain && analyser) {
    microphone.connect(microphoneGain);
    microphoneGain.connect(analyser);
  }
}

// Add a new function to mute/unmute the microphone
export function setMicrophoneMute(mute: boolean) {
  if (microphoneGain && audioContext) {
    microphoneGain.gain.setValueAtTime(mute ? 0 : 1, audioContext.currentTime);
  }
}
