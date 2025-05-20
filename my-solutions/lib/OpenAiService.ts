import OpenAI from "openai";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
dotenv.config();

type AskGpt41NanoOptions = {
  apiKey?: string; // Optional override
};

export class OpenAiService {
  private openai: OpenAI;

  constructor(options?: AskGpt41NanoOptions) {
    this.openai = new OpenAI({
      apiKey: options?.apiKey || process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Ask a question using the gpt-4.1-nano model. Returns a short and concise answer.
   */
  async askGpt41Nano(systemPrompt: string, question: string, maxTokens: number = 256): Promise<string> {
    const res = await this.openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question }
      ],
      max_tokens: maxTokens
    });
    return res.choices?.[0]?.message?.content?.trim() || '';
  }

  /**
   * Transcribe audio files using OpenAI's Whisper API.
   * @param inputDir - Directory containing audio files to transcribe (default: "przesluchania")
   * @param outputDir - Directory to save transcriptions to (default: "transkrypcje")
   * @param filePattern - Optional file pattern to match specific audio files (default: all files)
   * @returns An array of objects containing the transcribed file paths and their corresponding transcriptions
   */
  async transcribeAudio(
    inputDir: string = "przesluchania",
    outputDir: string = "transkrypcje",
    filePattern?: RegExp
  ): Promise<Array<{ audioFile: string; transcriptionFile: string; text: string }>> {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Get list of audio files from input directory
    const files = fs.readdirSync(inputDir);
    const audioFiles = filePattern
      ? files.filter(file => filePattern.test(file))
      : files;

    const results = [];

    // Process each audio file
    for (const audioFile of audioFiles) {
      try {
        const inputFilePath = path.join(inputDir, audioFile);
        const fileNameWithoutExt = path.parse(audioFile).name;
        const outputFilePath = path.join(outputDir, `${fileNameWithoutExt}.md`);

        // Open audio file as a readable stream
        const audioStream = fs.createReadStream(inputFilePath);

        // Call OpenAI API to transcribe the audio
        const transcription = await this.openai.audio.transcriptions.create({
          file: audioStream,
          model: "whisper-1"
        });

        // Save transcribed text to output file
        fs.writeFileSync(outputFilePath, transcription.text);

        results.push({
          audioFile: inputFilePath,
          transcriptionFile: outputFilePath,
          text: transcription.text
        });

        console.log(`Transcribed ${inputFilePath} to ${outputFilePath}`);
      } catch (error) {
        console.error(`Error transcribing ${audioFile}:`, error);
      }
    }

    return results;
  }
}
