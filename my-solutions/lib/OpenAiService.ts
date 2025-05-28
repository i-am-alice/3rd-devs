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
  async askGpt41Nano(systemPrompt: string, question: string, maxTokens?: number): Promise<string> {
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

  async askGptO4Mini(systemPrompt: string, question: string, maxTokens: number = 256, imageBuffer?: Buffer, imageFormat: string = 'jpeg'): Promise<string> {
    // Prepare the API request
    const requestBody: any = {
      model: 'gpt-4o-mini',
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt }
      ]
    };

    // Add user message with or without image
    if (imageBuffer) {
      // For multimodal input (text + image)
      requestBody.messages.push({
        role: 'user',
        content: [
          { type: 'text', text: question },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/${imageFormat};base64,${imageBuffer.toString('base64')}`
            }
          }
        ]
      });
    } else {
      // For text-only input
      requestBody.messages.push({
        role: 'user',
        content: question
      });
    }

    // Make the API call with type assertion
    const res = await this.openai.chat.completions.create(requestBody);

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

  /**
   * Generate an image using OpenAI's DALL-E model.
   * @param prompt - The text description to generate an image from
   * @param model - The DALL-E model to use (default: "dall-e-3")
   * @param size - Image size (default: "1024x1024")
   * @param quality - Image quality (default: "standard")
   * @param n - Number of images to generate (default: 1)
   * @returns The URL to the generated image
   */
  async generateImage(
    prompt: string,
    model: string = "dall-e-3",
    size: "1024x1024" | "1792x1024" | "1024x1792" | "1536x1024" | "1024x1536" = "1024x1024",
    quality: "standard" | "hd" = "standard",
    n: number = 1
  ): Promise<string> {
    try {
      const response = await this.openai.images.generate({
        model,
        prompt,
        n,
        size,
        quality,
      });

      // Return the URL of the first generated image
      return response.data?.[0]?.url || "";
    } catch (error) {
      console.error("Error generating image:", error);
      throw error;
    }
  }
}
