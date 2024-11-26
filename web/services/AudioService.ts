import ffmpeg from 'fluent-ffmpeg';
import { exec } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';
import type { AudioMetadata, AudioLoudnessData, SilenceInterval, AudioChunk, NonSilentInterval } from '../types/types';

const execPromise = util.promisify(exec);

export class AudioService {
  async getMetadata(filePath: string): Promise<AudioMetadata> {
    try {
      const data = await this.probeFile(filePath);
      return this.extractMetadata(data);
    } catch (error) {
      this.handleError(error);
    }
  }

  private probeFile(filePath: string): Promise<ffmpeg.FfprobeData> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata);
      });
    });
  }

  private extractMetadata(data: ffmpeg.FfprobeData): AudioMetadata {
    const stream = data.streams.find(s => s.codec_type === 'audio');
    if (!stream) throw new Error('No audio stream found');

    const format = data.format;
    return {
      duration: Number(format.duration) || 0,
      sampleRate: Number(stream.sample_rate) || 0,
      channels: stream.channels || 0,
      bitRate: Number(stream.bit_rate) || 0,
      codec: stream.codec_name || 'unknown',
      format: format.format_name || 'unknown'
    };
  }

  private handleError(error: Error): never {
    console.error('Error getting audio metadata:', error);
    throw error;
  }

  async analyzeLoudness(filePath: string, interval = 0.1): Promise<AudioLoudnessData[]> {
    const loudnessData: AudioLoudnessData[] = [];

    return new Promise((resolve, reject) => {
      ffmpeg(filePath)
        .audioFilters(`astats=metadata=1:reset=${interval}`)
        .audioFilters('aresample=8000')
        .format('null')
        .output('/dev/null')
        .on('error', reject)
        .on('stderr', stderrLine => {
          const rmsMatch = stderrLine.match(/lavfi\.astats\.Overall\.RMS_level=(-?\d+(\.\d+)?)/);
          const timeMatch = stderrLine.match(/pts_time:(\d+(\.\d+)?)/);
          if (rmsMatch && timeMatch) {
            loudnessData.push({
              time: parseFloat(timeMatch[1]),
              loudness: parseFloat(rmsMatch[1])
            });
          }
        })
        .on('end', () => resolve(loudnessData))
        .run();
    });
  }

  
  async detectSilence(filePath: string, threshold = -50, minDuration = 2): Promise<SilenceInterval[]> {
    const silenceIntervals: SilenceInterval[] = [];
    let currentInterval: Partial<SilenceInterval> = {};

    return new Promise((resolve, reject) => {
      ffmpeg(filePath)
        .audioFilters(`silencedetect=noise=${threshold}dB:d=${minDuration}`)
        .format('null')
        .output('/dev/null')
        .on('error', reject)
        .on('stderr', stderrLine => {
          const silenceStartMatch = stderrLine.match(/silence_start: ([\d\.]+)/);
          const silenceEndMatch = stderrLine.match(/silence_end: ([\d\.]+) \| silence_duration: ([\d\.]+)/);

          if (silenceStartMatch) {
            currentInterval.start = parseFloat(silenceStartMatch[1]);
          } else if (silenceEndMatch) {
            currentInterval.end = parseFloat(silenceEndMatch[1]);
            currentInterval.duration = parseFloat(silenceEndMatch[2]);
            silenceIntervals.push(currentInterval as SilenceInterval);
            currentInterval = {};
          }
        })
        .on('end', () => resolve(silenceIntervals))
        .run();
    });
  }

  async detectNonSilence(filePath: string, threshold = -50, minDuration = 2): Promise<NonSilentInterval[]> {
    const silenceIntervals: SilenceInterval[] = [];
    const nonSilentIntervals: NonSilentInterval[] = [];
    let totalDuration: number | null = null;

    return new Promise((resolve, reject) => {
      ffmpeg(filePath)
        .audioFilters(`silencedetect=noise=${threshold}dB:d=${minDuration}`)
        .format('null')
        .output('/dev/null')
        .on('error', reject)
        .on('stderr', stderrLine => {
          const silenceStartMatch = stderrLine.match(/silence_start: ([\d\.]+)/);
          const silenceEndMatch = stderrLine.match(/silence_end: ([\d\.]+) \| silence_duration: ([\d\.]+)/);
          const durationMatch = stderrLine.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);

          if (silenceStartMatch) {
            silenceIntervals.push({ start: parseFloat(silenceStartMatch[1]), end: 0, duration: 0 });
          } else if (silenceEndMatch) {
            const lastInterval = silenceIntervals[silenceIntervals.length - 1];
            lastInterval.end = parseFloat(silenceEndMatch[1]);
            lastInterval.duration = parseFloat(silenceEndMatch[2]);
          } else if (durationMatch) {
            const [_, hours, minutes, seconds] = durationMatch;
            totalDuration = parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds);
          }
        })
        .on('end', () => {
          if (totalDuration === null) {
            reject(new Error('Could not determine audio duration'));
            return;
          }

          let lastEnd = 0;
          for (const silence of silenceIntervals) {
            if (silence.start > lastEnd) {
              nonSilentIntervals.push({
                start: lastEnd,
                end: silence.start,
                duration: silence.start - lastEnd
              });
            }
            lastEnd = silence.end;
          }

          if (lastEnd < totalDuration) {
            nonSilentIntervals.push({
              start: lastEnd,
              end: totalDuration,
              duration: totalDuration - lastEnd
            });
          }

          resolve(nonSilentIntervals);
        })
        .run();
    });
  }

  async getAverageSilenceThreshold(filePath: string): Promise<number> {
    try {
      const { stdout } = await execPromise(`ffprobe -v error -of json -show_format -show_streams "${filePath}"`);
      const data = JSON.parse(stdout);
      const audioStream = data.streams.find((stream: any) => stream.codec_type === 'audio');
      if (!audioStream) throw new Error('No audio stream found');

      const rmsLevel = parseFloat(audioStream.rms_level) || -60;
      const silenceThreshold = rmsLevel + 10;

      return silenceThreshold;
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  async getAverageSilenceDuration(filePath: string): Promise<number> {
    const averageSilenceThreshold = await this.getAverageSilenceThreshold(filePath);
    const silenceSegments = await this.detectSilence(filePath, averageSilenceThreshold + 25, 1);
    
    if (silenceSegments.length === 0) {
      return 0;
    }

    const totalSilenceDuration = silenceSegments.reduce((sum, segment) => sum + (segment.end - segment.start), 0);
    return totalSilenceDuration / silenceSegments.length;
  }

  extractNonSilentChunks(silenceSegments: SilenceInterval[], totalDuration: number): AudioChunk[] {
    const nonSilentChunks: AudioChunk[] = [];
    let lastEnd = 0;

    silenceSegments.forEach((silence, index) => {
      if (silence.start > lastEnd) {
        nonSilentChunks.push({ start: lastEnd, end: silence.start });
      }
      lastEnd = silence.end;
      if (index === silenceSegments.length - 1 && lastEnd < totalDuration) {
        nonSilentChunks.push({ start: lastEnd, end: totalDuration });
      }
    });

    return nonSilentChunks;
  }

  async saveNonSilentChunks(filePath: string, chunks: AudioChunk[]): Promise<string[]> {
    const outputDir = path.join(__dirname, 'storage', 'chunks');
    await fs.promises.mkdir(outputDir, { recursive: true });

    const saveChunk = async (chunk: AudioChunk, index: number): Promise<string> => {
      const outputPath = path.join(outputDir, `chunk_${index}.wav`);
      return new Promise((resolve, reject) => {
        ffmpeg(filePath)
          .setStartTime(chunk.start)
          .setDuration(chunk.end - chunk.start)
          .output(outputPath)
          .on('end', () => resolve(outputPath))
          .on('error', reject)
          .run();
      });
    };

    const savedFiles = await Promise.all(chunks.map(saveChunk));
    return savedFiles;
  }

  async processAndSaveNonSilentChunks(filePath: string): Promise<string[]> {
    const metadata = await this.getMetadata(filePath);
    const silenceIntervals = await this.detectSilence(filePath);
    const nonSilentChunks = this.extractNonSilentChunks(silenceIntervals, metadata.duration);
    return this.saveNonSilentChunks(filePath, nonSilentChunks);
  }

  async convertWavToOgg(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .format('ogg')
        .output(outputPath)
        .on('end', () => {
          console.log(`Conversion complete: ${outputPath}`);
          resolve();
        })
        .on('error', error => {
          console.error('Error during conversion:', error);
          reject(error);
        })
        .run();
    });
  }

  async split(filePath: string, silenceThresholdOffset = 25): Promise<string[]> {
    const minSilenceDuration = (await this.getAverageSilenceDuration(filePath)) * 0.9;
    const averageSilenceThreshold = await this.getAverageSilenceThreshold(filePath);
    let nonSilentChunks = await this.detectNonSilence(filePath, averageSilenceThreshold + silenceThresholdOffset, minSilenceDuration);
    nonSilentChunks = nonSilentChunks.filter(chunk => chunk.duration >= 1);
    
    const chunks = await this.saveNonSilentChunks(filePath, nonSilentChunks);
    const oggChunks: string[] = [];

    for (const chunk of chunks) {
      const oggChunk = chunk.replace(/\.[^/.]+$/, '.ogg');
      if (path.extname(chunk).toLowerCase() !== '.ogg') {
        await this.convertToOgg(chunk, oggChunk);
        await fs.promises.unlink(chunk);
      } else {
        await fs.promises.copyFile(chunk, oggChunk);
      }
      
      const stats = await fs.promises.stat(oggChunk);
      if (stats.size > 20 * 1024 * 1024) {
        await fs.promises.unlink(oggChunk);
        throw new Error(`File ${oggChunk} is too big (${stats.size} bytes)`);
      }
      
      oggChunks.push(oggChunk);
    }

    return oggChunks;
  }

  async convertToOgg(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .audioCodec('libvorbis')
        .toFormat('ogg')
        .on('error', (err) => reject(err))
        .on('end', () => resolve())
        .save(outputPath);
    });
  }
}
