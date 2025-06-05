import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import { decodeDirectionsPrompt } from './prompts';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function decodeInstructions(instruction: string): Promise<string[]> {
  try {
    const prompt = decodeDirectionsPrompt();

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: instruction },
      ],
      temperature: 0.1,
    });

    // Extract the directions from the response
    const directions = response.choices[0].message.content?.trim() || '';
    
    // Split by commas to get individual movements
    return directions.split(',');
  } catch (error) {
    console.error('Error decoding instructions:', error);
    throw error;
  }
}
