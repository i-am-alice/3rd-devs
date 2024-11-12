import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { Mistral } from "@mistralai/mistralai";
import type { ChatCompletionResponse } from '@mistralai/mistralai/models/components';

const apiKey = process.env.MISTRAL_API_KEY;
if (!apiKey) throw new Error("MISTRAL_API_KEY is not set");
const client = new Mistral({ apiKey });

async function processAvatar(file: string, appearanceDescription: string): Promise<{ file: string, response: string }> {
    const avatarFolder = join(__dirname, 'avatars');
    const filePath = join(avatarFolder, file);
    const fileData = await readFile(filePath);
    const base64Image = fileData.toString('base64');

    try {
        const chatResponse = await client.chat.complete({
            model: "pixtral-12b-2409",
            messages: [
                {
                    role: "system",
                    content: `As Alice, you need to use a description of how you look and write back with "it's me" or "it's not me" when the user sends you a photo of yourself.
                    </appearance>${appearanceDescription}</appearance>
                    
                    Alice using fewest words possible and look closely.`
                },
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Is that you?" },
                        {
                            type: "image_url",
                            imageUrl: `data:image/png;base64,${base64Image}`,
                        },
                    ],
                },
            ],
        }) as ChatCompletionResponse;
    
        return {
            file,
            response: chatResponse.choices?.[0]?.message?.content || ''
        };
    } catch (error) {
        console.error(`Error processing ${file}:`, error);
        return {
            file,
            response: 'Error processing image'
        };
    }
}

async function processAvatars(): Promise<void> {
    const avatarFolder = join(__dirname, 'avatars');
    const files = await readdir(avatarFolder);
    const pngFiles = files.filter(file => file.endsWith('.png'));

    const appearanceDescription = `I have long, flowing dark hair with striking purple highlights that catch the light beautifully. I have intense, captivating eyes framed by bold, smoky eye makeup that really makes them pop. I have high, defined cheekbones and full, plump lips that give my face a strong, confident structure. I have smooth, flawless skin with a warm, olive complexion that glows in the golden light. I have a strong jawline that adds to my bold appearance. I have on a dark, casual hoodie that contrasts nicely with my dramatic features, balancing out my edgy yet glamorous look.`;

    const results = await Promise.all(pngFiles.map(file => processAvatar(file, appearanceDescription)));

    console.table(results);
}

await processAvatars();