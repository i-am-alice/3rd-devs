import OpenAI, { toFile } from "openai";
import type { ChatCompletionMessageParam, ChatCompletion, ChatCompletionChunk } from "openai/resources/chat/completions";
import { createByModelName } from '@microsoft/tiktokenizer';
import type { CreateEmbeddingResponse } from 'openai/resources/embeddings';
import FileLike from 'openai';
import { writeFile } from "fs/promises";
import { Readable } from "stream";
import { ElevenLabsClient, stream } from "elevenlabs";
import Groq from "groq-sdk";
import { join } from "path";


export class OpenAIService {
  private openai: OpenAI;
  private tokenizers: Map<string, Awaited<ReturnType<typeof createByModelName>>> = new Map();
  private readonly IM_START = "<|im_start|>";
  private readonly IM_END = "<|im_end|>";
  private readonly IM_SEP = "<|im_sep|>";
  private elevenlabs: ElevenLabsClient;
  private groq: Groq;

  constructor() {
    this.openai = new OpenAI();
    this.elevenlabs = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY
    });
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
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
    temperature?: number,
    jsonMode?: boolean,
    maxTokens?: number
  }): Promise<OpenAI.Chat.Completions.ChatCompletion | AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>> {
    const { messages, model = "o1-mini", stream = false, jsonMode = false, maxTokens = 4096, temperature = 0 } = config;
    try {
      const chatCompletion = await this.openai.chat.completions.create({
        messages,
        model,
      });
      
        return chatCompletion as OpenAI.Chat.Completions.ChatCompletion;
    } catch (error) {
      console.error("Error in OpenAI completion:", error);
      throw error;
    }
  }

  isStreamResponse(response: ChatCompletion | AsyncIterable<ChatCompletionChunk>): response is AsyncIterable<ChatCompletionChunk> {
    return Symbol.asyncIterator in response;
  }

  parseJsonResponse<IResponseFormat>(response: ChatCompletion): IResponseFormat | { error: string, result: boolean } {
    try {
      const content = response.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Invalid response structure');
      }
      const parsedContent = JSON.parse(content);
      return parsedContent;
    } catch (error) {
      console.error('Error parsing JSON response:', error);
      return { error: 'Failed to process response', result: false };
    }
  }

  async createEmbedding(text: string): Promise<number[]> {
    try {
      const response: CreateEmbeddingResponse = await this.openai.embeddings.create({
        model: "text-embedding-3-large",
        input: text,
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error("Error creating embedding:", error);
      throw error;
    }
  }

  async speak(text: string) {
    const response = await this.openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy',
      input: text,
    });
  
    console.log("Response:", response.status);

    const arrayBuffer = await response.arrayBuffer();
    await writeFile(join(__dirname, 'summary.wav'), Buffer.from(arrayBuffer));
    
    return response;
  }

  async transcribe(audioBuffer: Buffer): Promise<string> {
    console.log("Transcribing audio...");
    
    const transcription = await this.openai.audio.transcriptions.create({
      file: await toFile(audioBuffer, 'speech.mp3'),
      language: 'pl',
      model: 'whisper-1',
  });
    return transcription.text;
  }


  async transcribeGroq(audioBuffer: Buffer): Promise<string> {
    const transcription = await this.groq.audio.transcriptions.create({
      file: await toFile(audioBuffer, 'speech.mp3'),
      language: 'pl',
      model: 'whisper-large-v3',
    });
    return transcription.text;
  }

  async speakEleven(
    text: string,
    voice: string = "21m00Tcm4TlvDq8ikWAM",
    modelId: string = "eleven_turbo_v2_5"
  ) {
    try {
      const audio = await this.elevenlabs.generate({
        voice,
        text,
        model_id: modelId,
      });

      await writeFile(join(__dirname, 'summary.wav'), audio);

      return true;
    } catch (error) {
      console.error("Error in ElevenLabs speech generation:", error);
      throw error;
    }
  }
}