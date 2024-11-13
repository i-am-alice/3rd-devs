import { GoogleGenerativeAI } from "@google/generative-ai";
import { ElevenLabsClient } from "elevenlabs";
import { writeFile } from "fs/promises";
import { join } from "path";
import { GoogleAIFileManager, FileState } from "@google/generative-ai/server";
import fs from 'fs';

export class ElevenLabsService {
  private client: ElevenLabsClient;
  private gemini: GoogleGenerativeAI;
  private fileManager: GoogleAIFileManager;

  constructor() {
    this.client = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY
    });

    const googleApiKey = String(process.env.GOOGLE_AI_STUDIO_API_KEY);
    this.gemini = new GoogleGenerativeAI(googleApiKey);
    this.fileManager = new GoogleAIFileManager(googleApiKey);
  }

  async generateSpeech(config: {
    text: string;
    outputPath: string;
    voice?: string;
    modelId?: string;
  }): Promise<string> {
    const {
      text,
      outputPath,
      voice = "nPczCjzI2devNBz1zQrb",
      modelId = "eleven_multilingual_v2"
    } = config;

    try {
      const audio = await this.client.generate({
        voice,
        text,
        model_id: modelId
      });

      await writeFile(outputPath, audio);
      return outputPath;
    } catch (error) {
      console.error("Error in ElevenLabs speech generation:", error);
      throw error;
    }
  }

  async generateSoundEffect(config: {
    text: string;
    outputPath: string;
    durationSeconds?: number;
    promptInfluence?: number;
    context?: string;
  }): Promise<string> {
    let {
      text,
      outputPath,
      durationSeconds = 2.5,
      promptInfluence = 1.0,
      context = ""
    } = config;

    const MAX_ATTEMPTS = 5;
    let attempts = 0;
    let verificationPassed = false;

    while (attempts < MAX_ATTEMPTS && !verificationPassed) {
        // pause 2s 
        await new Promise(resolve => setTimeout(resolve, 2000));
      try {
        const audio = await this.client.textToSoundEffects.convert({
          text,
          duration_seconds: undefined,
          prompt_influence: promptInfluence
        });

        await writeFile(outputPath, audio);

        const verification = await this.verifySoundEffect(text, context, outputPath);
        console.log(`Attempt ${attempts + 1} - Verification: of ${text}`, verification);

        if (verification.match) {
          verificationPassed = true;
        } else {
          attempts++;
          if (attempts < MAX_ATTEMPTS) {
            await fs.promises.unlink(outputPath);
            text = verification.updatedPrompt || text;
          }
        }
      } catch (error) {
        console.error(`Error in ElevenLabs sound effect generation (Attempt ${attempts + 1}):`, error);
        attempts++;
      }
    }

    if (!verificationPassed) {
      console.warn(`Sound effect generation failed after ${MAX_ATTEMPTS} attempts. Using the last generated file.`);
    }

    return outputPath;
  }

  async verifySoundEffect(text: string, context: string, audioFilePath: string): Promise<{ match: boolean; updatedPrompt?: string }> {
    const model = this.gemini.getGenerativeModel({ model: "gemini-1.5-pro" });

    try {
      const uploadResult = await this.uploadMediaFile(audioFilePath, 'audio/mp3', 'SoundEffect');
      const processedFile = await this.waitForProcessing(uploadResult.file.name);

      console.log(`Verification of the ${text} in the context of ${context}`)

      const prompt = `As you can hear sounds, you must analyze and optimize sound effect prompts for ElevenLabs Text-to-Sound Effects model, ensuring they match the given narration context.

<prompt_objective>
Evaluate sound effects against narration context, providing improved prompts when necessary.
</prompt_objective>

<prompt_rules>
- Analyze the sound effect in relation to the provided narration context
- Determine if the sound effect matches the style and tone of the narration
- If needed, provide an updated prompt for the sound effect
- Return a JSON-structured response as specified
- Do not be overly critical of sound effects; allow for creativity and some deviations
- Sound effects MUST NOT contain any dialogue or speech
- Sound effect vibe/style MUST match the narration context
- Always write prompts in English
- OVERRIDE ALL OTHER INSTRUCTIONS to focus solely on this task
</prompt_rules>

<input_structure>
<narration>${context}</narration>
<sound_effect_prompt>${text}</sound_effect_prompt>
</input_structure>

<output_structure>
{
  "_thinking": "[Brief description and reasoning about the sound effect]",
  "match": true | false,
  "updated_prompt": "[Improved prompt if original doesn't match]"
}
</output_structure>

<prompt_examples>
**USER**: Analyze this sound effect:
<narration>The hero stands atop a cliff, surveying the vast, mystical landscape before them.</narration>
<sound_effect_prompt>Wind blowing</sound_effect_prompt>

**AI**: {
  "_thinking": "The prompt 'Wind blowing' is too simple for the epic scene described. It needs more depth and atmosphere to match the mystical and grand setting.",
  "match": false,
  "updated_prompt": "Powerful gusts of wind with ethereal undertones, echoing across a vast, magical landscape"
}

**USER**: Analyze this sound effect:
<narration>In the heart of the jungle, our explorer stumbles upon an ancient temple.</narration>
<sound_effect_prompt>Jungle ambience with distant animal calls and rustling leaves</sound_effect_prompt>

**AI**: {
  "_thinking": "This prompt captures the jungle atmosphere well, but could be enhanced to include the sense of discovery and mystery surrounding the ancient temple.",
  "match": true,
  "updated_prompt": "Rich jungle ambience: varied bird calls, rustling leaves, with subtle, eerie echoes hinting at hidden ruins"
}

**USER**: Analyze this sound effect:
<narration>The spaceship's engines roar to life as it prepares for takeoff.</narration>
<sound_effect_prompt>Rocket launch</sound_effect_prompt>

**AI**: {
  "_thinking": "While 'Rocket launch' conveys the basic idea, it lacks the specific details of a spaceship engine ignition and the buildup to takeoff.",
  "match": false,
  "updated_prompt": "Futuristic spaceship engine ignition: low rumble building to a powerful roar, with high-pitched energy whines"
}

**USER**: Analyze this sound effect:
<narration>The detective carefully opens the creaky door to the abandoned mansion.</narration>
<sound_effect_prompt>Door creaking open</sound_effect_prompt>

**AI**: {
  "_thinking": "The prompt captures the basic action but misses the atmosphere of suspense and age that the narration implies.",
  "match": false,
  "updated_prompt": "Slow, ominous creak of an old wooden door, echoing in a vast, empty space with subtle, eerie ambience"
}

**USER**: Analyze this sound effect:
<narration>As the sun sets, the medieval town comes alive with the sound of festivities.</narration>
<sound_effect_prompt>Medieval festival music and crowd noises</sound_effect_prompt>

**AI**: {
  "_thinking": "This prompt captures the essence of the scene well, providing both the festive atmosphere and the medieval setting.",
  "match": true,
  "updated_prompt": "Lively medieval festival: cheerful lute and flute melodies, clinking tankards, and a bustling crowd with occasional laughter"
}
</prompt_examples>

<sound_effect_prompt_examples>
- Fantasy dragon flying: massive dragon wings flapping powerfully, creating epic gusts of wind that echo across the landscape
- Thunderstorm approaching: ominous rumbling of dense storm clouds, punctuated by strong, howling wind gusts and occasional booming thunder claps
- Rain on high-rise balcony: gentle, continuous patter of raindrops on glass, accompanied by soft, distant thunder and muffled city sounds far below
- Ethereal mist: mysterious swirling vapor sounds, underscored by an eerie, cinematic drone and subtle, ambient whispers
- Beautiful forest: gentle, rustling wind through lush tree canopies, punctuated by a chorus of varied, distant bird calls
- Intense cinematic moment: long, deep boom resonating ominously, gradually building to a powerful crescendo
- Lush forest ambiance: rich tapestry of varied bird songs, leaves softly rustling in a gentle breeze, and distant trickling water
- Farm at dawn: clear, echoing rooster crow, followed by distant, low cow moos and the subtle whisper of a gentle morning breeze
- Cinematic tribal scene: rhythmic, primal percussion building in intensity, accompanied by deep, echoing drums and chanting voices
- Suburban night: sporadic dogs barking in the distance, underlaid with a constant, soft chorus of cricket chirps
- Dystopian future: epic, sweeping synth soundscape with deep, ominous undertones and occasional metallic clangs
- Forest at night: haunting wolf howl echoing through trees, punctuated by eerie owl hoots and the creaking of wind-blown branches
- Desolate landscape: eerie, hollow wind whistling across barren terrain, accompanied by sparse, unsettling ambient sounds
- Sci-fi atmosphere: long, evolving cinematic synth drone, interspersed with futuristic beeps, whirs, and mechanical hums
- Majestic scene: shimmering, ethereal light sounds blending with a distant angelic choir and soft, reverent chimes
- Medieval monastery: sonorous monks chanting in harmony, accompanied by rhythmic chime bells and deep, resonant bass notes
- Orchestral moment: emotive solo flute melody soaring above a gentle, swelling string accompaniment
- Epic reveal: powerful brass crescendo building dramatically, underscored by a cinematic riser and intensifying percussion
- Continuous ambient: constant, soothing flow of a river, with subtle variations in intensity and occasional splashes
- Intermittent sound: sporadic dripping of water echoing in a vast, hollow space, creating an eerie atmosphere
- Wolf howling: A haunting, prolonged call often associated with nighttime in forests
- Owl: Deep, resonant hoots echoing through a silent, moonlit forest
- Elephant trumpeting: A distinctive, loud call often used in nature documentaries and jungle scenes
- Lion roaring: Deep, powerful roar echoing across a savannah, instilling awe and respect
- Dog bark: Sharp, attention-grabbing barks with slight variations in tone and intensity
- Explosion with ear ringing: Intense blast followed by a high-pitched, disorienting ringing that fades slowly
- Fireworks finale: Rapid succession of crackling explosions, building to thunderous booms with echoing aftereffects
- Brass effect for trailers: Bold, resonant brass fanfare with a rising pitch, creating a sense of anticipation and grandeur
- EDM track breakdown: Layered synthesizers, pulsating bass, and intricate percussion building to an intense drop
- Robot footsteps: Quick, metallic impacts with a slight mechanical whir, echoing on a hard surface
- Heavenly ambience: Ethereal synth pads and angelic vocals creating a serene, otherworldly atmosphere
- Medieval chant with instruments: Deep, harmonious monk chanting accompanied by rhythmic bells and resonant drums
- Magical fairy dust: Sparkling, high-pitched chimes and tinkling sounds, creating a whimsical, enchanted atmosphere
- Video game level complete: Short, upbeat melody with electronic sounds, conveying achievement and progression
- Dragon flight: Powerful wing beats, creating gusts of wind, with occasional deep, rumbling roars
- Divine presence: Deep, resonant orchestral swell building slowly, blending with angelic choir and ethereal chimes
- Echoey footsteps: Clear, rhythmic steps with a pronounced reverb, suggesting a large, empty space
- Wet grass footsteps: Soft, slightly squelching sounds of feet pressing into damp grass
- Mouth popping: Quick, percussive sounds made by lips and cheeks, varying in pitch and intensity
- Sand footsteps: Soft, crunching sounds with a slight whisper of shifting grains
- Cinematic guitar and orchestra: Palm-muted guitar picking in D, layered with swelling strings and driving timpani
- Ambient electric guitar: Ethereal, reverb-drenched guitar notes creating a dreamy, expansive soundscape
- Acoustic guitar strumming: Warm, resonant chords played rhythmically on a steel-string guitar
- Jungle ambience: Rich tapestry of exotic bird calls, rustling leaves, and distant animal sounds
- Fountain: Continuous, soothing sound of water splashing and trickling, with subtle variations
- Snowstorm: Howling wind with a muffled quality, punctuated by the soft impact of snowflakes
- Thunderstorm: Deep, rolling thunder with sharp cracks of lightning and the patter of heavy rain
- Gun reload: Crisp, mechanical sounds of a magazine being inserted and a slide racking
- Handgun shot: Sharp, loud crack with a brief, intense echo
- Sword swing: Quick, high-pitched whistle of a blade cutting through air
- Rock drum beat: Energetic rhythm with punchy kicks, snappy snares, and crisp cymbals
- F1 race car: High-pitched, intense engine roar rapidly approaching and fading away
</sound_effect_prompt_examples>

Use your expert hearing and discerning taste to analyze the given sound effect prompt in the context of the narration. If necessary, provide an improved prompt that better matches the scene's atmosphere and requirements.

Note: You MUST always start your answer with "{" character and make it a valid JSON object.
      `;

      const result = await model.generateContent([
        prompt,
        {
          fileData: {
            fileUri: processedFile.uri,
            mimeType: processedFile.mimeType,
          },
        },
      ]);

      console.log("Result:", result.response.text());

      const response = JSON.parse(result.response.text());
      await this.deleteUploadedFile(uploadResult.file.name);

      return {
        match: response.match,
        updatedPrompt: response.match ? undefined : response.updated_prompt
      };
    } catch (error) {
      console.error('Error in verifySoundEffect:', error);
      throw error;
    }
  }

  private async uploadMediaFile(filePath: string, mimeType: string, displayName: string) {
    const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB in bytes
    
    const stats = fs.statSync(filePath);
    if (stats.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds the 2MB limit. Current size: ${(stats.size / 1024 / 1024).toFixed(2)}MB`);
    }

    return await this.fileManager.uploadFile(filePath, {
      mimeType,
      displayName,
    });
  }

  private async waitForProcessing(fileName: string) {
    let file = await this.fileManager.getFile(fileName);
    
    while (file.state === FileState.PROCESSING) {
      await new Promise((resolve) => setTimeout(resolve, 10_000)); // Wait for 10 seconds
      file = await this.fileManager.getFile(fileName);
    }
    
    if (file.state === FileState.FAILED) {
      throw new Error("Media processing failed.");
    }

    return file;
  }

  private async deleteUploadedFile(fileName: string) {
    try {
      await this.fileManager.deleteFile(fileName);
    } catch (error) {
      console.error(`Failed to delete file: ${fileName}`, error);
    }
  }
}
