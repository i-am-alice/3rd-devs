import { setupAudioCapture, visualize, detectSpeech, stopAudioCapture, playAudio, stopAliceSpeaking, reconnectMicrophone, setMicrophoneMute } from './audio';

if (!window.MediaRecorder) {
  console.error('MediaRecorder is not supported in this browser');
  // Disable recording functionality or show an error message to the user
}

let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];

const recordButton = document.getElementById('record') as HTMLButtonElement;
const pauseButton = document.getElementById('pause') as HTMLButtonElement;
const micSelect = document.getElementById('mic-select') as HTMLSelectElement;
const callButton = document.getElementById('call') as HTMLButtonElement;

const canvas = document.getElementById('visualizer') as HTMLCanvasElement;
const canvasCtx = canvas.getContext('2d')!;

let isListening = false;
let silenceStart: number | null = null;
let isSpeaking = false;
let isUserSpeaking = true;
let isPlayingback = false;

let timerInterval: ReturnType<typeof setInterval> | null = null;
let startTime: number | null = null;
const timerElement = document.getElementById('timer') as HTMLParagraphElement;

const waitingIndicator = document.getElementById('waiting-indicator') as HTMLDivElement;

let isWaiting = false;

function animateWaitingWaveform() {
  if (!isWaiting) return;

  canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
  canvasCtx.fillStyle = 'rgb(0, 0, 0)';
  canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

  const time = Date.now() / 1000;
  const amplitude = canvas.height / 4;
  const frequency = 2;

  canvasCtx.beginPath();
  canvasCtx.moveTo(0, canvas.height / 2);

  for (let x = 0; x < canvas.width; x++) {
    const y = amplitude * Math.sin(x / 20 + time * frequency) + canvas.height / 2;
    canvasCtx.lineTo(x, y);
  }

  canvasCtx.strokeStyle = '#8b5cf6'; // Purple color
  canvasCtx.lineWidth = 2;
  canvasCtx.stroke();

  requestAnimationFrame(animateWaitingWaveform);
}

function updateTimer() {
  if (startTime === null) return;
  
  const elapsedTime = Date.now() - startTime;
  const hours = Math.floor(elapsedTime / 3600000);
  const minutes = Math.floor((elapsedTime % 3600000) / 60000);
  const seconds = Math.floor((elapsedTime % 60000) / 1000);
  
  timerElement.textContent = [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    seconds.toString().padStart(2, '0')
  ].join(':');
}

function startTimer() {
  if (timerInterval !== null) return;
  startTime = Date.now();
  timerInterval = setInterval(updateTimer, 1000);
}

function stopTimer() {
  if (timerInterval === null) return;
  clearInterval(timerInterval);
  timerInterval = null;
  startTime = null;
  timerElement.textContent = '00:00:00';
}

async function startCall() {
  await setupAudioCapture();
  setMicrophoneMute(false);
  isListening = true;
  callButton.textContent = 'End Call';
  startSpeechDetection();
  startTimer();
}

function startSpeechDetection() {
  if (!isListening || isPlayingback) return;

  detectSpeech((speaking) => {
    if (speaking) {
      if (!isSpeaking) {
        console.log('Speech detected');
        isSpeaking = true;
        silenceStart = null;
        startRecording();
      }
    } else {
      if (isSpeaking) {
        if (!silenceStart) {
          silenceStart = Date.now();
        } else if (Date.now() - silenceStart > 2000) {
          console.log('Silence detected');
          isSpeaking = false;
          stopRecording();
        }
      }
    }
  });

  if (isListening) {
    requestAnimationFrame(startSpeechDetection);
  }
}

async function endCall() {
  isListening = false;
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    await new Promise(resolve => mediaRecorder!.onstop = resolve);
  }
  
  stopAliceSpeaking();
  setMicrophoneMute(true);
  stopAudioCapture();
  
  callButton.textContent = 'Start Call';
  waitingIndicator.classList.add('hidden');
  
  await restartChat();
  stopTimer();
  
  console.log('Call ended, all processes stopped');
}

async function getAvailableMicrophones() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const audioDevices = devices.filter(device => device.kind === 'audioinput');
  console.log('Available audio devices:', audioDevices);
  return audioDevices;
}

async function populateMicrophoneList() {
  const mics = await getAvailableMicrophones();
  micSelect.innerHTML = '';
  mics.forEach(mic => {
    const option = document.createElement('option');
    option.value = mic.deviceId;
    option.text = mic.label || `Microphone ${micSelect.length + 1}`;
    micSelect.appendChild(option);
  });
}

async function startRecording() {
  audioChunks = [];
  const stream = await navigator.mediaDevices.getUserMedia({ 
    audio: { deviceId: micSelect.value ? { exact: micSelect.value } : undefined } 
  });
  mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      console.log('Data available:', event.data.size);
      audioChunks.push(event.data);
    }
  };
  mediaRecorder.start(100);
  recordButton.textContent = 'Stop';
  pauseButton.style.display = 'none'

  visualize(canvas, isUserSpeaking);
}

async function stopRecording() {
  if (mediaRecorder) {
    mediaRecorder.stop();
    await new Promise(resolve => mediaRecorder!.onstop = resolve);
    console.log('Total audio chunks:', audioChunks.length);
    console.log('Total audio size:', audioChunks.reduce((acc, chunk) => acc + chunk.size, 0));
    mediaRecorder = null;
    recordButton.textContent = 'Record';
    pauseButton.style.display = 'none';

    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    await processAudio();
  }
}

// Add these variables at the top of the file
const chatContainer = document.getElementById('chat-container') as HTMLDivElement;

async function processAudio() {
  if (audioChunks.length === 0) {
    console.error('No audio data recorded');
    return;
  }
  const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
  console.log('Audio blob size:', audioBlob.size);
  console.log('Audio blob type:', audioBlob.type);

  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');
  
  try {
    pauseRecordingAndListening();
    isWaiting = true;
    waitingIndicator.classList.remove('hidden');
    waitingIndicator.textContent = "Alice is thinking...";
    animateWaitingWaveform();

    const transcriptionResponse = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData,
    });
    if (!transcriptionResponse.ok) {
      const errorText = await transcriptionResponse.text();
      throw new Error(`HTTP error! status: ${transcriptionResponse.status}, message: ${errorText}`);
    }
    const transcriptionData = await transcriptionResponse.json();
    const transcribedText = transcriptionData.transcription;

    // Add user message to chat
    addMessageToChat('user', transcribedText);

    const chatResponse = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: transcribedText }],
      }),
    });
    if (!chatResponse.ok) {
      throw new Error(`HTTP error! status: ${chatResponse.status}`);
    }
    const chatData = await chatResponse.json();
    console.log('Chat response:', chatData);
    const assistantResponse = chatData.content;

    // Add assistant message to chat
    addMessageToChat('assistant', assistantResponse);

    const ttsResponse = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: assistantResponse }),
    });
    if (!ttsResponse.ok) {
      throw new Error(`HTTP error! status: ${ttsResponse.status}`);
    }
    const audioBuffer = await ttsResponse.arrayBuffer();
    
    isUserSpeaking = false;
    isPlayingback = true;
    setMicrophoneMute(true);
    const stopVisualization = visualize(canvas, isUserSpeaking);
    
    isWaiting = false;
    waitingIndicator.textContent = "Alice is speaking...";

    console.log('Starting audio playback');
    await playAudio(audioBuffer);
    console.log('Audio playback ended');
    if (stopVisualization) stopVisualization();
    isUserSpeaking = true;
    isPlayingback = false;
    
    waitingIndicator.textContent = "You can speak now";
    setTimeout(() => {
      waitingIndicator.classList.add('hidden');
    }, 3000);
    
    setMicrophoneMute(false);
    reconnectMicrophone();
    visualize(canvas, isUserSpeaking);
    resumeRecordingAndListening();

  } catch (error) {
    console.error('Error processing audio:', error);
    isWaiting = false;
    waitingIndicator.textContent = "An error occurred. You can speak now.";
    setTimeout(() => {
      waitingIndicator.classList.add('hidden');
    }, 3000);
    resumeRecordingAndListening();
  }
}

// Add this new function to handle adding messages to the chat
function addMessageToChat(role: 'user' | 'assistant', content: string) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('mb-2', 'p-2', 'rounded', role === 'user' ? 'bg-purple-700' : 'bg-fuchsia-700', 'text-white');
  messageElement.textContent = `${role === 'user' ? 'You' : 'Alice'}: ${content}`;
  chatContainer.insertBefore(messageElement, chatContainer.firstChild);
}

function pauseRecordingAndListening() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.pause();
  }
  isListening = false;
}

function resumeRecordingAndListening() {
  if (mediaRecorder && mediaRecorder.state === 'paused') {
    mediaRecorder.resume();
  }
  isListening = true;
  startSpeechDetection();
}

setTimeout(() => {
    recordButton.addEventListener('click', () => {
        if (mediaRecorder === null) {
          startRecording();
        } else {
          stopRecording();
        }
      });
}, 1000);

pauseButton.addEventListener('click', () => {
  if (mediaRecorder?.state === 'recording') {
    mediaRecorder.pause();
    pauseButton.textContent = 'Resume';
  } else if (mediaRecorder?.state === 'paused') {
    mediaRecorder.resume();
    pauseButton.textContent = 'Pause';
  }
});

callButton.addEventListener('click', async () => {
  if (!isListening) {
    await startCall();
  } else {
    await endCall();
  }
});

const restartButton = document.getElementById('restart') as HTMLButtonElement;

async function restartChat() {
  try {
    const response = await fetch('/api/clear-conversation', { method: 'POST' });
    if (response.ok) {
      console.log('Conversation restarted');
    } else {
      console.error('Failed to restart conversation');
    }
  } catch (error) {
    console.error('Error restarting conversation:', error);
  }
}

restartButton.addEventListener('click', restartChat);

window.addEventListener('load', async () => {
  await populateMicrophoneList();
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
});

window.addEventListener('resize', () => {
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
});