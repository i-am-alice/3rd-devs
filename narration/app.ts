import type { ChatCompletion } from "openai/resources/chat/completions";
import { OpenAIService } from "../audio/OpenAIService";
import { ElevenLabsService } from "./ElevenLabsService";
import { mkdir, rm } from "fs/promises";
import { join } from "path";
import { narrationPrompt } from "./prompts";
import {  mergeAudio, type AudioSegment } from "./utils/audio";

const openai = new OpenAIService();
const elevenlabsService = new ElevenLabsService();

async function generateAudioChunks(segments: string[], context: string) {
  const fragmentsDir = join(__dirname, "fragments");
  await mkdir(fragmentsDir, { recursive: true });

  const generateSegment = async (segment: string, index: number) => {
    if (isEffectSegment(segment)) {
      return processEffects(segment, index, fragmentsDir, context);
    }
    return processSpeech(segment, index, fragmentsDir);
  };

  const audioSegmentsNested = await Promise.all(
    segments.map((segment, index) => generateSegment(segment, index))
  );

  return audioSegmentsNested.flat();
}

function isEffectSegment(segment: string): boolean {
  return segment.startsWith("[") && segment.endsWith("]");
}

async function processEffects(
  segment: string,
  index: number,
  dir: string,
  context: string
) {
  const effects = segment
    .slice(1, -1)
    .split(";")
    .map((effect) => effect.trim());
  console.log("Generating sound effects:", effects);

  const effectPromises = effects.map(async (effect, i) => {
    const filePath = join(dir, `effect_${index}_${i}.wav`);
    await elevenlabsService.generateSoundEffect({
      text: effect,
      outputPath: filePath,
      durationSeconds: 2.5,
      promptInfluence: 1.0,
      context,
    });
    return { type: "effect", file: filePath, index };
  });

  return Promise.all(effectPromises);
}

async function processSpeech(segment: string, index: number, dir: string) {
  console.log("Generating speech:", segment);
  const filePath = join(dir, `speech_${index}.wav`);
  await elevenlabsService.generateSpeech({
    text: segment,
    outputPath: filePath,
  });
  return { type: "speech", file: filePath, index };
}

/*
  Split the narration text into segments based on square brackets
  This regex matches either content within square brackets or content outside brackets
*/
function makeSegmentsFrom(narrationText: string): string[] {
  if (!narrationText) return [];
  const segments =
    narrationText.match(/(\[.*?\]|[^\[\]]+)/g)?.map((s) => s.trim()) || [];
  return segments.filter((segment) => segment.length > 5);
}

async function generateNarration() {
  const narration = (await openai.completion({
    messages: [
      { role: "user", content: narrationPrompt },
      {
        role: "user",
        content: `Make sound for the narration of Harry Potter and Hermiona Granger went to the Tree Broomsticks to spend some time. Here's there narration you should use:
            ''The cobblestone streets of Hogsmeade glistened with fresh snow as Harry and Hermione made their way to The Three Broomsticks, their breaths visible in the crisp winter air. Inside, the warmth of the fireplace and the aroma of spiced mead enveloped them, creating a cozy sanctuary from the cold outside. As they sipped their drinks, the worries of exams and dark wizards momentarily faded, replaced by the simple joy of friendship and the quiet magic of a peaceful afternoon in the wizarding village.'
        
        Make sounds typical to the Harry Potter series music style    `,
      },
    ],
  })) as ChatCompletion;

  return narration.choices?.[0].message.content;
}

async function main() {
  await rm(join(__dirname, "fragments"), { recursive: true, force: true, }).catch(() => {});

  const narration = (await generateNarration()) ?? "No narration generated";
  console.log(`Generated narration:`, narration);
  const segments = makeSegmentsFrom(narration);
  console.log(`Extracted segments:`, segments);
  const chunks = await generateAudioChunks(segments, narration);

  await mergeAudio(chunks as AudioSegment[]);
}

main().catch(console.error);
