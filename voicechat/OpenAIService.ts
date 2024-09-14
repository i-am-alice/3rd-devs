import OpenAI, { toFile } from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { createByModelName } from '@microsoft/tiktokenizer';
import fs from 'fs';
import { Readable } from 'stream';

export class OpenAIService {
  private openai: OpenAI;
  private tokenizers: Map<string, Awaited<ReturnType<typeof createByModelName>>> = new Map();
  private readonly IM_START = "<|im_start|>";
  private readonly IM_END = "<|im_end|>";
  private readonly IM_SEP = "<|im_sep|>";

  constructor() {
    this.openai = new OpenAI();
  }

  private async getTokenizer(modelName: string) {
    if (!this.tokenizers.has(modelName)) {
      const specialTokens: ReadonlyMap<string, number> = new Map([
        [this.IM_START, 100264],
        [this.IM_END, 100265],
        [this.IM_SEP, 100266],
      ]);
      const tokenizer = await createByModelName(modelName, specialTokens);
      this.tokenizers.set(modelName, tokenizer);
    }
    return this.tokenizers.get(modelName)!;
  }

  async countTokens(messages: ChatCompletionMessageParam[], model: string = 'gpt-4o'): Promise<number> {
    const tokenizer = await this.getTokenizer(model);

    let formattedContent = '';
    messages.forEach((message) => {
      formattedContent += `${this.IM_START}${message.role}${this.IM_SEP}${message.content || ''}${this.IM_END}`;
    });
    formattedContent += `${this.IM_START}assistant${this.IM_SEP}`;

    const tokens = tokenizer.encode(formattedContent, [this.IM_START, this.IM_END, this.IM_SEP]);
    return tokens.length;
  }

  async completion(config: {
    messages: ChatCompletionMessageParam[],
    model?: string,
    stream?: boolean,
    jsonMode?: boolean,
    maxTokens?: number
  }): Promise<OpenAI.Chat.Completions.ChatCompletion | AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>> {
    const { messages, model = "gpt-4", stream = false, jsonMode = false, maxTokens = 1024 } = config;
    try {
      const chatCompletion = await this.openai.chat.completions.create({
        messages,
        model,
        stream,
        max_tokens: maxTokens,
        response_format: jsonMode ? { type: "json_object" } : { type: "text" }
      });
      
      if (stream) {
        return chatCompletion as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;
      } else {
        return chatCompletion as OpenAI.Chat.Completions.ChatCompletion;
      }
    } catch (error) {
      console.error("Error in OpenAI completion:", error);
      throw error;
    }
  }

  async transcribe(audioFile: Buffer): Promise<string> {
    try {
      console.log('Audio file size:', audioFile.length);
      const file = await toFile(audioFile, 'audio.webm', { type: 'audio/webm' });
      console.log('File created:', file.name, file.type, file.size);
      const transcription = await this.openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        language: 'pl',
        prompt: 'eduweb.pl Tech•sistence ',
      });
      return transcription.text;
    } catch (error: any) {
      console.error("Error in transcription:", error.message);
      throw new Error(`Transcription failed: ${error.message}`);
    }
  }

  async textToSpeech(text: string): Promise<Buffer> {
    try {
      const response = await this.openai.audio.speech.create({
        model: 'tts-1',
        voice: 'alloy',
        input: text,
      });
      const buffer = Buffer.from(await response.arrayBuffer());
      return buffer;
    } catch (error) {
      console.error("Error in text-to-speech:", error);
      throw error;
    }
  }

  async transcribeAudio(audioBuffer: Buffer): Promise<string> {
    try {
      console.log('Transcribing audio, buffer length:', audioBuffer.length);
      console.log('Buffer type:', typeof audioBuffer);
      console.log('Is Buffer?', Buffer.isBuffer(audioBuffer));
      const file = await toFile(audioBuffer, 'audio.webm', { type: 'audio/webm' });
      console.log('File created:', file.name, file.type, file.size);
      console.log('Is File?', file instanceof File);
      const response = await this.openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
      });
      console.log('Transcription response:', response);
      return response.text;
    } catch (error) {
      console.error('Error in transcribeAudio:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      throw error;
    }
  }
}