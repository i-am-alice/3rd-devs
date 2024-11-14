interface WAVEncoderOptions {
  originalSampleRate: number;
  targetSampleRate: number;
}

export class WAVEncoder {
  private options: WAVEncoderOptions;

  constructor(options: WAVEncoderOptions) {
    this.options = options;
  }

  encodeWAV(samples: Float32Array): Blob {
    const downsampledMono = this.downsampleAndConvertToMono(samples);
    const buffer = this.encodeWAVBuffer(downsampledMono);
    return new Blob([buffer], { type: 'audio/wav' });
  }

  private downsampleAndConvertToMono(samples: Float32Array): Float32Array {
    const { originalSampleRate, targetSampleRate } = this.options;
    const ratio = originalSampleRate / targetSampleRate;
    const newLength = Math.round(samples.length / ratio);
    const result = new Float32Array(newLength);

    for (let i = 0; i < newLength; i++) {
      const index = Math.round(i * ratio);
      result[i] = samples[index];
    }

    return result;
  }

  private encodeWAVBuffer(samples: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, this.options.targetSampleRate, true);
    view.setUint32(28, this.options.targetSampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    this.writeString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);

    this.floatTo16BitPCM(view, 44, samples);

    return buffer;
  }

  private floatTo16BitPCM(view: DataView, offset: number, input: Float32Array): void {
    for (let i = 0; i < input.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, input[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
  }

  private writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}