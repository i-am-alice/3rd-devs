import OpenAI from "openai";
import dotenv from "dotenv";
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
  async askGpt41Nano(systemPrompt: string, question: string): Promise<string> {
    const res = await this.openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question }
      ],
      max_tokens: 256
    });
    return res.choices?.[0]?.message?.content?.trim() || '';
  }
}
