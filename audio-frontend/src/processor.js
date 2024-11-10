// processor.js
class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    console.log("AudioProcessor constructor called");
    super();
    this.isAssistantSpeaking = false;
    this.isSilent = true;
    this.speechDetected = false;

    this.port.onmessage = (event) => {
      const { eventType, config } = event.data;

      if (eventType === 'assistantSpeaking') {
        this.isAssistantSpeaking = true;
      } else if (eventType === 'assistantStopped') {
        this.isAssistantSpeaking = false;
      }
    };

    this.threshold = 0.001; // Adjusted silence threshold
    this.silenceThresholdTime = 500; // Silence duration in ms
    this.speechThresholdTime = 200; // Speech duration in ms

    this.silenceDuration = 0;
    this.speechDuration = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];

    if (input.length > 0) {
      const channelData = input[0];
      const rms = this.calculateRMS(channelData);

      this.detectInterruption(rms);
      this.detectSilence(rms, channelData);

      // Always send audio data to the main thread
      this.port.postMessage({ audioChunk: channelData });
    }

    return true;
  }

  detectInterruption(rms) {
    if (this.isAssistantSpeaking && rms > this.interruptionThreshold) {
      this.port.postMessage({ eventType: 'userInterruption' });
    }
  }

  detectSilence(rms, channelData) {
    const frameDuration = (channelData.length / sampleRate) * 1000;

    if (rms < this.threshold) {
      this.silenceDuration += frameDuration;
      this.speechDuration = 0;

      if (!this.isSilent && this.silenceDuration >= this.silenceThresholdTime) {
        this.isSilent = true;
        this.speechDetected = false;
        this.port.postMessage({ eventType: 'silenceStart' });
      }
    } else {
      this.speechDuration += frameDuration;
      this.silenceDuration = 0;

      if ((this.isSilent || !this.speechDetected) && this.speechDuration >= this.speechThresholdTime) {
        this.isSilent = false;
        this.speechDetected = true;
        this.port.postMessage({ eventType: 'silenceEnd' });
      }
    }
  }

  calculateRMS(channelData) {
    let sumSquares = 0;
    for (let i = 0; i < channelData.length; i++) {
      sumSquares += channelData[i] * channelData[i];
    }
    return Math.sqrt(sumSquares / channelData.length);
  }
}

registerProcessor('audio-processor', AudioProcessor);