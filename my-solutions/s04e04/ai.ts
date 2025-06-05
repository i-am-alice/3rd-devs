import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import { decodeDirectionsPrompt } from './prompts';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function decodeInstructions(instruction: string): Promise<string[]> {
  try {
    console.log(`🤖 AI decoding instruction: "${instruction}"`);
    const prompt = decodeDirectionsPrompt();
    
    console.log(`🗣️ Sending to OpenAI API (gpt-3.5-turbo)...`);
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: instruction },
      ],
      temperature: 0.1,
    });

    console.log(`✨ Received API response`);
    
    // Extract the directions from the response
    const directions = response.choices[0].message.content?.trim() || '';
    
    // Split by commas to get individual movements
    const directionArray = directions.split(',');
    
    console.log(`📌 AI decoded ${directionArray.length} movements: "${directions}"`);
    return directionArray;
  } catch (error) {
    console.error('❌ Error decoding instructions:', error);
    throw error;
  }
}
