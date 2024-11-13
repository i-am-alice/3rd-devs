import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from "path";

const execAsync = promisify(exec);

export async function getAudioDuration(filePath: string): Promise<number> {
  try {
    const cmd = `ffprobe -v error -show_entries format=duration -of csv=p=0 "${filePath}"`;
    const { stdout } = await execAsync(cmd);
    return parseFloat(stdout.trim());
  } catch (error) {
    console.error(`Error getting duration of ${filePath}:`, error);
    return 0;
  }
}

export async function buildFFmpegCommand(audioSegments: AudioSegment[]) {
    const ffmpegInputs = [];
    let filterComplex = '';
    let outputLabels = [];
  
    let inputIndex = 0;
    while (inputIndex < audioSegments.length) {
      const segment = audioSegments[inputIndex];
      ffmpegInputs.push(`-i "${segment.file}"`);
  
      if (segment.type === 'speech') {
        const speechIndex = segment.index;
        const speechLabel = `speech${speechIndex}`;
        const speechDuration = await getAudioDuration(segment.file);
  
        let effectLabels = [];
        inputIndex++;
  
        while (
          inputIndex < audioSegments.length &&
          audioSegments[inputIndex].type === 'effect'
        ) {
          const effectSegment = audioSegments[inputIndex];
          ffmpegInputs.push(`-i "${effectSegment.file}"`);
          const effectLabel = `effect${effectSegment.index}_${inputIndex}`;
          const effectDuration = await getAudioDuration(effectSegment.file);
          const delay = Math.max((speechDuration - effectDuration) * 1000, 0);
          
          filterComplex += `[${inputIndex}:a]volume=0.3,`; // Add volume filter here
          filterComplex += `adelay=${delay}|${delay},`;
          filterComplex += `apad=pad_dur=${speechDuration},`;
          filterComplex += `afade=t=in:st=0:d=0.5,`;
          filterComplex += `afade=t=out:st=${speechDuration - 0.5}:d=0.5,`;
          filterComplex += `atrim=0:${speechDuration}[${effectLabel}];`;
          
          effectLabels.push(`[${effectLabel}]`);
          inputIndex++;
        }
  
        const inputLabels = [`[${inputIndex - effectLabels.length - 1}:a]`].concat(effectLabels);
        const mixLabel = `mixed${speechIndex}`;
        filterComplex += `${inputLabels.join('')}amix=inputs=${inputLabels.length}:duration=longest[${mixLabel}];`;
        outputLabels.push(`[${mixLabel}]`);
      } else {
        inputIndex++;
      }
    }
  
    filterComplex += `${outputLabels.join('')}concat=n=${outputLabels.length}:v=0:a=1[out]`;
  
    return `ffmpeg -y ${ffmpegInputs.join(' ')} -filter_complex "${filterComplex}" -map "[out]" "${join(__dirname, "narration.wav")}"`;
  }

export async function mergeAudio(audioSegments: AudioSegment[]): Promise<void> {
  const ffmpegCommand = await buildFFmpegCommand(audioSegments);
  console.log("Executing FFmpeg command:", ffmpegCommand);

  try {
    const { stdout, stderr } = await execAsync(ffmpegCommand);
    console.log("FFmpeg stdout:", stdout);
    console.log("FFmpeg stderr:", stderr);
    console.log(`Audio saved to ${join(__dirname, "..", "narration.wav")}`);
  } catch (error) {
    console.error("Error merging audio files:", error);
    if (error.stdout) console.error("FFmpeg stdout:", error.stdout);
    if (error.stderr) console.error("FFmpeg stderr:", error.stderr);
  }
}

export interface AudioSegment {
  type: 'speech' | 'effect';
  file: string;
  index: number;
}
