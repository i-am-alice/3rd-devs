const BACKEND_URL = 'http://localhost:3000'; // Update if necessary

async function fetchAPI(endpoint: string, options: RequestInit): Promise<Response> {
  const response = await fetch(`${BACKEND_URL}/api/${endpoint}`, options);
  if (!response.ok) throw new Error(`API error: ${await response.text()}`);
  return response;
}

export async function transcribe(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.wav');
  formData.append('model', 'whisper-1');

  try {
    const response = await fetchAPI('transcribe', { method: 'POST', body: formData });
    const { transcription } = await response.json();
    console.log('Transcription received from API:', transcription);
    return transcription;
  } catch (error) {
    console.error('Whisper API error:', error);
    throw error;
  }
}

let currentAudio: HTMLAudioElement | null = null;

export async function speak(text: string): Promise<HTMLAudioElement> {
  try {
    const response = await fetchAPI('speakEleven', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    currentAudio = new Audio(audioUrl);
    currentAudio.play();
    return currentAudio;
  } catch (error) {
    console.error('Speak function error:', error);
    throw error;
  }
}

export function stopSpeaking(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function chat(messages: Message[]): Promise<string> {
  const response = await fetchAPI('chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });

  const data = await response.json();
  return data.choices[0].message.content;
}

export async function transcribeAudioBlob(audioBlob: Blob): Promise<string> {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.wav');

    const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        throw new Error('Transcription failed');
    }

    const data = await response.json();
    return data.transcription;
}